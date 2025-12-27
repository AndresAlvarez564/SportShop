# SportShop - E-commerce Serverless Web Application

## ✅ **SISTEMA COMPLETAMENTE FUNCIONAL EN AWS CON CLOUDFRONT CDN**

**URLs de Demostración (CloudFront):**
- **🌐 Página Web**: https://d36zsvraqkmul5.cloudfront.net
- **⚙️ Admin Panel**: https://d3k6e0xw9cyyrk.cloudfront.net
- **🔗 API Backend**: https://lgdw46a47k.execute-api.us-east-1.amazonaws.com/prod

**Infraestructura v2 - Completamente Renovada:**
- ✅ CloudFront CDN para ambas aplicaciones
- ✅ Infraestructura v2 con naming consistente
- ✅ Tablas DynamoDB v2 listas para nuevos datos
- ✅ Buckets S3 v2 optimizados
- ✅ Cognito User Pool v2 configurado
- ✅ **WhatsApp Integration** - Pedidos directos por WhatsApp
- ✅ **Order Management System** - Control completo de inventario

---

## 📋 Descripción del Proyecto

Aplicación web de tienda de ropa construida con **arquitectura serverless en AWS**. Proyecto real para aprender el trabajo de un Solutions Architect, implementando mejores prácticas de escalabilidad, seguridad y optimización de costos.

### ✨ **Características Principales v2**
- ✅ **E-commerce Completo** con carrito, productos, autenticación
- ✅ **WhatsApp Integration** - Pedidos directos por WhatsApp con Order ID
- ✅ **Admin Panel Separado** - Gestión segura de productos e inventario
- ✅ **CloudFront CDN** - Performance global con HTTPS
- ✅ **Order Management** - Sistema de pedidos con control de stock
- ✅ **Diseño Profesional** - Inspirado en YoungLA/Gymshark
- ✅ **Infraestructura como Código** - AWS CDK TypeScript
- ✅ **Seguridad Empresarial** - Cognito Groups y separación de aplicaciones

## ✨ Funcionalidades Implementadas

### 🛍️ **E-commerce Completo**
- ✅ **Catálogo de productos** con filtros avanzados y búsqueda
- ✅ **Diseño profesional** inspirado en YoungLA/Gymshark
- ✅ **Carrito de compras** completo (agregar, actualizar, eliminar)
- ✅ **Sistema de autenticación** con AWS Cognito
- ✅ **Sistema de reseñas** y ratings
- ✅ **Gestión de pedidos** con integración WhatsApp

### 📱 **WhatsApp Integration (NUEVO)**
- ✅ **Pedidos directos** - Cliente crea pedido y se abre WhatsApp automáticamente
- ✅ **Order ID único** - Cada pedido tiene número de referencia
- ✅ **Mensaje estructurado** - Información completa del pedido
- ✅ **Trazabilidad completa** - Pedidos guardados en DynamoDB
- ✅ **Control de inventario** - Stock se reduce solo cuando admin confirma entrega

### 🔐 **Admin Panel Separado**
- ✅ **Aplicación independiente** en bucket S3 separado
- ✅ **Seguridad empresarial** con grupos Cognito
- ✅ **CRUD completo** de productos con validaciones
- ✅ **Upload de imágenes** a S3 con presigned URLs
- ✅ **Gestión de pedidos** - Ver pedidos pendientes y completar entregas
- ✅ **Control de inventario** - Stock se actualiza al completar pedidos

### 🏗️ **Arquitectura AWS Serverless**
- ✅ **15 funciones Lambda** con lógica de negocio
- ✅ **3 tablas DynamoDB** optimizadas (Products, Cart, Orders)
- ✅ **API Gateway** con autenticación Cognito
- ✅ **3 buckets S3** (imágenes + hosting web + admin panel)
- ✅ **CloudFront CDN** con HTTPS y cache optimizado
- ✅ **Infraestructura como código** con AWS CDK
- ✅ **6 stacks CDK** organizados por dominio

