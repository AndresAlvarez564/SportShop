import json
import boto3
import os
from decimal import Decimal
from datetime import datetime

# Inicializar cliente DynamoDB
dynamodb = boto3.resource('dynamodb')
products_table_name = os.environ['PRODUCTS_TABLE']
products_table = dynamodb.Table(products_table_name)

# Función para convertir Decimal a float/int
def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def handler(event, context):
    try:
        # Obtener información del usuario desde Cognito (JWT token)
        user_groups = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('cognito:groups', '')
        user_id = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('sub')
        
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
        
        # Verificar que el usuario es administrador
        if 'admin' not in user_groups.lower():
            return {
                'statusCode': 403,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Forbidden - Admin access required',
                    'error': 'User does not have admin privileges'
                })
            }
        
        # Obtener productId desde path parameters
        product_id = event.get('pathParameters', {}).get('productId')
        
        if not product_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Product ID is required',
                    'error': 'Missing path parameter: productId'
                })
            }
        
        # Verificar que el producto existe
        existing_product_response = products_table.scan(
            FilterExpression='id = :id',
            ExpressionAttributeValues={':id': product_id}
        )
        
        existing_products = existing_product_response.get('Items', [])
        if not existing_products:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Product not found',
                    'productId': product_id
                })
            }
        
        existing_product = existing_products[0]
        
        # Parsear body de la request
        body = json.loads(event.get('body', '{}'))
        
        # Campos que se pueden actualizar
        updatable_fields = ['name', 'price', 'stock', 'gender', 'description', 'imageUrl', 'isActive']
        updates = {}
        
        # Validar y preparar actualizaciones
        for field in updatable_fields:
            if field in body:
                value = body[field]
                
                # Validaciones específicas por campo
                if field == 'price' and value <= 0:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({
                            'message': 'Price must be greater than 0',
                            'providedPrice': value
                        })
                    }
                
                if field == 'stock' and value < 0:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({
                            'message': 'Stock cannot be negative',
                            'providedStock': value
                        })
                    }
                
                if field == 'gender' and value.lower() not in ['hombre', 'mujer', 'unisex']:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({
                            'message': 'Gender must be: hombre, mujer, or unisex',
                            'providedGender': value,
                            'validOptions': ['hombre', 'mujer', 'unisex']
                        })
                    }
                
                # Agregar a actualizaciones
                if field == 'price':
                    updates[field] = Decimal(str(value))
                elif field == 'stock':
                    updates[field] = int(value)
                elif field == 'gender':
                    updates[field] = value.lower()
                elif field in ['name', 'description', 'imageUrl']:
                    updates[field] = str(value).strip()
                else:
                    updates[field] = value
        
        if not updates:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'No valid fields to update',
                    'updatableFields': updatable_fields
                })
            }
        
        # Agregar timestamp de actualización
        updates['updatedAt'] = datetime.utcnow().isoformat()
        updates['updatedBy'] = user_id
        
        # Construir expresión de actualización
        update_expression = 'SET '
        expression_values = {}
        
        for i, (field, value) in enumerate(updates.items()):
            if i > 0:
                update_expression += ', '
            update_expression += f'{field} = :{field}'
            expression_values[f':{field}'] = value
        
        # Actualizar producto
        products_table.update_item(
            Key={
                'id': product_id,
                'category': existing_product.get('category')
            },
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values
        )
        
        # Preparar respuesta con cambios
        changes = {}
        for field, new_value in updates.items():
            if field not in ['updatedAt', 'updatedBy']:
                old_value = existing_product.get(field)
                changes[field] = {
                    'from': float(old_value) if isinstance(old_value, Decimal) else old_value,
                    'to': float(new_value) if isinstance(new_value, Decimal) else new_value
                }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            'body': json.dumps({
                'message': 'Product updated successfully',
                'productId': product_id,
                'productName': existing_product.get('name'),
                'changes': changes,
                'updatedFields': list(changes.keys()),
                'adminInfo': {
                    'updatedBy': user_id,
                    'updatedAt': updates['updatedAt'],
                    'action': 'UPDATE_PRODUCT'
                }
            }, default=decimal_default)
        }
        
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
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Internal server error',
                'error': str(e)
            })
        }