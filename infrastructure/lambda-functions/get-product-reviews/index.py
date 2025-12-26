import json
import boto3
import os
from decimal import Decimal

# Inicializar cliente DynamoDB
dynamodb = boto3.resource('dynamodb')
products_table_name = os.environ['PRODUCTS_TABLE']
products_table = dynamodb.Table(products_table_name)

# Función para convertir Decimal a float/int
def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def handler(event, context):
    try:
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
        
        # Obtener parámetros de query (opcional para filtros)
        query_params = event.get('queryStringParameters') or {}
        limit = int(query_params.get('limit', 20))  # Máximo 20 reseñas por defecto
        rating_filter = query_params.get('rating')  # Filtrar por rating específico
        sort_by = query_params.get('sortBy', 'newest')  # newest, oldest, highest, lowest
        
        # Validar límite
        if limit > 100:
            limit = 100  # Máximo 100 reseñas por request
        
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
        all_reviews = product.get('reviews', [])
        
        # Aplicar filtro por rating si se especifica
        filtered_reviews = all_reviews
        if rating_filter:
            try:
                rating_filter = int(rating_filter)
                filtered_reviews = [
                    review for review in all_reviews 
                    if review.get('rating') == rating_filter
                ]
            except ValueError:
                pass  # Ignorar filtro inválido
        
        # Ordenar reseñas
        if sort_by == 'oldest':
            filtered_reviews.sort(key=lambda x: x.get('createdAt', ''))
        elif sort_by == 'highest':
            filtered_reviews.sort(key=lambda x: x.get('rating', 0), reverse=True)
        elif sort_by == 'lowest':
            filtered_reviews.sort(key=lambda x: x.get('rating', 0))
        else:  # newest (default)
            filtered_reviews.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        
        # Aplicar límite
        paginated_reviews = filtered_reviews[:limit]
        
        # Calcular estadísticas de reseñas
        if all_reviews:
            total_reviews = len(all_reviews)
            average_rating = sum(review.get('rating', 0) for review in all_reviews) / total_reviews
            
            # Distribución por estrellas
            rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            for review in all_reviews:
                rating = review.get('rating', 0)
                if rating in rating_distribution:
                    rating_distribution[rating] += 1
            
            # Calcular porcentajes
            rating_percentages = {
                rating: round((count / total_reviews) * 100, 1)
                for rating, count in rating_distribution.items()
            }
        else:
            total_reviews = 0
            average_rating = 0
            rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            rating_percentages = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        
        # Preparar reseñas para respuesta (ocultar userId por privacidad)
        public_reviews = []
        for review in paginated_reviews:
            public_reviews.append({
                'reviewId': review.get('reviewId'),
                'displayName': review.get('displayName'),
                'rating': review.get('rating'),
                'comment': review.get('comment'),
                'createdAt': review.get('createdAt'),
                'verified': review.get('verified', False)
            })
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps({
                'message': 'Product reviews retrieved successfully',
                'productId': product_id,
                'productName': product.get('name'),
                'reviews': public_reviews,
                'pagination': {
                    'limit': limit,
                    'returned': len(public_reviews),
                    'totalAvailable': len(filtered_reviews),
                    'hasMore': len(filtered_reviews) > limit
                },
                'reviewStats': {
                    'totalReviews': total_reviews,
                    'averageRating': round(average_rating, 1),
                    'ratingDistribution': rating_distribution,
                    'ratingPercentages': rating_percentages
                },
                'filters': {
                    'appliedRating': rating_filter,
                    'sortBy': sort_by,
                    'availableRatings': [1, 2, 3, 4, 5],
                    'availableSorts': ['newest', 'oldest', 'highest', 'lowest']
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