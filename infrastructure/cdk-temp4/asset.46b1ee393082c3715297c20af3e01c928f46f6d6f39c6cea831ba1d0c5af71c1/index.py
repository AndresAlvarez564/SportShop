import json
import boto3
import os
from datetime import datetime
import uuid

# Inicializar cliente S3
s3_client = boto3.client('s3')
bucket_name = os.environ.get('IMAGES_BUCKET') or os.environ.get('PRODUCT_IMAGES_BUCKET')

def handler(event, context):
    try:
        print(f"Event received: {json.dumps(event)}")
        
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
            user_groups = [user_groups]
        
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
        
        # Detectar si es una imagen única o múltiples imágenes
        if 'fileNames' in body:
            # Múltiples imágenes
            return handle_multiple_images(body)
        elif 'fileName' in body and 'fileType' in body:
            # Imagen única (compatibilidad hacia atrás)
            return handle_single_image(body)
        else:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Invalid request format',
                    'examples': {
                        'single_image': {
                            'fileName': 'product-image.jpg',
                            'fileType': 'image/jpeg'
                        },
                        'multiple_images': {
                            'fileNames': ['image1.jpg', 'image2.jpg', 'image3.jpg']
                        }
                    }
                })
            }
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {str(e)}")
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Invalid JSON in request body',
                'error': str(e)
            })
        }
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Internal server error',
                'error': str(e),
                'type': type(e).__name__
            })
        }

def handle_single_image(body):
    """Maneja la subida de una sola imagen (compatibilidad hacia atrás)"""
    file_name = body.get('fileName')
    file_type = body.get('fileType')
    
    if not file_name or not file_type:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'fileName and fileType are required',
                'example': {
                    'fileName': 'product-image.jpg',
                    'fileType': 'image/jpeg'
                }
            })
        }
    
    # Validar tipo de archivo
    allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if file_type not in allowed_types:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Invalid file type',
                'allowedTypes': allowed_types,
                'providedType': file_type
            })
        }
    
    # Generar nombre único para el archivo
    timestamp = int(datetime.utcnow().timestamp())
    file_extension = file_name.split('.')[-1].lower()
    unique_filename = f"products/{timestamp}-{str(uuid.uuid4())[:8]}.{file_extension}"
    
    print(f"Generating presigned URL for single image: {unique_filename}")
    
    try:
        # Generar presigned URL para upload
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': bucket_name,
                'Key': unique_filename,
                'ContentType': file_type
            },
            ExpiresIn=3600  # 1 hora
        )
        
        # URL pública del archivo
        public_url = f"https://{bucket_name}.s3.amazonaws.com/{unique_filename}"
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            'body': json.dumps({
                'message': 'Presigned URL generated successfully',
                'uploadUrl': presigned_url,
                'publicUrl': public_url,
                'fileName': unique_filename,
                'expiresIn': 3600,
                'instructions': {
                    'method': 'PUT',
                    'headers': {
                        'Content-Type': file_type
                    }
                }
            })
        }
        
    except Exception as e:
        print(f"Error generating single image URL: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Error generating presigned URL',
                'error': str(e)
            })
        }

def handle_multiple_images(body):
    """Maneja la subida de múltiples imágenes"""
    file_names = body.get('fileNames', [])
    
    if not file_names or not isinstance(file_names, list):
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'fileNames array is required',
                'error': 'Missing or invalid fileNames parameter'
            })
        }
    
    print(f"Generating presigned URLs for {len(file_names)} files")
    
    # Generar presigned URLs para cada archivo
    upload_urls = []
    for file_name in file_names:
        # Generar nombre único para cada imagen
        file_extension = file_name.split('.')[-1].lower() if '.' in file_name else 'jpg'
        
        # Mapear extensiones a content types correctos
        content_type_map = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp'
        }
        content_type = content_type_map.get(file_extension, 'image/jpeg')
        
        unique_name = f"products/{uuid.uuid4()}-{int(datetime.utcnow().timestamp())}.{file_extension}"
        
        try:
            # Generar presigned URL para upload
            presigned_url = s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': bucket_name,
                    'Key': unique_name,
                    'ContentType': content_type
                },
                ExpiresIn=3600  # 1 hora
            )
            
            # URL pública para acceder a la imagen
            public_url = f"https://{bucket_name}.s3.amazonaws.com/{unique_name}"
            
            upload_urls.append({
                'originalFileName': file_name,
                'uploadUrl': presigned_url,
                'publicUrl': public_url,
                'imageId': str(uuid.uuid4()),
                'key': unique_name
            })
            
            print(f"Generated URL for {file_name} -> {unique_name} (Content-Type: {content_type})")
            
        except Exception as e:
            print(f"Error generating URL for {file_name}: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': f'Error generating presigned URL for {file_name}',
                    'error': str(e)
                })
            }
    
    print(f"Successfully generated {len(upload_urls)} presigned URLs")
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        'body': json.dumps({
            'message': 'Presigned URLs generated successfully',
            'uploadUrls': upload_urls,
            'count': len(upload_urls),
            'expiresIn': 3600
        })
    }