---

## 🚀 Guía Completa de Instalación y Configuración

### 📋 **Prerrequisitos**

1. **Cuenta AWS** con permisos de administrador
2. **AWS CLI** configurado con credenciales
3. **Node.js** (v18 o superior)
4. **AWS CDK** instalado globalmente
5. **Git** para clonar el repositorio

```bash
# Instalar AWS CDK
npm install -g aws-cdk

# Verificar instalaciones
aws --version
cdk --version
node --version
git --version
```

### 📥 **Paso 1: Clonar y Configurar el Repositorio**

```bash
# Clonar el repositorio
git clone https://github.com/AndresAlvarez564/SportShop.git
cd SportShop

# Verificar estructura del proyecto
ls -la
# Deberías ver: frontend/, admin-panel/, infrastructure/, README.md
```

### ⚙️ **Paso 2: Configurar AWS CDK**

```bash
cd infrastructure

# Instalar dependencias
npm install

# IMPORTANTE: Configurar tu Account ID
# Editar infrastructure/bin/sportshop.ts
# Cambiar TODAS las líneas que contengan:
# account: '851725386264'
# Por tu Account ID de AWS
```

**Obtener tu AWS Account ID:**
```bash
aws sts get-caller-identity --query Account --output text
```

**Editar `infrastructure/bin/sportshop.ts`:**
```typescript
// Cambiar en TODAS las líneas (aproximadamente 6 lugares):
account: 'TU-ACCOUNT-ID-AQUI',  // Reemplazar 851725386264
```

**Bootstrap CDK (solo la primera vez):**
```bash
cdk bootstrap
```

### 🏗️ **Paso 3: Desplegar Infraestructura AWS**

```bash
# Desde infrastructure/
# Verificar que compila correctamente
cdk synth

# Desplegar todos los stacks en orden
cdk deploy --all --require-approval never

# Esto desplegará:
# 1. SportShop-Dev-Data (DynamoDB tables)
# 2. SportShop-Dev-Storage-v2 (S3 buckets)
# 3. SportShop-Dev-Compute-v2 (Lambda functions)
# 4. SportShop-Dev-Auth-v2 (Cognito User Pool)
# 5. SportShop-Dev-Api-v2 (API Gateway)
# 6. SportShop-Dev-CDN-v2 (CloudFront distributions)
```

**⏱️ Tiempo estimado:** 10-15 minutos

### 📝 **Paso 4: Obtener URLs de la Infraestructura**

Después del deploy, obtén las URLs importantes:

```bash
# Obtener URL de API Gateway
aws cloudformation describe-stacks --stack-name SportShop-Dev-Api-v2 \
  --query "Stacks[0].Outputs[0].OutputValue" --output text

# Obtener URLs de CloudFront
aws cloudformation describe-stacks --stack-name SportShop-Dev-CDN-v2 \
  --query "Stacks[0].Outputs" --output table

# Obtener Cognito User Pool info
aws cloudformation describe-stacks --stack-name SportShop-Dev-Auth-v2 \
  --query "Stacks[0].Outputs" --output table
```

**Anota estos valores:**
- **API Gateway URL**: `https://XXXXXXXX.execute-api.us-east-1.amazonaws.com/prod`
- **Website CloudFront**: `https://XXXXXXXXXXXXXX.cloudfront.net`
- **Admin CloudFront**: `https://XXXXXXXXXXXXXX.cloudfront.net`
- **User Pool ID**: `us-east-1_XXXXXXXXX`

### 🔧 **Paso 5: Configurar Frontend Principal**

```bash
cd ../frontend

# Instalar dependencias
npm install

# IMPORTANTE: Configurar API y Cognito
# Editar frontend/src/main.jsx
```

