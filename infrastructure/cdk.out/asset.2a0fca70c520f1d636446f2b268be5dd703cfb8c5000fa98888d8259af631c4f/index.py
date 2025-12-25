import json
import boto3
import os
from boto3.dynamodb.conditions import Key, Attr
from decimal import Decimal

# Inicializar cliente DynamoDB
dynamodb = boto3.resource('dynamodb')
table_name = os.environ['PRODUCTS_TABLE']
table = dynamodb.Table(table_name)

# Función para convertir Decimal a float/int
def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def handler(event, context):
    try:
        # Obtener parámetros de query string
        query_params = event.get('queryStringParameters') or {}
        category = query_params.get('category')
        gender = query_params.get('gender')
        
        # Si no hay filtros, devolver error
        if not category and not gender:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'At least one filter is required',
                    'availableFilters': ['category', 'gender'],
                    'examples': [
                        '?category=camisetas',
                        '?gender=hombre', 
                        '?category=camisetas&gender=mujer'
                    ]
                })
            }
        
        # Construir filtros dinámicamente
        filter_expression = None
        expression_values = {}
        
        if category and gender:
            # Filtro por categoría Y género
            filter_expression = Key('category').eq(category) & Attr('gender').eq(gender)
            # Usar query por category (más eficiente)
            response = table.query(
                KeyConditionExpression=Key('category').eq(category),
                FilterExpression=Attr('gender').eq(gender)
            )
        elif category:
            # Solo filtro por categoría
            response = table.query(
                KeyConditionExpression=Key('category').eq(category)
            )
        elif gender:
            # Solo filtro por género (usar scan)
            response = table.scan(
                FilterExpression=Attr('gender').eq(gender)
            )
        
        products = response.get('Items', [])
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps({
                'message': 'Products filtered successfully',
                'filters': {
                    'category': category,
                    'gender': gender
                },
                'products': products,
                'count': len(products)
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