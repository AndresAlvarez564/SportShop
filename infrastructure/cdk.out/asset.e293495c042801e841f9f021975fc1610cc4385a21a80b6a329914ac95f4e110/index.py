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
        
        # Parsear body de la request (información de contacto/envío)
        body = json.loads(event.get('body', '{}'))
        customer_info = {
            'name': body.get('customerName', ''),
            'email': body.get('customerEmail', ''),
            'phone': body.get('customerPhone', ''),
            'address': body.get('shippingAddress', ''),
            'notes': body.get('orderNotes', '')
        }
        
        # Validar información mínima requerida
        if not customer_info['name'] or not customer_info['phone']:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Customer name and phone are required',
                    'requiredFields': ['customerName', 'customerPhone'],
                    'optionalFields': ['customerEmail', 'shippingAddress', 'orderNotes']
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
        
        # Validar stock disponible para todos los productos
        stock_issues = []
        for item in cart_items:
            product_id = item['productId']
            requested_quantity = int(item['quantity'])
            
            # Verificar stock actual
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
            available_stock = int(product.get('stock', 0))
            
            if available_stock < requested_quantity:
                stock_issues.append({
                    'productId': product_id,
                    'issue': 'Insufficient stock',
                    'productName': item.get('productName', 'Unknown'),
                    'requestedQuantity': requested_quantity,
                    'availableStock': available_stock
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
        total_amount = 0
        total_quantity = 0
        
        for item in cart_items:
            item_total = float(item.get('productPrice', 0)) * int(item.get('quantity', 0))
            total_amount += item_total
            total_quantity += int(item.get('quantity', 0))
            
            order_items.append({
                'productId': item['productId'],
                'productName': item.get('productName', ''),
                'productCategory': item.get('productCategory', ''),
                'unitPrice': float(item.get('productPrice', 0)),
                'quantity': int(item.get('quantity', 0)),
                'subtotal': item_total
            })
        
        # Generar ID único para el pedido
        order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
        created_at = datetime.utcnow().isoformat()
        
        # Crear pedido
        order = {
            'orderId': order_id,
            'createdAt': created_at,
            'userId': user_id,
            'status': 'pending',
            'customerInfo': customer_info,
            'items': order_items,
            'summary': {
                'totalItems': len(order_items),
                'totalQuantity': total_quantity,
                'totalAmount': round(total_amount, 2)
            },
            'paymentMethod': 'whatsapp_coordination',  # Según tu modelo de negocio
            'updatedAt': created_at
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
        
        # TODO: Aquí podrías agregar lógica para:
        # - Reducir stock de productos
        # - Enviar notificación por email/WhatsApp
        # - Integrar con sistema de pagos
        
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
                    'totalAmount': round(total_amount, 2),
                    'totalItems': len(order_items),
                    'customerName': customer_info['name'],
                    'createdAt': created_at
                },
                'nextSteps': [
                    'You will be contacted via WhatsApp for payment coordination',
                    'Keep your order ID for reference: ' + order_id
                ]
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