import json
import boto3
import os
from decimal import Decimal

# Inicializar cliente DynamoDB
dynamodb = boto3.resource('dynamodb')
cart_table_name = os.environ['CART_TABLE']
cart_table = dynamodb.Table(cart_table_name)

# Función para convertir Decimal a float/int
def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def handler(event, context):
    try:
        # Obtener userId desde Cognito (JWT token)
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
        
        # Obtener todos los items del carrito del usuario
        response = cart_table.query(
            KeyConditionExpression='userId = :userId',
            ExpressionAttributeValues={':userId': user_id}
        )
        
        cart_items = response.get('Items', [])
        
        # Calcular totales
        total_items = len(cart_items)
        total_quantity = sum(int(item.get('quantity', 0)) for item in cart_items)
        total_price = sum(
            float(item.get('productPrice', 0)) * int(item.get('quantity', 0)) 
            for item in cart_items
        )
        
        # Agrupar por categorías para estadísticas
        categories = {}
        for item in cart_items:
            category = item.get('productCategory', 'unknown')
            if category not in categories:
                categories[category] = {
                    'count': 0,
                    'totalQuantity': 0,
                    'totalPrice': 0
                }
            categories[category]['count'] += 1
            categories[category]['totalQuantity'] += int(item.get('quantity', 0))
            categories[category]['totalPrice'] += float(item.get('productPrice', 0)) * int(item.get('quantity', 0))
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            'body': json.dumps({
                'message': 'Cart retrieved successfully',
                'userId': user_id,
                'cart': {
                    'items': cart_items,
                    'summary': {
                        'totalItems': total_items,
                        'totalQuantity': total_quantity,
                        'totalPrice': round(total_price, 2),
                        'isEmpty': total_items == 0
                    },
                    'categoriesBreakdown': categories
                }
            }, default=decimal_default)
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