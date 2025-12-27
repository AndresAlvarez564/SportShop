import json
import boto3
import os
import uuid
from decimal import Decimal
from datetime import datetime

# Inicializar clientes DynamoDB
dynamodb = boto3.resource('dynamodb')
cart_table_name = os.environ['CART_TABLE']
orders_table_name = os.environ['ORDERS_TABLE']
products_table_name = os.environ['PRODUCTS_TABLE']
cart_table = dynamodb.Table(cart_table_name)
orders_table = dynamodb.Table(orders_table_name)
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
        user_email = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('email', 'cliente@email.com')
        
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
        
        # Obtener carrito del usuario
        cart_response = cart_table.query(
            KeyConditionExpression='userId = :userId',
            ExpressionAttributeValues={':userId': user_id}
        )
        
        cart_items = cart_response.get('Items', [])
        
        if not cart_items:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Cannot create order with empty cart',
                    'suggestion': 'Add products to cart first'
                })
            }
        
        # Validar stock disponible para todos los productos (SIN REDUCIR STOCK)
        stock_issues = []
        for item in cart_items:
            product_id = item['productId']
            requested_quantity = int(item['quantity'])
            
            # Buscar producto por ID - Arreglado para usar query correctamente
            try:
                # Primero intentamos obtener todas las categorías para este producto
                product_response = products_table.query(
                    KeyConditionExpression='id = :id',
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
                
                # Tomar el primer producto (debería ser único por ID)
                product = products[0]
                available_stock = int(product.get('stock', 0))
                
                if available_stock < requested_quantity:
                    stock_issues.append({
                        'productId': product_id,
                        'issue': 'Insufficient stock',
                        'productName': item.get('productName', 'Unknown'),
                        'requestedQuantity': requested_quantity,
                        'availableStock': available_stock
                    })
                    
            except Exception as e:
                print(f"Error checking stock for product {product_id}: {str(e)}")
                stock_issues.append({
                    'productId': product_id,
                    'issue': 'Error checking product availability',
                    'productName': item.get('productName', 'Unknown')
                })
        
        if stock_issues:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Cannot create order due to stock issues',
                    'stockIssues': stock_issues,
                    'suggestion': 'Update cart quantities or remove unavailable products'
                })
            }
        
        # Calcular totales del pedido
        order_items = []
        total_amount = Decimal('0')
        total_quantity = 0
        
        for item in cart_items:
            item_total = Decimal(str(item.get('productPrice', 0))) * Decimal(str(item.get('quantity', 0)))
            total_amount += item_total
            total_quantity += int(item.get('quantity', 0))
            
            order_items.append({
                'productId': item['productId'],
                'productName': item.get('productName', ''),
                'productCategory': item.get('productCategory', ''),
                'productImageUrl': item.get('productImageUrl', ''),
                'unitPrice': Decimal(str(item.get('productPrice', 0))),
                'quantity': int(item.get('quantity', 0)),
                'subtotal': item_total
            })
        
        # Generar ID único para el pedido
        order_id = f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        created_at = datetime.utcnow().isoformat()
        
        # Información básica del cliente (desde JWT)
        customer_info = {
            'email': user_email,
            'userId': user_id,
            'orderDate': created_at
        }
        
        # Crear pedido
        order = {
            'orderId': order_id,
            'createdAt': created_at,
            'userId': user_id,
            'status': 'pending',  # pending -> completed (cuando admin entregue)
            'customerInfo': customer_info,
            'items': order_items,
            'summary': {
                'totalItems': len(order_items),
                'totalQuantity': total_quantity,
                'totalAmount': total_amount
            },
            'paymentMethod': 'whatsapp_coordination',
            'deliveryMethod': 'pending',  # Se define cuando admin procese
            'updatedAt': created_at,
            'whatsappSent': False  # Se marca como true cuando se envíe WhatsApp
        }
        
        # Guardar pedido en DynamoDB
        orders_table.put_item(Item=order)
        
        # Limpiar carrito del usuario (pedido creado exitosamente)
        for item in cart_items:
            cart_table.delete_item(
                Key={
                    'userId': user_id,
                    'productId': item['productId']
                }
            )
        
        # IMPORTANTE: NO reducimos stock aquí
        # El stock se reducirá cuando el admin marque el pedido como "completed"
        
        return {
            'statusCode': 201,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            'body': json.dumps({
                'message': 'Order created successfully',
                'order': {
                    'orderId': order_id,
                    'status': 'pending',
                    'totalAmount': float(total_amount),
                    'totalItems': len(order_items),
                    'totalQuantity': total_quantity,
                    'customerEmail': user_email,
                    'createdAt': created_at,
                    'items': [
                        {
                            'productId': item['productId'],
                            'productName': item['productName'],
                            'productCategory': item['productCategory'],
                            'quantity': item['quantity'],
                            'unitPrice': float(item['unitPrice']),
                            'subtotal': float(item['subtotal'])
                        } for item in order_items
                    ]
                },
                'nextSteps': [
                    'Send WhatsApp message with your order details',
                    'Keep your order ID for reference: ' + order_id,
                    'You will be contacted for delivery coordination'
                ]
            }, default=decimal_default)
        }
        
    except Exception as e:
        print(f"Error creating order: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Internal server error creating order',
                'error': str(e)
            })
        }