import json
import boto3
import os
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta

# Zona horaria de Bolivia (UTC-4)
BOLIVIA_TZ = timezone(timedelta(hours=-4))

def get_bolivia_now_iso():
    """Obtiene la fecha y hora actual en Bolivia como string ISO"""
    return datetime.now(BOLIVIA_TZ).isoformat()

def get_bolivia_datetime_string():
    """Obtiene fecha y hora en formato legible para Bolivia"""
    return datetime.now(BOLIVIA_TZ).strftime('%d/%m/%Y %H:%M:%S BOT')

# Inicializar clientes DynamoDB
dynamodb = boto3.resource('dynamodb')
orders_table_name = os.environ['ORDERS_TABLE']
sales_table_name = os.environ['SALES_TABLE']
products_table_name = os.environ['PRODUCTS_TABLE']
orders_table = dynamodb.Table(orders_table_name)
sales_table = dynamodb.Table(sales_table_name)
products_table = dynamodb.Table(products_table_name)

# Función para convertir Decimal a float/int
def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def handler(event, context):
    try:
        # Obtener información del usuario desde Cognito (JWT token) - igual que create-order
        user_id = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('sub')
        admin_email = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('email', 'admin@email.com')
        
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
        
        # Obtener orderId desde path parameters
        order_id = event.get('pathParameters', {}).get('orderId')
        
        if not order_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Order ID is required'
                })
            }
        
        # Buscar el pedido usando query (igual que create-order busca productos)
        existing_order_response = orders_table.query(
            KeyConditionExpression='orderId = :orderId',
            ExpressionAttributeValues={':orderId': order_id}
        )
        
        existing_orders = existing_order_response.get('Items', [])
        
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
        
        # Verificar que el pedido esté en estado 'pending'
        if order.get('status') != 'pending':
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': f'Order cannot be completed. Current status: {order.get("status")}'
                })
            }
        
        # Generar datos para la venta con zona horaria Bolivia
        sale_id = f"SALE-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        completed_at = get_bolivia_now_iso()  # ← Usar hora Bolivia
        completed_at_readable = get_bolivia_datetime_string()  # ← Para logs/display
        
        # 1. Crear registro de venta (estructura simple como create-order)
        sale_record = {
            'saleId': sale_id,
            'completedAt': completed_at,
            'originalOrderId': order_id,
            'userId': order.get('userId', ''),
            'customerName': order.get('customerInfo', {}).get('name', 'Cliente'),
            'customerEmail': order.get('customerInfo', {}).get('email', ''),
            'totalAmount': order.get('summary', {}).get('totalAmount', 0),
            'completedBy': admin_email,
            'status': 'completed',
            'items': order.get('items', [])  # Copiar productos del pedido original
        }
        
        sales_table.put_item(Item=sale_record)
        
        # 2. Reducir stock de productos
        print("Reducing product stock...")
        for item in order.get('items', []):
            product_id = item.get('productId')
            quantity_sold = int(item.get('quantity', 0))
            
            if product_id and quantity_sold > 0:
                try:
                    # Buscar el producto
                    product_response = products_table.query(
                        KeyConditionExpression='id = :id',
                        ExpressionAttributeValues={':id': product_id}
                    )
                    
                    products = product_response.get('Items', [])
                    if products:
                        product = products[0]
                        current_stock = int(product.get('stock', 0))
                        new_stock = max(0, current_stock - quantity_sold)  # No permitir stock negativo
                        
                        # Actualizar stock del producto
                        products_table.update_item(
                            Key={
                                'id': product_id,
                                'category': product.get('category')
                            },
                            UpdateExpression='SET stock = :new_stock, updatedAt = :updated_at',
                            ExpressionAttributeValues={
                                ':new_stock': new_stock,
                                ':updated_at': completed_at  # ← Usar hora Bolivia
                            }
                        )
                        print(f"Product {product_id}: stock reduced from {current_stock} to {new_stock} at {completed_at_readable}")
                    else:
                        print(f"Warning: Product {product_id} not found")
                        
                except Exception as e:
                    print(f"Error updating stock for product {product_id}: {str(e)}")
                    # Continuar con otros productos aunque uno falle
        
        # 3. Actualizar estado del pedido (estructura simple como create-order)
        orders_table.update_item(
            Key={
                'orderId': order_id,
                'createdAt': order.get('createdAt')
            },
            UpdateExpression='SET #status = :status, completedAt = :completed_at, saleId = :sale_id, updatedAt = :updated_at',
            ExpressionAttributeNames={
                '#status': 'status'
            },
            ExpressionAttributeValues={
                ':status': 'completed',
                ':completed_at': completed_at,
                ':sale_id': sale_id,
                ':updated_at': completed_at
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
                'message': 'Order completed successfully',
                'orderId': order_id,
                'saleId': sale_id,
                'completedAt': completed_at,
                'completedAtReadable': completed_at_readable,  # ← Hora legible en Bolivia
                'totalAmount': float(order.get('summary', {}).get('totalAmount', 0))
            }, default=decimal_default)
        }
        
    except Exception as e:
        print(f"Error completing order: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Internal server error completing order',
                'error': str(e)
            })
        }