**Editar `frontend/src/main.jsx`:**
```javascript
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'TU-USER-POOL-ID',        // Cambiar aquí
      userPoolClientId: 'TU-CLIENT-ID',     // Cambiar aquí
      region: 'us-east-1'
    }
  },
  API: {
    REST: {
      SportShopAPI: {
        endpoint: 'TU-API-GATEWAY-URL',     // Cambiar aquí
        region: 'us-east-1'
      }
    }
  }
})
```

**Obtener User Pool Client ID:**
```bash
# Usar el User Pool ID obtenido anteriormente
aws cognito-idp list-user-pool-clients --user-pool-id TU-USER-POOL-ID --region us-east-1
```

### 📱 **Paso 6: Configurar WhatsApp**

```bash
# Editar frontend/src/config/whatsapp.js
```

**Editar `frontend/src/config/whatsapp.js`:**
```javascript
export const WHATSAPP_CONFIG = {
  // CAMBIAR: Tu número de WhatsApp (formato: código país + número sin +)
  phoneNumber: "59172267855", // Ejemplo Bolivia: +591 72267855
  
  // OPCIONAL: Personalizar información de la tienda
  storeName: "Tu Tienda Deportiva",
  storeWebsite: "https://tu-dominio.com",
}
```

**Formatos de número por país:**
- 🇧🇴 Bolivia: `+591 72267855` → `59172267855`
- 🇨🇴 Colombia: `+57 300 123 4567` → `573001234567`
- 🇲🇽 México: `+52 55 1234 5678` → `525512345678`
- 🇦🇷 Argentina: `+54 11 2345 6789` → `541123456789`

### 🔐 **Paso 7: Configurar Admin Panel**

```bash
cd ../admin-panel

# Instalar dependencias
npm install

# IMPORTANTE: Configurar API y Cognito (igual que frontend)
# Editar admin-panel/src/main.jsx
```

**Editar `admin-panel/src/main.jsx`:**
```javascript
// Usar la MISMA configuración que el frontend
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'TU-USER-POOL-ID',        // Mismo que frontend
      userPoolClientId: 'TU-CLIENT-ID',     // Mismo que frontend
      region: 'us-east-1'
    }
  },
  API: {
    REST: {
      SportShopAPI: {
        endpoint: 'TU-API-GATEWAY-URL',     // Mismo que frontend
        region: 'us-east-1'
      }
    }
  }
})
```

### 🚀 **Paso 8: Build y Deploy de Aplicaciones**

**Deploy Frontend:**
```bash
cd ../frontend

# Build del frontend
npm run build

# Subir a S3 (usar el nombre de tu bucket)
aws s3 sync dist/ s3://TU-BUCKET-WEBSITE --delete

# Invalidar caché de CloudFront
aws cloudfront create-invalidation --distribution-id TU-DISTRIBUTION-ID --paths "/*"
```

**Deploy Admin Panel:**
```bash
cd ../admin-panel

# Build del admin panel
npm run build

# Subir a S3 admin bucket
aws s3 sync dist/ s3://TU-BUCKET-ADMIN --delete

# Invalidar caché de CloudFront admin
aws cloudfront create-invalidation --distribution-id TU-ADMIN-DISTRIBUTION-ID --paths "/*"
```

**Obtener nombres de buckets y distribution IDs:**
```bash
# Buckets S3
aws s3 ls | grep sportshop

# CloudFront distributions
aws cloudfront list-distributions --query "DistributionList.Items[*].{Id:Id,Comment:Comment}" --output table
```

### 👤 **Paso 9: Crear Usuario Admin**

```bash
# Crear usuario admin
aws cognito-idp admin-create-user \
  --user-pool-id TU-USER-POOL-ID \
  --username admin@tudominio.com \
  --user-attributes Name=email,Value=admin@tudominio.com Name=email_verified,Value=true \
  --temporary-password TempPass123! \
  --message-action SUPPRESS \
  --region us-east-1

# Agregar al grupo admin
aws cognito-idp admin-add-user-to-group \
  --user-pool-id TU-USER-POOL-ID \
  --username admin@tudominio.com \
  --group-name admin \
  --region us-east-1

# Establecer contraseña permanente
aws cognito-idp admin-set-user-password \
  --user-pool-id TU-USER-POOL-ID \
  --username admin@tudominio.com \
  --password AdminPass123! \
  --permanent \
  --region us-east-1
```

