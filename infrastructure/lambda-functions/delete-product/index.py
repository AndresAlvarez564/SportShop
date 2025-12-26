import json
import boto3
import os
from decimal import Decimal

# Inicializar clientes DynamoDB
dynamodb = boto3.resource('dynamodb')
products_table_name = os.environ['PRODUCTS_TABLE']
cart_table_name = os.environ['CART_TABLE']
products_table = dynamodb.Table(products_table_name)
cart_table = dynamodb.Table(cart_table_name)

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
        
        # Obtener parámetros de query
        query_params = event.get('queryStringParameters') or {}
        force_delete = query_params.get('force', '').lower() == 'true'
        
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
        
        # Verificar si el producto está en carritos de usuarios
        cart_items_response = cart_table.scan(
            FilterExpression='productId = :productId',
            ExpressionAttributeValues={':productId': product_id}
        )
        
        cart_items = cart_items_response.get('Items', [])
        
        if cart_items and not force_delete:
            return {
                'statusCode': 409,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Cannot delete product - it exists in user carts',
                    'productId': product_id,
                    'productName': existing_product.get('name'),
                    'affectedUsers': len(cart_items),
                    'cartItems': [
                        {
                            'userId': item.get('userId'),
                            'quantity': int(item.get('quantity', 0))
                        }
                        for item in cart_items
                    ],
                    'options': [
                        'Use ?force=true to delete anyway (will remove from all carts)',
                        'Update product to inactive instead of deleting',
                        'Wait for users to remove from carts naturally'
                    ]
                })
            }
        
        # Si force_delete=true, eliminar de todos los carritos primero
        if cart_items and force_delete:
            for cart_item in cart_items:
                cart_table.delete_item(
                    Key={
                        'userId': cart_item.get('userId'),
                        'productId': product_id
                    }
                )
        
        # Guardar información del producto antes de eliminarlo
        deleted_product_info = {
            'id': existing_product.get('id'),
            'name': existing_product.get('name'),
            'category': existing_product.get('category'),
            'price': float(existing_product.get('price', 0)),
            'stock': int(existing_product.get('stock', 0)),
            'reviewCount': existing_product.get('reviewCount', 0),
            'averageRating': float(existing_product.get('averageRating', 0))
        }
        
        # Eliminar producto
        products_table.delete_item(
            Key={
                'id': product_id,
                'category': existing_product.get('category')
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
                'message': 'Product deleted successfully',
                'deletedProduct': deleted_product_info,
                'impact': {
                    'removedFromCarts': len(cart_items) if force_delete else 0,
                    'affectedUsers': len(set(item.get('userId') for item in cart_items)) if force_delete else 0,
                    'forceDelete': force_delete
                },
                'adminInfo': {
                    'deletedBy': user_id,
                    'action': 'DELETE_PRODUCT'
                },
                'warning': 'This action cannot be undone. Product and all its reviews are permanently deleted.'
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