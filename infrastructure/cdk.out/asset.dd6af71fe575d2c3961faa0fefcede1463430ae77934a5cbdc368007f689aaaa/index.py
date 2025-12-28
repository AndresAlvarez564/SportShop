import json
import boto3
import os
from datetime import datetime
from botocore.exceptions import ClientError

# Inicializar cliente DynamoDB
dynamodb = boto3.resource('dynamodb')
orders_table_name = os.environ['ORDERS_TABLE']
orders_table = dynamodb.Table(orders_table_name)

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
        cancellation_reason = body.get('reason', 'Cancelled by admin')
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
            current_status = order.get('status', 'unknown')
            if current_status != 'pending':
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'message': f'Order cannot be cancelled. Current status: {current_status}',
                        'orderId': order_id,
                        'currentStatus': current_status,
                        'allowedStatuses': ['pending']
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
        
        # Actualizar el pedido a estado 'cancelled' (no lo eliminamos para auditoría)
        cancelled_at = datetime.utcnow().isoformat()
        
        try:
            orders_table.update_item(
                Key={
                    'orderId': order_id,
                    'createdAt': order['createdAt']
                },
                UpdateExpression='SET #status = :status, cancelledAt = :cancelled_at, cancelledBy = :cancelled_by, cancellationReason = :reason, adminNotes = :notes',
                ExpressionAttributeNames={
                    '#status': 'status'
                },
                ExpressionAttributeValues={
                    ':status': 'cancelled',
                    ':cancelled_at': cancelled_at,
                    ':cancelled_by': admin_email,
                    ':reason': cancellation_reason,
                    ':notes': admin_notes
                }
            )
            
            # Preparar resumen de productos que estaban en el pedido
            order_summary = []
            total_amount = 0
            total_items = 0
            
            for item in order.get('items', []):
                order_summary.append({
                    'productId': item.get('productId'),
                    'productName': item.get('productName', 'Unknown'),
                    'quantity': item.get('quantity', 0),
                    'unitPrice': float(item.get('unitPrice', 0)),
                    'subtotal': float(item.get('subtotal', 0))
                })
                total_amount += float(item.get('subtotal', 0))
                total_items += int(item.get('quantity', 0))
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                },
                'body': json.dumps({
                    'message': 'Order cancelled successfully',
                    'cancellation': {
                        'orderId': order_id,
                        'previousStatus': 'pending',
                        'newStatus': 'cancelled',
                        'cancelledAt': cancelled_at,
                        'cancelledBy': admin_email,
                        'reason': cancellation_reason,
                        'adminNotes': admin_notes
                    },
                    'orderSummary': {
                        'totalAmount': total_amount,
                        'totalItems': total_items,
                        'products': order_summary,
                        'customerEmail': order.get('customerInfo', {}).get('email', 'unknown'),
                        'originalOrderDate': order.get('createdAt')
                    },
                    'impact': {
                        'stockAffected': False,
                        'inventoryNote': 'No inventory changes made - stock remains unchanged',
                        'auditTrail': 'Order marked as cancelled but preserved for audit purposes'
                    }
                })
            }
            
        except Exception as e:
            print(f"Error cancelling order: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Error cancelling order',
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
        print(f"Error processing cancellation: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Internal server error processing cancellation',
                'error': str(e)
            })
        }