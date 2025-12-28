import json
import boto3
import os
from decimal import Decimal
from datetime import datetime
from botocore.exceptions import ClientError

# Inicializar clientes DynamoDB
dynamodb = boto3.resource('dynamodb')
sales_table_name = os.environ['SALES_TABLE']
products_table_name = os.environ['PRODUCTS_TABLE']
sales_table = dynamodb.Table(sales_table_name)
products_table = dynamodb.Table(products_table_name)

# Función para convertir Decimal a float/int
def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def handler(event, context):
    try:
        # Obtener información del usuario desde Cognito (JWT token)
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_id = claims.get('sub')
        admin_email = claims.get('email', 'unknown')
        
        if not user_id:
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Unauthorized - User authentication required',
                    'error': 'Missing or invalid JWT token'
                })
            }
        
        # Verificar que el usuario esté en el grupo admin
        user_groups = claims.get('cognito:groups', [])
        if isinstance(user_groups, str):
            user_groups = [user_groups]  # Convertir a lista si es string
        
        if 'admin' not in user_groups:
            return {
                'statusCode': 403,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Forbidden - Admin access required',
                    'error': 'User is not in admin group'
                })
            }
        
        # Obtener saleId de los parámetros de la URL
        sale_id = event.get('pathParameters', {}).get('saleId')
        if not sale_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Sale ID is required',
                    'error': 'Missing saleId in path parameters'
                })
            }
        
        # Parsear body con los cambios
        try:
            body = json.loads(event.get('body', '{}'))
        except json.JSONDecodeError:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Invalid JSON in request body'
                })
            }
        
        # Campos permitidos para actualizar
        allowed_updates = {
            'paymentMethod': body.get('paymentMethod'),      # cash, transfer, card
            'deliveryMethod': body.get('deliveryMethod'),    # pickup, delivery
            'adminNotes': body.get('adminNotes'),
            'customerInfo': body.get('customerInfo')         # Actualizar info del cliente
        }
        
        # Filtrar solo los campos que se enviaron
        updates = {k: v for k, v in allowed_updates.items() if v is not None}
        
        if not updates:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'No valid fields to update',
                    'allowedFields': list(allowed_updates.keys())
                })
            }
        
        try:
            # Buscar la venta primero
            sale_response = sales_table.query(
                KeyConditionExpression='saleId = :saleId',
                ExpressionAttributeValues={':saleId': sale_id}
            )
            
            sales = sale_response.get('Items', [])
            if not sales:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'message': 'Sale not found',
                        'saleId': sale_id
                    })
                }
            
            sale = sales[0]
            
            # Verificar que la venta se pueda modificar
            if sale.get('status') == 'cancelled':
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'message': f'Sale cannot be modified. Current status: {sale.get("status")}',
                        'saleId': sale_id,
                        'currentStatus': sale.get('status'),
                        'allowedStatuses': ['completed']
                    })
                }
            
            # Construir expresión de actualización
            update_expression_parts = []
            expression_attribute_names = {}
            expression_attribute_values = {}
            
            for field, value in updates.items():
                if field == 'customerInfo':
                    # Actualizar campos específicos de customerInfo
                    for key, val in value.items():
                        update_expression_parts.append(f'customerInfo.#{key} = :{key}')
                        expression_attribute_names[f'#{key}'] = key
                        expression_attribute_values[f':{key}'] = val
                else:
                    update_expression_parts.append(f'#{field} = :{field}')
                    expression_attribute_names[f'#{field}'] = field
                    expression_attribute_values[f':{field}'] = value
            
            # Agregar información de modificación
            update_expression_parts.append('#lastModifiedAt = :lastModifiedAt')
            update_expression_parts.append('#lastModifiedBy = :lastModifiedBy')
            expression_attribute_names['#lastModifiedAt'] = 'lastModifiedAt'
            expression_attribute_names['#lastModifiedBy'] = 'lastModifiedBy'
            expression_attribute_values[':lastModifiedAt'] = datetime.utcnow().isoformat()
            expression_attribute_values[':lastModifiedBy'] = admin_email
            
            # Ejecutar actualización
            sales_table.update_item(
                Key={
                    'saleId': sale_id,
                    'completedAt': sale['completedAt']
                },
                UpdateExpression='SET ' + ', '.join(update_expression_parts),
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values
            )
            
            # Obtener la venta actualizada
            updated_response = sales_table.query(
                KeyConditionExpression='saleId = :saleId',
                ExpressionAttributeValues={':saleId': sale_id}
            )
            
            updated_sale = updated_response.get('Items', [{}])[0]
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                },
                'body': json.dumps({
                    'message': 'Sale updated successfully',
                    'saleId': sale_id,
                    'updatedFields': list(updates.keys()),
                    'lastModifiedAt': expression_attribute_values[':lastModifiedAt'],
                    'lastModifiedBy': admin_email,
                    'sale': {
                        'saleId': updated_sale.get('saleId'),
                        'status': updated_sale.get('status'),
                        'paymentMethod': updated_sale.get('paymentMethod'),
                        'deliveryMethod': updated_sale.get('deliveryMethod'),
                        'adminNotes': updated_sale.get('adminNotes', ''),
                        'customerInfo': updated_sale.get('customerInfo', {}),
                        'lastModifiedAt': updated_sale.get('lastModifiedAt'),
                        'lastModifiedBy': updated_sale.get('lastModifiedBy'),
                        'totalAmount': float(updated_sale.get('summary', {}).get('totalAmount', 0))
                    }
                }, default=decimal_default)
            }
            
        except Exception as e:
            print(f"Error updating sale: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Error updating sale',
                    'error': str(e),
                    'saleId': sale_id
                })
            }
        
    except Exception as e:
        print(f"Error processing sale update: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Internal server error updating sale',
                'error': str(e)
            })
        }