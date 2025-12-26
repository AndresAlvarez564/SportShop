import json
import boto3
import os
from decimal import Decimal
from boto3.dynamodb.conditions import Key

# Inicializar cliente DynamoDB
dynamodb = boto3.resource('dynamodb')
orders_table_name = os.environ['ORDERS_TABLE']
orders_table = dynamodb.Table(orders_table_name)

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
        
        # Obtener parámetros de query (opcional para paginación/filtros)
        query_params = event.get('queryStringParameters') or {}
        limit = int(query_params.get('limit', 10))  # Máximo 10 pedidos por defecto
        status_filter = query_params.get('status')  # Filtrar por estado
        
        # Validar límite
        if limit > 50:
            limit = 50  # Máximo 50 pedidos por request
        
        # Obtener pedidos del usuario usando GSI (Global Secondary Index)
        # Como orderId es partition key y createdAt es sort key, necesitamos scan con filter
        scan_params = {
            'FilterExpression': Key('userId').eq(user_id),
            'Limit': limit
        }
        
        # Agregar filtro por status si se especifica
        if status_filter:
            scan_params['FilterExpression'] = scan_params['FilterExpression'] & Key('status').eq(status_filter)
        
        response = orders_table.scan(**scan_params)
        orders = response.get('Items', [])
        
        # Ordenar por fecha de creación (más reciente primero)
        orders.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        
        # Calcular estadísticas del usuario
        total_orders = len(orders)
        total_spent = sum(float(order.get('summary', {}).get('totalAmount', 0)) for order in orders)
        
        # Agrupar por estado
        status_breakdown = {}
        for order in orders:
            status = order.get('status', 'unknown')
            if status not in status_breakdown:
                status_breakdown[status] = {
                    'count': 0,
                    'totalAmount': 0
                }
            status_breakdown[status]['count'] += 1
            status_breakdown[status]['totalAmount'] += float(order.get('summary', {}).get('totalAmount', 0))
        
        # Preparar respuesta simplificada (sin items detallados para lista)
        orders_summary = []
        for order in orders:
            summary = order.get('summary', {})
            orders_summary.append({
                'orderId': order.get('orderId'),
                'createdAt': order.get('createdAt'),
                'status': order.get('status'),
                'customerName': order.get('customerInfo', {}).get('name', ''),
                'totalAmount': float(summary.get('totalAmount', 0)),
                'totalItems': summary.get('totalItems', 0),
                'totalQuantity': summary.get('totalQuantity', 0)
            })
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            'body': json.dumps({
                'message': 'Orders retrieved successfully',
                'userId': user_id,
                'orders': orders_summary,
                'pagination': {
                    'limit': limit,
                    'returned': len(orders_summary),
                    'hasMore': len(response.get('Items', [])) == limit
                },
                'userStats': {
                    'totalOrders': total_orders,
                    'totalSpent': round(total_spent, 2),
                    'averageOrderValue': round(total_spent / total_orders, 2) if total_orders > 0 else 0
                },
                'statusBreakdown': {
                    status: {
                        'count': data['count'],
                        'totalAmount': round(data['totalAmount'], 2)
                    }
                    for status, data in status_breakdown.items()
                },
                'availableFilters': {
                    'status': ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
                    'limit': 'Max 50 orders per request'
                }
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