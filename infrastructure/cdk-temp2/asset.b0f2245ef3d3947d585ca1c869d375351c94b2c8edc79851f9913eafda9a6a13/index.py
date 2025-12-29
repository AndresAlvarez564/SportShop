import json
import boto3
import os
from decimal import Decimal
from datetime import datetime

# Inicializar clientes DynamoDB
dynamodb = boto3.resource('dynamodb')
cart_table_name = os.environ['CART_TABLE']
products_table_name = os.environ['PRODUCTS_TABLE']
cart_table = dynamodb.Table(cart_table_name)
products_table = dynamodb.Table(products_table_name)

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
        
        # Parsear body de la request
        body = json.loads(event.get('body', '{}'))
        new_quantity = body.get('quantity')
        
        if new_quantity is None:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'New quantity is required',
                    'requiredFields': ['quantity']
                })
            }
        
        # Validar que quantity sea positivo
        if new_quantity <= 0:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Quantity must be greater than 0',
                    'providedQuantity': new_quantity,
                    'suggestion': 'Use DELETE /cart/{productId} to remove item completely'
                })
            }
        
        # Verificar que el item existe en el carrito
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
                        'productId': product_id,
                        'suggestion': 'Use POST /cart to add product first'
                    })
                }
            
            cart_item = existing_item['Item']
            old_quantity = int(cart_item.get('quantity', 0))
            
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
        
        # Verificar stock disponible del producto
        try:
            product_response = products_table.scan(
                FilterExpression='id = :id',
                ExpressionAttributeValues={':id': product_id}
            )
            
            products = product_response.get('Items', [])
            if not products:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'message': 'Product not found in inventory',
                        'productId': product_id
                    })
                }
            
            product = products[0]
            available_stock = int(product.get('stock', 0))
            
            if available_stock < new_quantity:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'message': 'Insufficient stock for requested quantity',
                        'requestedQuantity': new_quantity,
                        'availableStock': available_stock,
                        'currentInCart': old_quantity,
                        'productName': product.get('name')
                    })
                }
            
        except Exception as e:
            print(f"Error checking product stock: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Error checking product availability',
                    'error': str(e)
                })
            }
        
        # Actualizar cantidad en el carrito
        try:
            cart_table.update_item(
                Key={
                    'userId': user_id,
                    'productId': product_id
                },
                UpdateExpression='SET quantity = :qty, updatedAt = :updated',
                ExpressionAttributeValues={
                    ':qty': new_quantity,
                    ':updated': datetime.utcnow().isoformat()
                }
            )
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                },
                'body': json.dumps({
                    'message': 'Cart quantity updated successfully',
                    'productId': product_id,
                    'productName': cart_item.get('productName'),
                    'previousQuantity': old_quantity,
                    'newQuantity': new_quantity,
                    'quantityChange': new_quantity - old_quantity,
                    'unitPrice': float(cart_item.get('productPrice', 0)),
                    'newTotalValue': float(cart_item.get('productPrice', 0)) * new_quantity
                }, default=decimal_default)
            }
            
        except Exception as e:
            print(f"Error updating cart: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Error updating cart',
                    'error': str(e)
                })
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