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
        
        # Parsear body de la request
        body = json.loads(event.get('body', '{}'))
        product_id = body.get('productId')
        quantity = body.get('quantity', 1)
        
        if not product_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Product ID is required',
                    'requiredFields': ['productId'],
                    'optionalFields': ['quantity (default: 1)']
                })
            }
        
        # Validar que quantity sea positivo
        if quantity <= 0:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Quantity must be greater than 0',
                    'providedQuantity': quantity
                })
            }
        
        # Verificar que el producto existe y tiene stock
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
                    'message': 'Product not found',
                    'productId': product_id
                })
            }
        
        product = products[0]
        available_stock = int(product.get('stock', 0))
        
        if available_stock < quantity:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Insufficient stock',
                    'requestedQuantity': quantity,
                    'availableStock': available_stock,
                    'productName': product.get('name')
                })
            }
        
        # Verificar si el producto ya está en el carrito
        try:
            existing_item = cart_table.get_item(
                Key={
                    'userId': user_id,
                    'productId': product_id
                }
            )
            
            if 'Item' in existing_item:
                # Actualizar cantidad existente
                new_quantity = int(existing_item['Item']['quantity']) + quantity
                
                # Verificar stock para nueva cantidad total
                if available_stock < new_quantity:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({
                            'message': 'Insufficient stock for total quantity',
                            'currentInCart': int(existing_item['Item']['quantity']),
                            'requestedToAdd': quantity,
                            'totalRequested': new_quantity,
                            'availableStock': available_stock
                        })
                    }
                
                # Actualizar item existente
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
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                    },
                    'body': json.dumps({
                        'message': 'Cart updated successfully',
                        'action': 'updated',
                        'productId': product_id,
                        'previousQuantity': int(existing_item['Item']['quantity']),
                        'addedQuantity': quantity,
                        'newQuantity': new_quantity,
                        'productName': product.get('name')
                    }, default=decimal_default)
                }
            
        except Exception as e:
            print(f"Error checking existing cart item: {str(e)}")
        
        # Agregar nuevo item al carrito
        cart_item = {
            'userId': user_id,
            'productId': product_id,
            'quantity': quantity,
            'productName': product.get('name'),
            'productPrice': product.get('price'),
            'productCategory': product.get('category'),
            'addedAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
        
        cart_table.put_item(Item=cart_item)
        
        return {
            'statusCode': 201,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            'body': json.dumps({
                'message': 'Product added to cart successfully',
                'action': 'added',
                'cartItem': cart_item
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