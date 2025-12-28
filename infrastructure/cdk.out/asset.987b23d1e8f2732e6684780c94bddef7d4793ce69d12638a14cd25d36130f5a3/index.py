import json
import boto3
import os
from decimal import Decimal
from botocore.exceptions import ClientError

# Inicializar cliente DynamoDB
dynamodb = boto3.resource('dynamodb')
sales_table_name = os.environ['SALES_TABLE']
sales_table = dynamodb.Table(sales_table_name)

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
        
        try:
            # Buscar la venta específica
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
            
            # Formatear información detallada de la venta
            detailed_sale = {
                'saleId': sale.get('saleId'),
                'originalOrderId': sale.get('originalOrderId'),
                'status': sale.get('status', 'completed'),  # completed, cancelled
                'completedAt': sale.get('completedAt'),
                'completedBy': sale.get('completedBy'),
                'customerInfo': sale.get('customerInfo', {}),
                'items': [],
                'summary': {
                    'subtotal': float(sale.get('summary', {}).get('subtotal', 0)),
                    'tax': float(sale.get('summary', {}).get('tax', 0)),
                    'shipping': float(sale.get('summary', {}).get('shipping', 0)),
                    'totalItems': int(sale.get('summary', {}).get('totalItems', 0)),
                    'totalAmount': float(sale.get('summary', {}).get('totalAmount', 0))
                },
                'paymentMethod': sale.get('paymentMethod', 'unknown'),
                'deliveryMethod': sale.get('deliveryMethod', 'unknown'),
                'adminNotes': sale.get('adminNotes', ''),
                'originalOrderDate': sale.get('originalOrderDate'),
                'processingTime': sale.get('processingTime'),
                'timeline': [],
                'adminActions': {
                    'canUpdate': sale.get('status', 'completed') == 'completed',
                    'canCancel': sale.get('status', 'completed') == 'completed'
                }
            }
            
            # Formatear items de la venta
            for item in sale.get('items', []):
                formatted_item = {
                    'productId': item.get('productId'),
                    'productName': item.get('productName', 'Unknown Product'),
                    'productImageUrl': item.get('productImageUrl', ''),
                    'category': item.get('category', ''),
                    'gender': item.get('gender', ''),
                    'size': item.get('size', ''),
                    'color': item.get('color', ''),
                    'quantity': int(item.get('quantity', 0)),
                    'unitPrice': float(item.get('unitPrice', 0)),
                    'subtotal': float(item.get('subtotal', 0))
                }
                detailed_sale['items'].append(formatted_item)
            
            # Crear timeline de la venta
            timeline = [
                {
                    'event': 'Order Created',
                    'timestamp': sale.get('originalOrderDate'),
                    'description': f'Original order placed by {sale.get("customerInfo", {}).get("name", "Customer")}',
                    'status': 'completed'
                },
                {
                    'event': 'Sale Completed',
                    'timestamp': sale.get('completedAt'),
                    'description': f'Sale completed by {sale.get("completedBy", "Admin")}',
                    'status': 'completed'
                }
            ]
            
            # Si la venta fue cancelada
            if sale.get('cancelledAt'):
                timeline.append({
                    'event': 'Sale Cancelled',
                    'timestamp': sale.get('cancelledAt'),
                    'description': f'Sale cancelled by {sale.get("cancelledBy", "Admin")}',
                    'reason': sale.get('cancellationReason', ''),
                    'status': 'cancelled'
                })
            
            # Si la venta fue modificada
            if sale.get('lastModifiedAt'):
                timeline.append({
                    'event': 'Sale Modified',
                    'timestamp': sale.get('lastModifiedAt'),
                    'description': f'Sale modified by {sale.get("lastModifiedBy", "Admin")}',
                    'status': 'modified'
                })
            
            detailed_sale['timeline'] = sorted(timeline, key=lambda x: x['timestamp'])
            
            # Información adicional para admin
            if sale.get('status') == 'cancelled':
                detailed_sale['cancellationInfo'] = {
                    'cancelledAt': sale.get('cancelledAt'),
                    'cancelledBy': sale.get('cancelledBy'),
                    'reason': sale.get('cancellationReason', ''),
                    'stockRestored': sale.get('stockRestored', False)
                }
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                },
                'body': json.dumps({
                    'sale': detailed_sale
                }, default=decimal_default)
            }
            
        except Exception as e:
            print(f"Error querying sale detail: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Error retrieving sale detail',
                    'error': str(e)
                })
            }
        
    except Exception as e:
        print(f"Error getting sale detail: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Internal server error getting sale detail',
                'error': str(e)
            })
        }