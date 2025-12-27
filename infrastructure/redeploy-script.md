# Script de Re-despliegue SportShop

## 📋 Plan de Ejecución

### ✅ **Preparación completada:**
- Nombres de buckets cambiados a `-v2`
- Nombres de stacks cambiados a `-v2`
- Synth exitoso - no hay errores de sintaxis
- Dependencias correctas configuradas

### 🗑️ **1. Eliminar stacks antiguos (en orden):**

```bash
# 1. Eliminar CDN (si existe)
cdk destroy SportShop-Dev-CDN --force

# 2. Eliminar API
cdk destroy SportShop-Dev-Api --force

# 3. Eliminar Compute
cdk destroy SportShop-Dev-Compute --force

# 4. Eliminar Auth
cdk destroy SportShop-Dev-Auth --force

# 5. Eliminar Storage
cdk destroy SportShop-Dev-Storage --force

# NOTA: NO eliminar SportShop-Dev-Data (mantener datos)
```

### 🚀 **2. Desplegar stacks nuevos (en orden):**

```bash
# 1. Storage primero (buckets)
cdk deploy SportShop-Dev-Storage-v2 --require-approval never

# 2. Auth (Cognito)
cdk deploy SportShop-Dev-Auth-v2 --require-approval never

# 3. Compute (Lambdas)
cdk deploy SportShop-Dev-Compute-v2 --require-approval never

# 4. API (API Gateway)
cdk deploy SportShop-Dev-Api-v2 --require-approval never

# 5. CDN (CloudFront) - ÚLTIMO
cdk deploy SportShop-Dev-CDN-v2 --require-approval never
```

## 📝 **Nuevos recursos que se crearán:**

### **Buckets S3:**
- `sportshop-dev-product-images-v2`
- `sportshop-dev-website-v2`
- `sportshop-dev-admin-v2`

### **URLs que cambiarán:**
- **Nueva API Gateway URL** (necesitarás actualizar frontend/admin)
- **Nuevas URLs de CloudFront** (para website y admin)
- **Nueva URL de bucket de imágenes** (para Lambda de upload)

## ⚠️ **Cambios necesarios después del deploy:**

### **1. Frontend (frontend/src/main.jsx):**
```javascript
// Cambiar por la nueva API Gateway URL
Amplify.configure({
  API: {
    REST: {
      SportShopAPI: {
        endpoint: 'NUEVA_API_GATEWAY_URL'
      }
    }
  }
})
```

### **2. Admin Panel (admin-panel/src/main.jsx):**
```javascript
// Cambiar por la nueva API Gateway URL
Amplify.configure({
  API: {
    REST: {
      SportShopAPI: {
        endpoint: 'NUEVA_API_GATEWAY_URL'
      }
    }
  }
})
```

### **3. Lambda de Upload (generate-upload-url/index.py):**
```python
# Cambiar nombre del bucket
BUCKET_NAME = 'sportshop-dev-product-images-v2'
```

## 🎯 **Ventajas de esta configuración:**
- ✅ **Buckets privados** con acceso solo desde CloudFront (más seguro)
- ✅ **Nombres únicos** - sin conflictos con recursos antiguos
- ✅ **Deploy limpio** - sin dependencias rotas
- ✅ **Configuración optimizada** - CloudFront con website endpoints

## ⏱️ **Tiempo estimado:**
- **Eliminación**: ~10-15 minutos
- **Deploy nuevo**: ~25-30 minutos
- **Total**: ~40-45 minutos

¿Listo para empezar con la eliminación de stacks antiguos?