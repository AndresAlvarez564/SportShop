import json
import boto3
import os
from decimal import Decimal
from botocore.exceptions import ClientError

# Inicializar cliente DynamoDB
dynamodb = boto3.resource('dynamodb')
orders_table_name = os.environ['ORDERS_TABLE']
orders_table = dynamodb.Table(orders_table_name)

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
        
        # Obtener orderId de los parámetros de la URL
        order_id = event.get('pathParameters', {}).get('orderId')
        if not order_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Order ID is required',
                    'error': 'Missing orderId in path parameters'
                })
            }
        
        try:
            # Buscar el pedido específico
            order_response = orders_table.query(
                KeyConditionExpression='orderId = :orderId',
                ExpressionAttributeValues={':orderId': order_id}
            )
            
            orders = order_response.get('Items', [])
            if not orders:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'message': 'Order not found',
                        'orderId': order_id
                    })
                }
            
            order = orders[0]
            
            # Formatear información detallada del pedido
            detailed_order = {
                'orderId': order.get('orderId'),
                'userId': order.get('userId'),
                'status': order.get('status', 'pending'),
                'createdAt': order.get('createdAt'),
                'customerInfo': order.get('customerInfo', {}),
                'items': [],
                'summary': {
                    'subtotal': float(order.get('summary', {}).get('subtotal', 0)),
                    'tax': float(order.get('summary', {}).get('tax', 0)),
                    'shipping': float(order.get('summary', {}).get('shipping', 0)),
                    'totalItems': int(order.get('summary', {}).get('totalItems', 0)),
                    'totalAmount': float(order.get('summary', {}).get('totalAmount', 0))
                },
                'timeline': [],
                'adminActions': {
                    'canComplete': order.get('status') == 'pending',
                    'canCancel': order.get('status') == 'pending',
                    'canModify': order.get('status') == 'pending'
                }
            }
            
            # Formatear items del pedido
            for item in order.get('items', []):
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
                detailed_order['items'].append(formatted_item)
            
            # Crear timeline del pedido
            timeline = [
                {
                    'event': 'Order Created',
                    'timestamp': order.get('createdAt'),
                    'description': f'Order placed by {order.get("customerInfo", {}).get("name", "Customer")}',
                    'status': 'completed'
                }
            ]
            
            if order.get('completedAt'):
                timeline.append({
                    'event': 'Order Completed',
                    'timestamp': order.get('completedAt'),
                    'description': f'Order completed by {order.get("completedBy", "Admin")}',
                    'status': 'completed',
                    'saleId': order.get('saleId')
                })
            
            if order.get('cancelledAt'):
                timeline.append({
                    'event': 'Order Cancelled',
                    'timestamp': order.get('cancelledAt'),
                    'description': f'Order cancelled by {order.get("cancelledBy", "Admin")}',
                    'reason': order.get('cancellationReason', ''),
                    'status': 'cancelled'
                })
            
            detailed_order['timeline'] = sorted(timeline, key=lambda x: x['timestamp'])
            
            # Información adicional para admin
            if order.get('status') == 'completed':
                detailed_order['completionInfo'] = {
                    'completedAt': order.get('completedAt'),
                    'completedBy': order.get('completedBy'),
                    'saleId': order.get('saleId'),
                    'deliveryMethod': order.get('deliveryMethod'),
                    'paymentMethod': order.get('paymentMethod'),
                    'adminNotes': order.get('adminNotes', '')
                }
            
            if order.get('status') == 'cancelled':
                detailed_order['cancellationInfo'] = {
                    'cancelledAt': order.get('cancelledAt'),
                    'cancelledBy': order.get('cancelledBy'),
                    'reason': order.get('cancellationReason', ''),
                    'adminNotes': order.get('adminNotes', '')
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
                    'order': detailed_order
                }, default=decimal_default)
            }
            
        except Exception as e:
            print(f"Error querying order detail: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Error retrieving order detail',
                    'error': str(e)
                })
            }
        
    except Exception as e:
        print(f"Error getting order detail: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Internal server error getting order detail',
                'error': str(e)
            })
        }