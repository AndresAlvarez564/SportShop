import json
import boto3
import os
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
        # Obtener ID del producto desde path parameters
        product_id = event.get('pathParameters', {}).get('id')
        
        if not product_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Product ID is required',
                    'error': 'Missing path parameter: id'
                })
            }
        
        # Buscar producto por ID (necesitamos category también para composite key)
        # Por ahora usamos scan con filter, después optimizaremos
        response = table.scan(
            FilterExpression='id = :id',
            ExpressionAttributeValues={':id': product_id}
        )
        
        products = response.get('Items', [])
        
        if not products:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Product not found',
                    'productId': product_id
                })
            }
        
        # Retornar el primer producto encontrado
        product = products[0]
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps({
                'message': 'Product retrieved successfully',
                'product': product,
                'schema': {
                    'fields': ['id', 'category', 'name', 'price', 'stock', 'gender', 'description', 'imageUrl'],
                    'required': ['id', 'category', 'name', 'price', 'stock', 'gender']
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