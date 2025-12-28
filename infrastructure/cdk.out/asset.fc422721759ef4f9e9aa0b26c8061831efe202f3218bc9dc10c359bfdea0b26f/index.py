import json
import boto3
import os
from decimal import Decimal
from datetime import datetime
from botocore.exceptions import ClientError

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
        
        # Obtener saleId de los parámetros de la URL
        sale_id = event.get('pathParameters', {}).get('saleId')
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
        
        # Parsear body para información adicional
        body = json.loads(event.get('body', '{}'))
        cancellation_reason = body.get('reason', 'Sale cancelled by admin')
        admin_notes = body.get('adminNotes', '')
        restore_stock = body.get('restoreStock', True)  # Por defecto restaurar stock
        
        try:
            # Buscar la venta
            sale_response = sales_table.query(
                KeyConditionExpression='saleId = :saleId',
                ExpressionAttributeValues={':saleId': sale_id}
            )
            
            sales = sale_response.get('Items', [])
            if not sales:
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
            
            sale = sales[0]
            
            # Verificar que la venta se pueda cancelar
            current_status = sale.get('status', 'completed')
            if current_status == 'cancelled':
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'message': f'Sale is already cancelled',
                        'saleId': sale_id,
                        'currentStatus': current_status
                    })
                }
            
            cancelled_at = datetime.utcnow().isoformat()
            stock_updates = []
            
            # Si se debe restaurar el stock
            if restore_stock:
                for item in sale.get('items', []):
                    product_id = item.get('productId')
                    quantity_to_restore = int(item.get('quantity', 0))
                    
                    try:
                        # Obtener producto actual
                        product_response = products_table.query(
                            KeyConditionExpression='id = :id',
                            ExpressionAttributeValues={':id': product_id}
                        )
                        
                        products = product_response.get('Items', [])
                        if products:
                            product = products[0]
                            current_stock = int(product.get('stock', 0))
                            current_sales_count = int(product.get('salesCount', 0))
                            
                            # Restaurar stock y reducir contador de ventas
                            new_stock = current_stock + quantity_to_restore
                            new_sales_count = max(0, current_sales_count - quantity_to_restore)
                            
                            # Actualizar producto
                            products_table.update_item(
                                Key={
                                    'id': product['id'],
                                    'category': product['category']
                                },
                                UpdateExpression='SET stock = :new_stock, salesCount = :new_sales_count, lastRestocked = :last_restocked',
                                ExpressionAttributeValues={
                                    ':new_stock': new_stock,
                                    ':new_sales_count': new_sales_count,
                                    ':last_restocked': cancelled_at
                                }
                            )
                            
                            stock_updates.append({
                                'productId': product_id,
                                'productName': item.get('productName', 'Unknown'),
                                'quantityRestored': quantity_to_restore,
                                'previousStock': current_stock,
                                'newStock': new_stock,
                                'previousSalesCount': current_sales_count,
                                'newSalesCount': new_sales_count
                            })
                        else:
                            print(f"Product {product_id} not found for stock restoration")
                            
                    except Exception as e:
                        print(f"Error restoring stock for product {product_id}: {str(e)}")
            
            # Actualizar la venta a estado 'cancelled'
            sales_table.update_item(
                Key={
                    'saleId': sale_id,
                    'completedAt': sale['completedAt']
                },
                UpdateExpression='SET #status = :status, cancelledAt = :cancelled_at, cancelledBy = :cancelled_by, cancellationReason = :reason, adminNotes = :notes, stockRestored = :stock_restored',
                ExpressionAttributeNames={
                    '#status': 'status'
                },
                ExpressionAttributeValues={
                    ':status': 'cancelled',
                    ':cancelled_at': cancelled_at,
                    ':cancelled_by': admin_email,
                    ':reason': cancellation_reason,
                    ':notes': admin_notes,
                    ':stock_restored': restore_stock
                }
            )
            
            # Preparar resumen de la cancelación
            cancellation_summary = {
                'saleId': sale_id,
                'previousStatus': current_status,
                'newStatus': 'cancelled',
                'cancelledAt': cancelled_at,
                'cancelledBy': admin_email,
                'reason': cancellation_reason,
                'adminNotes': admin_notes,
                'stockRestored': restore_stock,
                'stockUpdates': stock_updates,
                'totalAmount': float(sale.get('summary', {}).get('totalAmount', 0)),
                'totalItems': int(sale.get('summary', {}).get('totalItems', 0)),
                'customerEmail': sale.get('customerInfo', {}).get('email', 'unknown'),
                'originalOrderId': sale.get('originalOrderId')
            }
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                },
                'body': json.dumps({
                    'message': 'Sale cancelled successfully',
                    'cancellation': cancellation_summary,
                    'impact': {
                        'stockRestored': restore_stock,
                        'productsAffected': len(stock_updates),
                        'auditTrail': 'Sale marked as cancelled and preserved for audit purposes'
                    }
                }, default=decimal_default)
            }
            
        except Exception as e:
            print(f"Error cancelling sale: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Error cancelling sale',
                    'error': str(e),
                    'saleId': sale_id
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
        print(f"Error processing sale cancellation: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Internal server error cancelling sale',
                'error': str(e)
            })
        }