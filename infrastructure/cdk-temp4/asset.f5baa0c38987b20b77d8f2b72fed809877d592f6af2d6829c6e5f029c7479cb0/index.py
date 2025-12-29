import json
import boto3
import os
from decimal import Decimal
from datetime import datetime, timedelta
from collections import defaultdict
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
        period = query_params.get('period', 'all')  # all, today, week, month, year
        
        try:
            # Calcular fechas según el período
            now = datetime.utcnow()
            date_filter = None
            
            if period == 'today':
                date_filter = now.strftime('%Y-%m-%d')
            elif period == 'week':
                week_ago = now - timedelta(days=7)
                date_filter = week_ago.isoformat()
            elif period == 'month':
                month_ago = now - timedelta(days=30)
                date_filter = month_ago.isoformat()
            elif period == 'year':
                year_ago = now - timedelta(days=365)
                date_filter = year_ago.isoformat()
            
            # Scan de todas las ventas
            scan_params = {}
            
            if date_filter and period != 'today':
                scan_params['FilterExpression'] = 'completedAt >= :date_filter'
                scan_params['ExpressionAttributeValues'] = {':date_filter': date_filter}
            elif period == 'today':
                scan_params['FilterExpression'] = 'begins_with(completedAt, :date_filter)'
                scan_params['ExpressionAttributeValues'] = {':date_filter': date_filter}
            
            response = sales_table.scan(**scan_params)
            all_sales = response.get('Items', [])
            
            # Filtrar solo ventas completadas (no canceladas)
            completed_sales = [sale for sale in all_sales if sale.get('status', 'completed') == 'completed']
            cancelled_sales = [sale for sale in all_sales if sale.get('status', 'completed') == 'cancelled']
            
            # === ESTADÍSTICAS GENERALES ===
            total_sales = len(completed_sales)
            total_cancelled = len(cancelled_sales)
            total_revenue = sum([float(sale.get('summary', {}).get('totalAmount', 0)) for sale in completed_sales])
            total_items_sold = sum([int(sale.get('summary', {}).get('totalItems', 0)) for sale in completed_sales])
            average_order_value = total_revenue / total_sales if total_sales > 0 else 0
            
            # === ESTADÍSTICAS POR MÉTODO DE PAGO ===
            payment_stats = defaultdict(lambda: {'count': 0, 'revenue': 0})
            for sale in completed_sales:
                method = sale.get('paymentMethod', 'unknown')
                amount = float(sale.get('summary', {}).get('totalAmount', 0))
                payment_stats[method]['count'] += 1
                payment_stats[method]['revenue'] += amount
            
            # === ESTADÍSTICAS POR MÉTODO DE ENTREGA ===
            delivery_stats = defaultdict(lambda: {'count': 0, 'revenue': 0})
            for sale in completed_sales:
                method = sale.get('deliveryMethod', 'unknown')
                amount = float(sale.get('summary', {}).get('totalAmount', 0))
                delivery_stats[method]['count'] += 1
                delivery_stats[method]['revenue'] += amount
            
            # === TOP PRODUCTOS VENDIDOS ===
            product_stats = defaultdict(lambda: {
                'productName': 'Unknown',
                'totalQuantity': 0,
                'totalRevenue': 0,
                'salesCount': 0
            })
            
            for sale in completed_sales:
                for item in sale.get('items', []):
                    product_id = item.get('productId')
                    product_name = item.get('productName', 'Unknown')
                    quantity = int(item.get('quantity', 0))
                    revenue = float(item.get('subtotal', 0))
                    
                    product_stats[product_id]['productName'] = product_name
                    product_stats[product_id]['totalQuantity'] += quantity
                    product_stats[product_id]['totalRevenue'] += revenue
                    product_stats[product_id]['salesCount'] += 1
            
            # Top 10 productos más vendidos por cantidad
            top_products_by_quantity = sorted(
                product_stats.items(),
                key=lambda x: x[1]['totalQuantity'],
                reverse=True
            )[:10]
            
            # Top 10 productos más vendidos por revenue
            top_products_by_revenue = sorted(
                product_stats.items(),
                key=lambda x: x[1]['totalRevenue'],
                reverse=True
            )[:10]
            
            # === ESTADÍSTICAS POR CATEGORÍA ===
            category_stats = defaultdict(lambda: {
                'totalQuantity': 0,
                'totalRevenue': 0,
                'salesCount': 0
            })
            
            for sale in completed_sales:
                for item in sale.get('items', []):
                    category = item.get('category', 'unknown')
                    quantity = int(item.get('quantity', 0))
                    revenue = float(item.get('subtotal', 0))
                    
                    category_stats[category]['totalQuantity'] += quantity
                    category_stats[category]['totalRevenue'] += revenue
                    category_stats[category]['salesCount'] += 1
            
            # === ESTADÍSTICAS POR GÉNERO ===
            gender_stats = defaultdict(lambda: {
                'totalQuantity': 0,
                'totalRevenue': 0,
                'salesCount': 0
            })
            
            for sale in completed_sales:
                for item in sale.get('items', []):
                    gender = item.get('gender', 'unknown')
                    quantity = int(item.get('quantity', 0))
                    revenue = float(item.get('subtotal', 0))
                    
                    gender_stats[gender]['totalQuantity'] += quantity
                    gender_stats[gender]['totalRevenue'] += revenue
                    gender_stats[gender]['salesCount'] += 1
            
            # === VENTAS POR DÍA (últimos 30 días) ===
            daily_sales = defaultdict(lambda: {'count': 0, 'revenue': 0})
            for sale in completed_sales:
                completed_date = sale.get('completedAt', '')[:10]  # YYYY-MM-DD
                amount = float(sale.get('summary', {}).get('totalAmount', 0))
                daily_sales[completed_date]['count'] += 1
                daily_sales[completed_date]['revenue'] += amount
            
            # Formatear estadísticas
            statistics = {
                'period': period,
                'generatedAt': datetime.utcnow().isoformat(),
                'overview': {
                    'totalSales': total_sales,
                    'totalCancelled': total_cancelled,
                    'totalRevenue': total_revenue,
                    'totalItemsSold': total_items_sold,
                    'averageOrderValue': average_order_value,
                    'cancellationRate': (total_cancelled / (total_sales + total_cancelled)) * 100 if (total_sales + total_cancelled) > 0 else 0
                },
                'paymentMethods': dict(payment_stats),
                'deliveryMethods': dict(delivery_stats),
                'topProductsByQuantity': [
                    {
                        'productId': product_id,
                        'productName': data['productName'],
                        'quantitySold': data['totalQuantity'],
                        'revenue': data['totalRevenue'],
                        'salesCount': data['salesCount']
                    }
                    for product_id, data in top_products_by_quantity
                ],
                'topProductsByRevenue': [
                    {
                        'productId': product_id,
                        'productName': data['productName'],
                        'quantitySold': data['totalQuantity'],
                        'revenue': data['totalRevenue'],
                        'salesCount': data['salesCount']
                    }
                    for product_id, data in top_products_by_revenue
                ],
                'categoryBreakdown': dict(category_stats),
                'genderBreakdown': dict(gender_stats),
                'dailySales': dict(daily_sales)
            }
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                },
                'body': json.dumps({
                    'statistics': statistics
                }, default=decimal_default)
            }
            
        except Exception as e:
            print(f"Error generating sales statistics: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Error generating sales statistics',
                    'error': str(e)
                })
            }
        
    except Exception as e:
        print(f"Error getting sales statistics: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Internal server error getting sales statistics',
                'error': str(e)
            })
        }