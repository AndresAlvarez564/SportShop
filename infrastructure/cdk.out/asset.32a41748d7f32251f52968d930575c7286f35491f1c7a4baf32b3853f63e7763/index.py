import json
import boto3
import os
import uuid
from decimal import Decimal
from datetime import datetime
from botocore.exceptions import ClientError

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
                    'error': 'User is not in admin group'
                })
            }
        
        # Obtener orderId de los parámetros de la URL
        order_id = event.get('pathParameters', {}).get('orderId')
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
        
        # Parsear body para información adicional (opcional)
        body = json.loads(event.get('body', '{}'))
        delivery_method = body.get('deliveryMethod', 'pickup')  # pickup, delivery
        payment_method = body.get('paymentMethod', 'cash')     # cash, transfer
        admin_notes = body.get('adminNotes', '')
        
        # Buscar el pedido en la tabla orders
        try:
            order_response = orders_table.scan(
                FilterExpression='orderId = :orderId',
                ExpressionAttributeValues={':orderId': order_id}
            )
            
            orders = order_response.get('Items', [])
            if not orders:
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
            
            order = orders[0]
            
            # Verificar que el pedido esté en estado 'pending'
            if order.get('status') != 'pending':
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'message': f'Order cannot be completed. Current status: {order.get("status")}',
                        'orderId': order_id,
                        'currentStatus': order.get('status')
                    })
                }
            
        except Exception as e:
            print(f"Error querying order: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Error retrieving order',
                    'error': str(e)
                })
            }
        
        # Validar stock disponible y preparar actualizaciones
        stock_updates = []
        stock_issues = []
        
        for item in order.get('items', []):
            product_id = item['productId']
            quantity_sold = int(item['quantity'])
            
            try:
                # Obtener producto actual
                product_response = products_table.scan(
                    FilterExpression='id = :id',
                    ExpressionAttributeValues={':id': product_id}
                )
                
                products = product_response.get('Items', [])
                if not products:
                    stock_issues.append({
                        'productId': product_id,
                        'issue': 'Product no longer exists',
                        'productName': item.get('productName', 'Unknown')
                    })
                    continue
                
                product = products[0]
                current_stock = int(product.get('stock', 0))
                
                if current_stock < quantity_sold:
                    stock_issues.append({
                        'productId': product_id,
                        'issue': 'Insufficient stock',
                        'productName': item.get('productName', 'Unknown'),
                        'requestedQuantity': quantity_sold,
                        'availableStock': current_stock
                    })
                    continue
                
                # Preparar actualización de stock
                new_stock = current_stock - quantity_sold
                new_sales_count = int(product.get('salesCount', 0)) + quantity_sold
                
                stock_updates.append({
                    'product': product,
                    'new_stock': new_stock,
                    'new_sales_count': new_sales_count,
                    'quantity_sold': quantity_sold
                })
                
            except Exception as e:
                print(f"Error checking stock for product {product_id}: {str(e)}")
                stock_issues.append({
                    'productId': product_id,
                    'issue': 'Error checking product stock',
                    'productName': item.get('productName', 'Unknown')
                })
        
        # Si hay problemas de stock, no proceder
        if stock_issues:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Cannot complete order due to stock issues',
                    'stockIssues': stock_issues,
                    'orderId': order_id
                })
            }
        
        # Generar ID único para la venta
        sale_id = f"SALE-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        completed_at = datetime.utcnow().isoformat()
        
        # Crear registro de venta (estructura simplificada)
        sale_record = {
            'saleId': sale_id,
            'completedAt': completed_at,
            'originalOrderId': order_id,
            'userId': order.get('userId', ''),
            'customerEmail': order.get('customerInfo', {}).get('email', ''),
            'customerName': order.get('customerInfo', {}).get('name', 'Cliente'),
            'items': order.get('items', []),
            'totalAmount': order.get('summary', {}).get('totalAmount', 0),
            'totalItems': order.get('summary', {}).get('totalItems', 0),
            'completedBy': admin_email,
            'deliveryMethod': delivery_method,
            'paymentMethod': payment_method,
            'adminNotes': admin_notes,
            'originalOrderDate': order.get('createdAt', ''),
            'saleDate': completed_at  # Agregar campo saleDate para compatibilidad
        }
        
        # TRANSACCIÓN: Actualizar todo o nada
        try:
            print(f"Starting transaction for order {order_id}")
            
            # 1. Crear registro de venta
            print(f"Creating sale record: {sale_id}")
            sales_table.put_item(Item=sale_record)
            print("Sale record created successfully")
            
            # 2. Actualizar stock de todos los productos
            print(f"Updating stock for {len(stock_updates)} products")
            for i, update in enumerate(stock_updates):
                product = update['product']
                print(f"Updating product {i+1}/{len(stock_updates)}: {product['id']}")
                
                products_table.update_item(
                    Key={
                        'id': product['id'],
                        'category': product['category']
                    },
                    UpdateExpression='SET stock = :new_stock, salesCount = :new_sales_count, lastSold = :last_sold',
                    ExpressionAttributeValues={
                        ':new_stock': update['new_stock'],
                        ':new_sales_count': update['new_sales_count'],
                        ':last_sold': completed_at
                    }
                )
                print(f"Product {product['id']} updated successfully")
            
            # 3. Actualizar estado del pedido a 'completed'
            print(f"Updating order status to completed")
            orders_table.update_item(
                Key={
                    'orderId': order_id,
                    'createdAt': order['createdAt']
                },
                UpdateExpression='SET #status = :status, completedAt = :completed_at, completedBy = :completed_by, saleId = :sale_id',
                ExpressionAttributeNames={
                    '#status': 'status'
                },
                ExpressionAttributeValues={
                    ':status': 'completed',
                    ':completed_at': completed_at,
                    ':completed_by': admin_email,
                    ':sale_id': sale_id
                }
            )
            print("Order status updated successfully")
            
            # Preparar resumen de la operación
            stock_summary = []
            for update in stock_updates:
                stock_summary.append({
                    'productId': update['product']['id'],
                    'productName': update['product'].get('name', 'Unknown'),
                    'quantitySold': update['quantity_sold'],
                    'previousStock': update['product'].get('stock', 0),
                    'newStock': update['new_stock']
                })
            
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
                    'sale': {
                        'saleId': sale_id,
                        'originalOrderId': order_id,
                        'completedAt': completed_at,
                        'completedBy': admin_email,
                        'deliveryMethod': delivery_method,
                        'paymentMethod': payment_method,
                        'totalAmount': float(order.get('summary', {}).get('totalAmount', 0)),
                        'totalItems': len(order.get('items', []))
                    },
                    'stockUpdates': stock_summary,
                    'nextSteps': [
                        f'Sale record created with ID: {sale_id}',
                        'Product inventory has been updated',
                        'Order marked as completed'
                    ]
                }, default=decimal_default)
            }
            
        except Exception as e:
            print(f"Error in transaction: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Error completing order transaction',
                    'error': str(e),
                    'orderId': order_id
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