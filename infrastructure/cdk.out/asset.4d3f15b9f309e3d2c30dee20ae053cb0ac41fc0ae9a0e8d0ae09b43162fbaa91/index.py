import json
import boto3
import os
from decimal import Decimal
from datetime import datetime

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
        # Obtener userId desde Cognito (JWT token) - IGUAL QUE ADD-TO-CART
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
        
        # Parsear body de la request
        body = json.loads(event.get('body', '{}'))
        
        # Generar ID automáticamente si no se proporciona
        import uuid
        product_id = body.get('id', f"PROD{str(uuid.uuid4())[:8].upper()}")
        
        # Campos requeridos (sin 'id' ya que se genera automáticamente)
        required_fields = ['category', 'name', 'price', 'stock', 'gender']
        missing_fields = [field for field in required_fields if not body.get(field)]
        
        if missing_fields:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Missing required fields',
                    'missingFields': missing_fields,
                    'requiredFields': required_fields,
                    'optionalFields': ['description', 'imageUrl']
                })
            }
        
        # Extraer y validar campos (NO sobrescribir product_id)
        category = body.get('category').strip().lower()
        name = body.get('name').strip()
        price = body.get('price')
        stock = body.get('stock')
        gender = body.get('gender').strip().lower()
        description = body.get('description', '').strip()
        image_url = body.get('imageUrl', '').strip()
        
        # Validaciones
        if not product_id or len(product_id) < 3:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Product ID must be at least 3 characters',
                    'providedId': product_id
                })
            }
        
        if price <= 0:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Price must be greater than 0',
                    'providedPrice': price
                })
            }
        
        if stock < 0:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Stock cannot be negative',
                    'providedStock': stock
                })
            }
        
        if gender not in ['hombre', 'mujer', 'unisex']:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Gender must be: hombre, mujer, or unisex',
                    'providedGender': gender,
                    'validOptions': ['hombre', 'mujer', 'unisex']
                })
            }
        
        # Verificar si el producto ya existe
        existing_product = products_table.scan(
            FilterExpression='id = :id',
            ExpressionAttributeValues={':id': product_id}
        )
        
        if existing_product.get('Items'):
            return {
                'statusCode': 409,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Product already exists',
                    'existingProductId': product_id,
                    'suggestion': 'Use update-product to modify existing products'
                })
            }
        
        # Crear producto
        created_at = datetime.utcnow().isoformat()
        
        new_product = {
            'id': product_id,
            'category': category,
            'name': name,
            'price': Decimal(str(price)),
            'stock': int(stock),
            'gender': gender,
            'description': description,
            'imageUrl': image_url,
            'createdAt': created_at,
            'updatedAt': created_at,
            'createdBy': user_id,
            'reviews': [],
            'averageRating': Decimal('0'),
            'reviewCount': 0,
            'isActive': True
        }
        
        # Guardar producto en DynamoDB
        products_table.put_item(Item=new_product)
        
        return {
            'statusCode': 201,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            'body': json.dumps({
                'message': 'Product created successfully',
                'product': {
                    'id': product_id,
                    'category': category,
                    'name': name,
                    'price': float(price),
                    'stock': int(stock),
                    'gender': gender,
                    'description': description,
                    'imageUrl': image_url,
                    'createdAt': created_at,
                    'isActive': True
                },
                'adminInfo': {
                    'createdBy': user_id,
                    'action': 'CREATE_PRODUCT'
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