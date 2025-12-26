import json
import boto3
import os
import uuid
from decimal import Decimal
from datetime import datetime

# Inicializar clientes DynamoDB
dynamodb = boto3.resource('dynamodb')
products_table_name = os.environ['PRODUCTS_TABLE']
# Nota: Las reseñas se guardarán en la tabla Products como atributo anidado
# En un proyecto más grande, tendrías una tabla Reviews separada
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
        user_email = event.get('requestContext', {}).get('authorizer', {}).get('claims', {}).get('email', '')
        
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
        
        # Obtener productId desde path parameters
        product_id = event.get('pathParameters', {}).get('productId')
        
        if not product_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Product ID is required',
                    'error': 'Missing path parameter: productId'
                })
            }
        
        # Parsear body de la request
        body = json.loads(event.get('body', '{}'))
        rating = body.get('rating')
        comment = body.get('comment', '').strip()
        display_name = body.get('displayName', '').strip()
        
        # Validaciones
        if rating is None:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Rating is required',
                    'requiredFields': ['rating (1-5)'],
                    'optionalFields': ['comment', 'displayName']
                })
            }
        
        # Validar rating (1-5 estrellas)
        if not isinstance(rating, (int, float)) or rating < 1 or rating > 5:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Rating must be between 1 and 5',
                    'providedRating': rating
                })
            }
        
        # Validar longitud del comentario
        if len(comment) > 500:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Comment too long (max 500 characters)',
                    'currentLength': len(comment),
                    'maxLength': 500
                })
            }
        
        # Verificar que el producto existe
        product_response = products_table.scan(
            FilterExpression='id = :id',
            ExpressionAttributeValues={':id': product_id}
        )
        
        products = product_response.get('Items', [])
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
        
        product = products[0]
        
        # Crear reseña
        review_id = f"REV-{uuid.uuid4().hex[:8].upper()}"
        created_at = datetime.utcnow().isoformat()
        
        new_review = {
            'reviewId': review_id,
            'userId': user_id,
            'displayName': display_name or user_email.split('@')[0] or 'Usuario Anónimo',
            'rating': int(rating),
            'comment': comment,
            'createdAt': created_at,
            'verified': True  # Asumimos que solo usuarios autenticados pueden reseñar
        }
        
        # Obtener reseñas existentes del producto
        existing_reviews = product.get('reviews', [])
        
        # Verificar si el usuario ya reseñó este producto
        user_already_reviewed = any(
            review.get('userId') == user_id 
            for review in existing_reviews
        )
        
        if user_already_reviewed:
            return {
                'statusCode': 409,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'You have already reviewed this product',
                    'suggestion': 'You can only review each product once'
                })
            }
        
        # Agregar nueva reseña
        updated_reviews = existing_reviews + [new_review]
        
        # Calcular nuevo rating promedio
        total_ratings = sum(review.get('rating', 0) for review in updated_reviews)
        average_rating = Decimal(str(round(total_ratings / len(updated_reviews), 1)))
        
        # Actualizar producto con nueva reseña
        products_table.update_item(
            Key={
                'id': product_id,
                'category': product.get('category')
            },
            UpdateExpression='SET reviews = :reviews, averageRating = :avg, reviewCount = :count',
            ExpressionAttributeValues={
                ':reviews': updated_reviews,
                ':avg': average_rating,
                ':count': len(updated_reviews)
            }
        )
        
        return {
            'statusCode': 201,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            'body': json.dumps({
                'message': 'Review created successfully',
                'review': {
                    'reviewId': review_id,
                    'productId': product_id,
                    'productName': product.get('name'),
                    'rating': int(rating),
                    'comment': comment,
                    'displayName': new_review['displayName'],
                    'createdAt': created_at
                },
                'productStats': {
                    'newAverageRating': float(average_rating),
                    'totalReviews': len(updated_reviews)
                }
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