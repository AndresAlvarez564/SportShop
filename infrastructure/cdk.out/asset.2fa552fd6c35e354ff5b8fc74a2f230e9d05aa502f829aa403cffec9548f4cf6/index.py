import json
import boto3
import os
from decimal import Decimal
from datetime import datetime, timedelta
from botocore.exceptions import ClientError

# Inicializar cliente DynamoDB
dynamodb = boto3.resource('dynamodb')
sales_table_name = os.environ['SALES_TABLE']
sales_table = dynamodb.Table(sales_table_name)

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
        
        # Obtener parámetros de query
        query_params = event.get('queryStringParameters') or {}
        limit = int(query_params.get('limit', '50'))
        date_from = query_params.get('dateFrom')  # YYYY-MM-DD
        date_to = query_params.get('dateTo')      # YYYY-MM-DD
        
        try:
            # Scan de todas las ventas
            scan_params = {
                'Limit': limit
            }
            
            # Filtrar por rango de fechas si se especifica
            if date_from or date_to:
                filter_expressions = []
                expression_values = {}
                
                if date_from:
                    filter_expressions.append('completedAt >= :date_from')
                    expression_values[':date_from'] = f"{date_from}T00:00:00"
                
                if date_to:
                    filter_expressions.append('completedAt <= :date_to')
                    expression_values[':date_to'] = f"{date_to}T23:59:59"
                
                if filter_expressions:
                    scan_params['FilterExpression'] = ' AND '.join(filter_expressions)
                    scan_params['ExpressionAttributeValues'] = expression_values
            
            response = sales_table.scan(**scan_params)
            sales = response.get('Items', [])
            
            # Ordenar por fecha de completado (más recientes primero)
            sales.sort(key=lambda x: x.get('completedAt', ''), reverse=True)
            
            # Calcular estadísticas
            total_revenue = sum([float(sale.get('summary', {}).get('totalAmount', 0)) for sale in sales])
            total_items_sold = sum([int(sale.get('summary', {}).get('totalItems', 0)) for sale in sales])
            
            # Estadísticas por método de pago
            payment_stats = {}
            delivery_stats = {}
            
            for sale in sales:
                payment_method = sale.get('paymentMethod', 'unknown')
                delivery_method = sale.get('deliveryMethod', 'unknown')
                amount = float(sale.get('summary', {}).get('totalAmount', 0))
                
                payment_stats[payment_method] = payment_stats.get(payment_method, 0) + amount
                delivery_stats[delivery_method] = delivery_stats.get(delivery_method, 0) + 1
            
            # Top productos vendidos
            product_sales = {}
            for sale in sales:
                for item in sale.get('items', []):
                    product_id = item.get('productId')
                    product_name = item.get('productName', 'Unknown')
                    quantity = int(item.get('quantity', 0))
                    
                    if product_id not in product_sales:
                        product_sales[product_id] = {
                            'productName': product_name,
                            'totalQuantity': 0,
                            'totalRevenue': 0
                        }
                    
                    product_sales[product_id]['totalQuantity'] += quantity
                    product_sales[product_id]['totalRevenue'] += float(item.get('subtotal', 0))
            
            # Top 10 productos más vendidos
            top_products = sorted(
                product_sales.items(),
                key=lambda x: x[1]['totalQuantity'],
                reverse=True
            )[:10]
            
            stats = {
                'totalSales': len(sales),
                'totalRevenue': total_revenue,
                'totalItemsSold': total_items_sold,
                'averageOrderValue': total_revenue / len(sales) if sales else 0,
                'paymentMethodBreakdown': payment_stats,
                'deliveryMethodBreakdown': delivery_stats,
                'topProducts': [
                    {
                        'productId': product_id,
                        'productName': data['productName'],
                        'quantitySold': data['totalQuantity'],
                        'revenue': data['totalRevenue']
                    }
                    for product_id, data in top_products
                ]
            }
            
            # Formatear respuesta
            formatted_sales = []
            for sale in sales:
                formatted_sale = {
                    'saleId': sale.get('saleId'),
                    'originalOrderId': sale.get('originalOrderId'),
                    'completedAt': sale.get('completedAt'),
                    'completedBy': sale.get('completedBy'),
                    'customerInfo': sale.get('customerInfo', {}),
                    'summary': {
                        'totalItems': int(sale.get('summary', {}).get('totalItems', 0)),
                        'totalAmount': float(sale.get('summary', {}).get('totalAmount', 0))
                    },
                    'paymentMethod': sale.get('paymentMethod', 'unknown'),
                    'deliveryMethod': sale.get('deliveryMethod', 'unknown'),
                    'adminNotes': sale.get('adminNotes', ''),
                    'itemCount': len(sale.get('items', [])),
                    'originalOrderDate': sale.get('originalOrderDate')
                }
                formatted_sales.append(formatted_sale)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                },
                'body': json.dumps({
                    'sales': formatted_sales,
                    'statistics': stats,
                    'filters': {
                        'dateFrom': date_from,
                        'dateTo': date_to,
                        'limit': limit,
                        'hasMore': 'LastEvaluatedKey' in response
                    }
                }, default=decimal_default)
            }
            
        except Exception as e:
            print(f"Error scanning sales: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Error retrieving sales',
                    'error': str(e)
                })
            }
        
    except Exception as e:
        print(f"Error getting sales: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Internal server error getting sales',
                'error': str(e)
            })
        }