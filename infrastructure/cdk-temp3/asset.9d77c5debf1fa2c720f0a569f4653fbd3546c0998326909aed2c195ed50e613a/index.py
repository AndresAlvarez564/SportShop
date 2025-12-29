import json
import boto3
import os
import uuid
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

def handle_product_images(body):
    """
    Maneja tanto una imagen como múltiples imágenes de forma inteligente
    """
    
    # CASO 1: Cliente envía imageUrl (método actual - compatibilidad)
    if 'imageUrl' in body and 'images' not in body:
        image_url = body['imageUrl'].strip()
        if image_url:
            # Convertir automáticamente a formato array
            images = [{
                'id': str(uuid.uuid4()),
                'url': image_url,
                'alt': f"Imagen de {body.get('name', 'producto')}",
                'isPrimary': True,
                'order': 1
            }]
            return {
                'images': images,
                'imageUrl': image_url  # Mantener para compatibilidad
            }
        else:
            return {'images': [], 'imageUrl': None}
    
    # CASO 2: Cliente envía array de imágenes
    elif 'images' in body:
        images = body['images']
        
        if not isinstance(images, list):
            raise ValueError("Images must be an array")
        
        if len(images) == 0:
            return {'images': [], 'imageUrl': None}
        
        # Validar cada imagen
        for i, img in enumerate(images):
            if not img.get('url') or not img.get('id'):
                raise ValueError(f"Image {i+1} must have id and url")
        
        # Si solo hay una imagen, marcarla automáticamente como principal
        if len(images) == 1:
            images[0]['isPrimary'] = True
            images[0]['order'] = 1
            if not images[0].get('alt'):
                images[0]['alt'] = f"Imagen de {body.get('name', 'producto')}"
        else:
            # Para múltiples imágenes, asegurar que hay una principal
            primary_images = [img for img in images if img.get('isPrimary')]
            if len(primary_images) != 1:
                # Si no hay principal o hay múltiples, hacer la primera principal
                for img in images:
                    img['isPrimary'] = False
                images[0]['isPrimary'] = True
            
            # Asegurar orden correcto
            for i, img in enumerate(images):
                if 'order' not in img:
                    img['order'] = i + 1
        
        # Encontrar imagen principal para compatibilidad
        primary_image = next((img for img in images if img.get('isPrimary')), images[0])
        
        return {
            'images': images,
            'imageUrl': primary_image['url']  # Para compatibilidad hacia atrás
        }
    
    # CASO 3: No hay imágenes
    else:
        return {
            'images': [],
            'imageUrl': None
        }

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
                    'error': 'User is not in admin group',
                    'userGroups': user_groups
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
        
        # Procesar imágenes de forma inteligente
        try:
            image_data = handle_product_images(body)
            images = image_data['images']
            image_url = image_data['imageUrl']
        except ValueError as e:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': f'Image validation error: {str(e)}',
                    'error': 'Invalid image data'
                })
            }
        
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
            'images': images,  # ← Nuevo campo para múltiples imágenes
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