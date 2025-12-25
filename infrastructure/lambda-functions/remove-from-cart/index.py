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
        
        # Verificar si el item existe en el carrito
        try:
            existing_item = cart_table.get_item(
                Key={
                    'userId': user_id,
                    'productId': product_id
                }
            )
            
            if 'Item' not in existing_item:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'message': 'Product not found in cart',
                        'userId': user_id,
                        'productId': product_id
                    })
                }
            
            # Guardar información del item antes de eliminarlo
            removed_item = existing_item['Item']
            
            # Eliminar item del carrito
            cart_table.delete_item(
                Key={
                    'userId': user_id,
                    'productId': product_id
                }
            )
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                },
                'body': json.dumps({
                    'message': 'Product removed from cart successfully',
                    'removedItem': {
                        'productId': product_id,
                        'productName': removed_item.get('productName'),
                        'quantity': int(removed_item.get('quantity', 0)),
                        'productPrice': float(removed_item.get('productPrice', 0)),
                        'totalValue': float(removed_item.get('productPrice', 0)) * int(removed_item.get('quantity', 0))
                    }
                }, default=decimal_default)
            }
            
        except Exception as e:
            print(f"Error accessing cart item: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Error accessing cart',
                    'error': str(e)
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