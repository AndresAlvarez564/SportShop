import json
import boto3
import os
from decimal import Decimal

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
        user_id = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('sub')
        
        if not user_id:
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Unauthorized - User authentication required'
                })
            }
        
        # Verificar que el usuario esté en el grupo admin
        user_groups = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('cognito:groups', [])
        if isinstance(user_groups, str):
            user_groups = [user_groups]
        
        if 'admin' not in user_groups:
            return {
                'statusCode': 403,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Forbidden - Admin access required'
                })
            }
        
        # Obtener todos los pedidos (igual que get-products)
        response = orders_table.scan()
        orders = response.get('Items', [])
        
        # Ordenar por fecha de creación (más recientes primero)
        orders.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            'body': json.dumps({
                'message': 'Orders retrieved successfully',
                'orders': orders,
                'count': len(orders)
            }, default=decimal_default)
        }
        
    except Exception as e:
        print(f"Error getting orders: {str(e)}")
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