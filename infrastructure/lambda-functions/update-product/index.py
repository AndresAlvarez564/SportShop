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
        
        # Obtener productId desde path parameters
        product_id = event.get('pathParameters', {}).get('id')
        print(f"Product ID: {product_id}")
        
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
        
        # Parsear body de la request
        body = json.loads(event.get('body', '{}'))
        print(f"Request body: {body}")
        
        # Verificar que el producto existe
        print("Scanning for existing product...")
        existing_product_response = products_table.scan(
            FilterExpression='id = :id',
            ExpressionAttributeValues={':id': product_id}
        )
        
        existing_products = existing_product_response.get('Items', [])
        print(f"Found products: {len(existing_products)}")
        
        if not existing_products:
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
        
        existing_product = existing_products[0]
        print(f"Existing product category: {existing_product.get('category')}")
        
        # Campos que se pueden actualizar (category NO se puede cambiar porque es sort key)
        updatable_fields = ['name', 'price', 'stock', 'gender', 'description', 'imageUrl', 'isActive']
        updates = {}
        
        # Validar y preparar actualizaciones
        for field in updatable_fields:
            if field in body:
                value = body[field]
                print(f"Processing field {field}: {value}")
                
                # Validaciones específicas por campo
                if field == 'price' and value <= 0:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({
                            'message': 'Price must be greater than 0',
                            'providedPrice': value
                        })
                    }
                
                if field == 'stock' and value < 0:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({
                            'message': 'Stock cannot be negative',
                            'providedStock': value
                        })
                    }
                
                if field == 'gender' and value.lower() not in ['hombre', 'mujer', 'unisex']:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({
                            'message': 'Gender must be: hombre, mujer, or unisex',
                            'providedGender': value,
                            'validOptions': ['hombre', 'mujer', 'unisex']
                        })
                    }
                
                # Agregar a actualizaciones
                if field == 'price':
                    updates[field] = Decimal(str(value))
                elif field == 'stock':
                    updates[field] = int(value)
                elif field == 'gender':
                    updates[field] = value.lower()
                elif field in ['name', 'description', 'imageUrl']:
                    updates[field] = str(value).strip()
                else:
                    updates[field] = value
        
        if not updates:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'No valid fields to update',
                    'updatableFields': updatable_fields
                })
            }
        
        # Agregar timestamp de actualización
        updates['updatedAt'] = datetime.utcnow().isoformat()
        updates['updatedBy'] = user_id
        
        print(f"Final updates: {updates}")
        
        # Construir expresión de actualización con ExpressionAttributeNames
        update_expression = 'SET '
        expression_values = {}
        expression_names = {}
        
        for i, (field, value) in enumerate(updates.items()):
            if i > 0:
                update_expression += ', '
            
            # Usar ExpressionAttributeNames para palabras reservadas
            field_name = f'#{field}'
            value_name = f':{field}'
            
            update_expression += f'{field_name} = {value_name}'
            expression_names[field_name] = field
            expression_values[value_name] = value
        
        print(f"Update expression: {update_expression}")
        print(f"Expression names: {expression_names}")
        print(f"Expression values: {expression_values}")
        
        # Actualizar producto
        products_table.update_item(
            Key={
                'id': product_id,
                'category': existing_product.get('category')
            },
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_names,
            ExpressionAttributeValues=expression_values
        )
        
        print("Update successful!")
        
        # Preparar respuesta con cambios
        changes = {}
        for field, new_value in updates.items():
            if field not in ['updatedAt', 'updatedBy']:
                old_value = existing_product.get(field)
                changes[field] = {
                    'from': float(old_value) if isinstance(old_value, Decimal) else old_value,
                    'to': float(new_value) if isinstance(new_value, Decimal) else new_value
                }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            'body': json.dumps({
                'message': 'Product updated successfully',
                'productId': product_id,
                'productName': existing_product.get('name'),
                'changes': changes,
                'updatedFields': list(changes.keys()),
                'adminInfo': {
                    'updatedBy': user_id,
                    'updatedAt': updates['updatedAt'],
                    'action': 'UPDATE_PRODUCT'
                }
            }, default=decimal_default)
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