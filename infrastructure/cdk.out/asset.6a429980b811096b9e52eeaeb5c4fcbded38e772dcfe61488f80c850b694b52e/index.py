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
        
        # Obtener parámetros de query
        query_params = event.get('queryStringParameters') or {}
        status_filter = query_params.get('status', 'all')  # all, pending, completed, cancelled
        limit = int(query_params.get('limit', '50'))
        
        try:
            # Scan de todos los pedidos (en producción usar GSI por status)
            scan_params = {
                'Limit': limit
            }
            
            # Filtrar por status si se especifica
            if status_filter != 'all':
                scan_params['FilterExpression'] = '#status = :status'
                scan_params['ExpressionAttributeNames'] = {'#status': 'status'}
                scan_params['ExpressionAttributeValues'] = {':status': status_filter}
            
            response = orders_table.scan(**scan_params)
            orders = response.get('Items', [])
            
            # Ordenar por fecha de creación (más recientes primero)
            orders.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
            
            # Calcular estadísticas
            stats = {
                'totalOrders': len(orders),
                'pendingOrders': len([o for o in orders if o.get('status') == 'pending']),
                'completedOrders': len([o for o in orders if o.get('status') == 'completed']),
                'cancelledOrders': len([o for o in orders if o.get('status') == 'cancelled']),
                'totalRevenue': sum([float(o.get('summary', {}).get('totalAmount', 0)) for o in orders if o.get('status') == 'completed'])
            }
            
            # Formatear respuesta
            formatted_orders = []
            for order in orders:
                formatted_order = {
                    'orderId': order.get('orderId'),
                    'userId': order.get('userId'),
                    'status': order.get('status', 'pending'),
                    'createdAt': order.get('createdAt'),
                    'customerInfo': order.get('customerInfo', {}),
                    'summary': {
                        'totalItems': int(order.get('summary', {}).get('totalItems', 0)),
                        'totalAmount': float(order.get('summary', {}).get('totalAmount', 0))
                    },
                    'itemCount': len(order.get('items', [])),
                    'completedAt': order.get('completedAt'),
                    'completedBy': order.get('completedBy'),
                    'cancelledAt': order.get('cancelledAt'),
                    'cancelledBy': order.get('cancelledBy'),
                    'saleId': order.get('saleId')
                }
                formatted_orders.append(formatted_order)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                },
                'body': json.dumps({
                    'orders': formatted_orders,
                    'statistics': stats,
                    'filters': {
                        'appliedStatus': status_filter,
                        'limit': limit,
                        'hasMore': 'LastEvaluatedKey' in response
                    }
                }, default=decimal_default)
            }
            
        except Exception as e:
            print(f"Error scanning orders: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Error retrieving orders',
                    'error': str(e)
                })
            }
        
    except Exception as e:
        print(f"Error getting all orders: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Internal server error getting orders',
                'error': str(e)
            })
        }