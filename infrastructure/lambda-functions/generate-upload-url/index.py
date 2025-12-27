import json
import boto3
import os
from datetime import datetime
import uuid

# Inicializar cliente S3
s3_client = boto3.client('s3')
bucket_name = os.environ['IMAGES_BUCKET']

def handler(event, context):
    try:
        # Obtener userId desde Cognito (JWT token) - IGUAL QUE CREATE-PRODUCT
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
        
        print(f"Generating presigned URL for: {unique_filename}")
        
        # Generar presigned URL para upload
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': bucket_name,
                'Key': unique_filename,
                'ContentType': file_type
            },
            ExpiresIn=300  # 5 minutos
        )
        
        # URL pública del archivo (después del upload) - Directa de S3
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
                'expiresIn': 300,
                'instructions': {
                    'method': 'PUT',
                    'headers': {
                        'Content-Type': file_type
                    }
                }
            })
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