### 🎯 **Paso 10: Verificar Funcionamiento**

**Probar Website Principal:**
1. Ir a tu URL de CloudFront del website
2. Registrar un usuario normal
3. Agregar productos al carrito
4. Crear pedido → Verificar que se abre WhatsApp con Order ID

**Probar Admin Panel:**
1. Ir a tu URL de CloudFront del admin
2. Iniciar sesión con usuario admin
3. Crear algunos productos de prueba
4. Verificar upload de imágenes

**Probar Integración WhatsApp:**
1. Crear pedido desde el website
2. Verificar mensaje en WhatsApp con:
   - Número de pedido único
   - Lista de productos
   - Total del pedido
   - Tu número de WhatsApp configurado

---

## 🔧 Configuración Avanzada

### 🏷️ **Personalizar Nombres de Recursos**

Editar `infrastructure/lib/config/environments.ts`:
```typescript
export const ENVIRONMENTS = {
  dev: {
    name: 'development',
    prefix: 'tu-tienda-dev-v2',  // Cambiar prefijo
    stage: 'dev',
    tags: {
      Environment: 'dev',
      Project: 'tu-tienda',      // Cambiar nombre
      Owner: 'tu-nombre',        // Cambiar owner
      CostCenter: 'learning',
      Component: 'development'
    }
  }
}
```

### 📱 **Personalizar Mensajes de WhatsApp**

Editar `frontend/src/config/whatsapp.js`:
```javascript
messages: {
  orderHeader: "🏪 *NUEVO PEDIDO - {storeName}*",
  orderFooter: "¡Gracias por elegir {storeName}! 🙌",
  confirmationText: "✅ *Por favor confirma tu pedido y proporciona tu dirección de entrega.*",
  additionalInfo: [
    "• 🚚 Envío: GRATIS",
    "• 💳 Pago: Contra entrega disponible",
    "• 🌐 Web: {storeWebsite}"
  ]
}
```

### 🎨 **Personalizar Diseño**

**Colores principales** en `frontend/src/App.css` y `admin-panel/src/App.css`:
```css
:root {
  --primary-color: #00d4ff;    /* Color principal */
  --secondary-color: #1a1a1a;  /* Color secundario */
  --accent-color: #ff6b35;     /* Color de acento */
}
```

---

## 🧪 Testing y Validación

### ✅ **Checklist de Verificación**

**Infraestructura:**
- [ ] Todos los stacks desplegados sin errores
- [ ] API Gateway responde correctamente
- [ ] CloudFront distributions activas
- [ ] Buckets S3 configurados correctamente

**Frontend:**
- [ ] Website carga correctamente
- [ ] Autenticación funciona (registro/login)
- [ ] Catálogo muestra productos
- [ ] Carrito funciona (agregar/quitar/actualizar)
- [ ] Pedidos se crean correctamente
- [ ] WhatsApp se abre con mensaje correcto

**Admin Panel:**
- [ ] Admin panel carga correctamente
- [ ] Solo usuarios admin pueden acceder
- [ ] CRUD de productos funciona
- [ ] Upload de imágenes funciona
- [ ] Filtros y búsquedas funcionan

**WhatsApp Integration:**
- [ ] Mensaje incluye Order ID único
- [ ] Mensaje incluye todos los productos
- [ ] Mensaje incluye total correcto
- [ ] Se abre en el número correcto

### 🔍 **Comandos de Debugging**

```bash
# Ver logs de Lambda functions
aws logs tail /aws/lambda/sportshop-dev-v2-create-order --follow

# Verificar tablas DynamoDB
aws dynamodb scan --table-name sportshop-dev-v2-products --max-items 5

# Verificar buckets S3
aws s3 ls s3://TU-BUCKET-WEBSITE

# Verificar usuarios Cognito
aws cognito-idp list-users --user-pool-id TU-USER-POOL-ID
```

