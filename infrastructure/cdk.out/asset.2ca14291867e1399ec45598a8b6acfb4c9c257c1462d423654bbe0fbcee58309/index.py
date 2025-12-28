import json
import boto3
import os
from decimal import Decimal
from datetime import datetime

# Inicializar clientes DynamoDB
dynamodb = boto3.resource('dynamodb')
sales_table_name = os.environ['SALES_TABLE']
products_table_name = os.environ['PRODUCTS_TABLE']
sales_table = dynamodb.Table(sales_table_name)
products_table = dynamodb.Table(products_table_name)

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
        
        # Obtener saleId desde path parameters
        sale_id = event.get('pathParameters', {}).get('saleId')
        print(f"Sale ID: {sale_id}")
        
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
        
        # Buscar la venta (igual que update-product)
        print("Scanning for existing sale...")
        existing_sale_response = sales_table.scan(
            FilterExpression='saleId = :saleId',
            ExpressionAttributeValues={':saleId': sale_id}
        )
        
        existing_sales = existing_sale_response.get('Items', [])
        print(f"Found sales: {len(existing_sales)}")
        
        if not existing_sales:
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
        
        sale = existing_sales[0]
        print(f"Found sale: {sale.get('saleId')}")
        
        # RESTAURAR STOCK: Procesar cada producto de la venta
        restored_products = []
        if sale.get('items'):
            print(f"Restoring stock for {len(sale['items'])} products...")
            
            for item in sale['items']:
                try:
                    product_id = item.get('productId')
                    quantity_to_restore = int(item.get('quantity', 0))
                    product_name = item.get('productName', 'Unknown')
                    
                    if not product_id or quantity_to_restore <= 0:
                        print(f"Skipping invalid item: {item}")
                        continue
                    
                    print(f"Restoring {quantity_to_restore} units of product {product_id} ({product_name})")
                    
                    # Buscar el producto en la tabla principal
                    product_response = products_table.scan(
                        FilterExpression='productId = :productId',
                        ExpressionAttributeValues={':productId': product_id}
                    )
                    
                    products = product_response.get('Items', [])
                    if not products:
                        print(f"Product {product_id} not found in products table")
                        continue
                    
                    product = products[0]
                    current_stock = int(product.get('stock', 0))
                    new_stock = current_stock + quantity_to_restore
                    
                    print(f"Product {product_id}: {current_stock} → {new_stock} (+{quantity_to_restore})")
                    
                    # Actualizar el stock del producto
                    products_table.update_item(
                        Key={
                            'productId': product_id,
                            'createdAt': product.get('createdAt')
                        },
                        UpdateExpression='SET stock = :new_stock',
                        ExpressionAttributeValues={
                            ':new_stock': new_stock
                        }
                    )
                    
                    restored_products.append({
                        'productId': product_id,
                        'productName': product_name,
                        'quantityRestored': quantity_to_restore,
                        'previousStock': current_stock,
                        'newStock': new_stock
                    })
                    
                    print(f"Successfully restored stock for product {product_id}")
                    
                except Exception as product_error:
                    print(f"Error restoring stock for product {item}: {str(product_error)}")
                    # Continuar con otros productos aunque uno falle
                    continue
        
        # Eliminar la venta (igual que delete-product)
        print("Deleting sale...")
        sales_table.delete_item(
            Key={
                'saleId': sale_id,
                'completedAt': sale.get('completedAt')
            }
        )
        
        print("Sale cancelled successfully!")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            'body': json.dumps({
                'message': 'Sale cancelled successfully and stock restored',
                'saleId': sale_id,
                'cancelledAt': datetime.utcnow().isoformat(),
                'cancelledBy': admin_email,
                'stockRestored': restored_products,
                'totalProductsRestored': len(restored_products),
                'adminInfo': {
                    'cancelledBy': user_id,
                    'cancelledAt': datetime.utcnow().isoformat(),
                    'action': 'CANCEL_SALE_WITH_STOCK_RESTORE'
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