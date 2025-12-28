import json
import boto3
import os
from decimal import Decimal
from datetime import datetime

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
        print(f"Event received: {json.dumps(event)}")
        
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
                    'error': 'User is not in admin group',
                    'userGroups': user_groups
                })
            }
        
        # Obtener orderId desde path parameters
        order_id = event.get('pathParameters', {}).get('orderId')
        print(f"Order ID: {order_id}")
        
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
        
        # Buscar el pedido (igual que update-product)
        print("Scanning for existing order...")
        existing_order_response = orders_table.scan(
            FilterExpression='orderId = :orderId',
            ExpressionAttributeValues={':orderId': order_id}
        )
        
        existing_orders = existing_order_response.get('Items', [])
        print(f"Found orders: {len(existing_orders)}")
        
        if not existing_orders:
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
        
        order = existing_orders[0]
        print(f"Existing order status: {order.get('status')}")
        
        # Verificar que el pedido esté en estado 'pending'
        if order.get('status') != 'pending':
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': f'Order cannot be cancelled. Current status: {order.get("status")}',
                    'orderId': order_id,
                    'currentStatus': order.get('status')
                })
            }
        
        # Eliminar el pedido (igual que delete-product)
        print("Deleting order...")
        orders_table.delete_item(
            Key={
                'orderId': order_id,
                'createdAt': order.get('createdAt')
            }
        )
        
        print("Order cancelled successfully!")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            'body': json.dumps({
                'message': 'Order cancelled successfully',
                'orderId': order_id,
                'cancelledAt': datetime.utcnow().isoformat(),
                'cancelledBy': admin_email,
                'adminInfo': {
                    'cancelledBy': user_id,
                    'cancelledAt': datetime.utcnow().isoformat(),
                    'action': 'CANCEL_ORDER'
                }
            }, default=decimal_default)
        }
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {str(e)}")
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Invalid JSON in request body',
                'error': str(e)
            })
        }
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Internal server error',
                'error': str(e),
                'type': type(e).__name__
            })
        }