---

## 🗑️ Limpieza y Eliminación

### ⚠️ **Eliminar Todos los Recursos AWS**

```bash
cd infrastructure

# CUIDADO: Esto eliminará TODOS los recursos
cdk destroy --all

# O eliminar en orden específico:
cdk destroy SportShop-Dev-CDN-v2
cdk destroy SportShop-Dev-Api-v2
cdk destroy SportShop-Dev-Compute-v2
cdk destroy SportShop-Dev-Auth-v2
cdk destroy SportShop-Dev-Storage-v2
cdk destroy SportShop-Dev-Data
```

---

## 💰 Estimación de Costos

### 💵 **Costos Mensuales Estimados (Free Tier)**

| Servicio | Uso Estimado | Costo Mensual |
|----------|--------------|---------------|
| **Lambda** | 1M requests | $0.00 (Free Tier) |
| **DynamoDB** | 25GB storage | $0.00 (Free Tier) |
| **API Gateway** | 1M requests | $3.50 |
| **S3** | 10GB storage (3 buckets) | $0.23 |
| **CloudFront** | 50GB transfer | $4.25 |
| **Cognito** | 50K MAU | $0.00 (Free Tier) |
| **CloudWatch** | Logs básicos | $2.00 |
| **TOTAL** | | **~$9.98/mes** |

**💡 Nota**: Costos pueden variar según uso real. CloudFront mejora significativamente la performance global.

---

## 🆘 Troubleshooting

### ❓ **Problemas Comunes**

**Error: "Stack already exists"**
```bash
# Verificar stacks existentes
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# Eliminar stack problemático
cdk destroy SportShop-Dev-STACK-NAME
```

**Error: "Bucket already exists"**
```bash
# Cambiar prefijo en environments.ts
prefix: 'tu-nombre-unico-dev-v2'
```

**Frontend no carga productos**
```bash
# Verificar configuración de API en main.jsx
# Verificar CORS en API Gateway
# Ver logs de Lambda functions
aws logs tail /aws/lambda/sportshop-dev-v2-get-products --follow
```

**WhatsApp no se abre**
```bash
# Verificar formato del número (sin + ni espacios)
# Probar URL manualmente: https://wa.me/TU_NUMERO
```

**Admin Panel: "Acceso Denegado"**
```bash
# Verificar que el usuario está en el grupo admin
aws cognito-idp admin-list-groups-for-user \
  --user-pool-id TU-USER-POOL-ID \
  --username TU-EMAIL \
  --region us-east-1
```

**Error al crear pedidos**
```bash
# Ver logs de create-order Lambda
aws logs tail /aws/lambda/sportshop-dev-v2-create-order --follow

# Verificar que hay productos en el carrito
# Verificar autenticación del usuario
```

---

## 📞 **Soporte y Contacto**

- **GitHub**: [@AndresAlvarez564](https://github.com/AndresAlvarez564)
- **Proyecto**: [SportShop Repository](https://github.com/AndresAlvarez564/SportShop)
- **Issues**: [GitHub Issues](https://github.com/AndresAlvarez564/SportShop/issues)

---

## 🏆 **Logros del Proyecto**

✅ **E-commerce completo y funcional**  
✅ **Arquitectura serverless escalable**  
✅ **WhatsApp integration nativa**  
✅ **Sistema de gestión de pedidos**  
✅ **Admin panel separado y seguro**  
✅ **CloudFront CDN global**  
✅ **Diseño profesional (YoungLA/Gymshark)**  
✅ **Infraestructura como código**  
✅ **Documentación completa**  
✅ **Costos optimizados**  

**Este proyecto demuestra competencias reales de Solutions Architect y desarrollo full-stack con AWS.**

---

**⭐ Si este proyecto te ayudó, considera darle una estrella en GitHub!**