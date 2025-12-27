# SportShop - E-commerce Serverless Web Application

## ✅ **SISTEMA COMPLETAMENTE FUNCIONAL EN AWS**

**URLs en Producción:**
- **🌐 Página Web**: http://sportshop-dev-website.s3-website-us-east-1.amazonaws.com
- **⚙️ Admin Panel**: http://sportshop-dev-admin.s3-website-us-east-1.amazonaws.com
- **🔗 API Backend**: https://n6k1hqcj6d.execute-api.us-east-1.amazonaws.com/prod

---

## 📋 Descripción del Proyecto

Aplicación web de tienda de ropa construida con **arquitectura serverless en AWS**. Proyecto real para aprender el trabajo de un Solutions Architect, implementando mejores prácticas de escalabilidad, seguridad y optimización de costos.

**🏆 NUEVA CARACTERÍSTICA**: Admin Panel completamente separado para máxima seguridad empresarial.

## ✨ Funcionalidades Implementadas

### 🛍️ **E-commerce Completo**
- ✅ **Catálogo de productos** con filtros avanzados y búsqueda
- ✅ **Diseño profesional** inspirado en YoungLA/Gymshark
- ✅ **Carrito de compras** completo (agregar, actualizar, eliminar)
- ✅ **Sistema de autenticación** con AWS Cognito
- ✅ **Sistema de reseñas** y ratings
- ✅ **Gestión de pedidos** con integración WhatsApp

### 🔐 **Admin Panel Separado (NUEVO)**
- ✅ **Aplicación independiente** en bucket S3 separado
- ✅ **Seguridad empresarial** con grupos Cognito
- ✅ **CRUD completo** de productos con validaciones
- ✅ **Upload de imágenes** a S3 con presigned URLs
- ✅ **Acceso controlado** solo para administradores autorizados
- ✅ **URL no enlazada** desde el sitio público para mayor seguridad

### 🏗️ **Arquitectura AWS Serverless**
- ✅ **15 funciones Lambda** con lógica de negocio
- ✅ **3 tablas DynamoDB** optimizadas
- ✅ **API Gateway** con autenticación Cognito
- ✅ **3 buckets S3** (imágenes + hosting web + admin panel)
- ✅ **Infraestructura como código** con AWS CDK
- ✅ **5 stacks CDK** organizados por dominio

---

## 🏗️ Arquitectura del Sistema

### 📐 Diagrama de Arquitectura

![SportShop L0 Architecture](pictures/Architecture_L0.png)

**Flujo de la aplicación:**
```
Usuario Público → S3 Website → API Gateway → Lambda → DynamoDB
                           ↓
Admin → S3 Admin Panel → API Gateway → Lambda → DynamoDB
                           ↓
                    Cognito (Auth) → S3 (Images)
```

### 🔧 Componentes AWS Desplegados

| Servicio | Recurso | Propósito |
|----------|---------|-----------|
| **S3** | `sportshop-dev-website` | Hosting estático del frontend público |
| **S3** | `sportshop-dev-admin` | **NUEVO**: Hosting del admin panel separado |
| **S3** | `sportshop-dev-product-images` | Almacenamiento de imágenes |
| **DynamoDB** | `sportshop-dev-products` | Catálogo de productos |
| **DynamoDB** | `sportshop-dev-cart` | Carritos de usuarios |
| **DynamoDB** | `sportshop-dev-orders` | Historial de pedidos |
| **Cognito** | User Pool + Admin Group | Autenticación con control de acceso |
| **API Gateway** | REST API | Endpoints del backend |
| **Lambda** | 15 funciones | Lógica de negocio |

---

## 🚀 Guía de Instalación y Despliegue

### 📋 **Prerrequisitos**

1. **AWS CLI** configurado con credenciales
2. **Node.js** (v18 o superior)
3. **AWS CDK** instalado globalmente
4. **Git** para clonar el repositorio

```bash
# Instalar AWS CDK
npm install -g aws-cdk

# Verificar instalación
aws --version
cdk --version
node --version
```

### 📥 **Paso 1: Clonar el Repositorio**

```bash
git clone https://github.com/AndresAlvarez564/SportShop.git
cd SportShop
```

### ⚙️ **Paso 2: Configurar AWS CDK**

```bash
cd infrastructure

# Instalar dependencias
npm install

# Configurar tu cuenta AWS (reemplaza con tu account ID)
# Editar infrastructure/bin/sportshop.ts líneas 20, 28, 36, 44, 52
# Cambiar: account: '851725386264' por tu account ID

# Bootstrap CDK (solo la primera vez)
cdk bootstrap
```

### 🏗️ **Paso 3: Desplegar Infraestructura**

```bash
# Desde infrastructure/
cdk synth  # Verificar que compila

# Desplegar todos los stacks (orden automático)
cdk deploy --all --require-approval never

# O desplegar uno por uno:
cdk deploy SportShop-Dev-Data --require-approval never
cdk deploy SportShop-Dev-Storage --require-approval never  
cdk deploy SportShop-Dev-Compute --require-approval never
cdk deploy SportShop-Dev-Auth --require-approval never
cdk deploy SportShop-Dev-Api --require-approval never
```

### 🌐 **Paso 4: Desplegar Frontend Público**

```bash
cd ../frontend

# Instalar dependencias
npm install

# IMPORTANTE: Actualizar configuración de API
# Editar frontend/src/main.jsx línea 15
# Cambiar endpoint por la URL de tu API Gateway (obtenida del deploy)

# Build del frontend
npm run build

# Subir a S3 (reemplaza con tu bucket name)
aws s3 sync dist/ s3://TU-BUCKET-WEBSITE --delete
```

### 🔐 **Paso 5: Desplegar Admin Panel (NUEVO)**

```bash
cd ../admin-panel

# Instalar dependencias
npm install

# IMPORTANTE: Actualizar configuración de API
# Editar admin-panel/src/main.jsx líneas 8-9
# Cambiar userPoolId, userPoolClientId y endpoint por los tuyos

# Build del admin panel
npm run build

# Subir a S3 admin bucket
aws s3 sync dist/ s3://TU-BUCKET-ADMIN --delete
```

### 👤 **Paso 6: Configurar Usuario Admin**

```bash
# Agregar usuario al grupo admin (reemplaza con tu email)
aws cognito-idp admin-add-user-to-group \
  --user-pool-id TU-USER-POOL-ID \
  --username TU-EMAIL \
  --group-name admin
```

### 🔍 **Paso 7: Obtener URLs**

```bash
# URL de la página web pública
echo "Website: http://TU-BUCKET-WEBSITE.s3-website-us-east-1.amazonaws.com"

# URL del admin panel
echo "Admin: http://TU-BUCKET-ADMIN.s3-website-us-east-1.amazonaws.com"

# URL de la API
aws cloudformation describe-stacks --stack-name SportShop-Dev-Api \
  --query "Stacks[0].Outputs[0].OutputValue" --output text
```

---

## 🛠️ Desarrollo Local

### 🖥️ **Frontend Público (React + Vite)**

```bash
cd frontend

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev  # http://localhost:5173

# Build para producción
npm run build
```

### 🔐 **Admin Panel (React + Vite)**

```bash
cd admin-panel

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev  # http://localhost:5174

# Build para producción
npm run build
```

### ⚡ **Backend (Lambda Functions)**

```bash
cd infrastructure

# Desplegar solo funciones Lambda
cdk deploy SportShop-Dev-Compute --require-approval never

# Ver logs de una función
aws logs tail /aws/lambda/sportshop-dev-get-products --follow
```

---

## 📁 Estructura del Proyecto

```
SportShop/
├── 📁 frontend/                    # React + Vite application (público)
│   ├── src/
│   │   ├── pages/                  # Páginas principales
│   │   ├── components/             # Componentes reutilizables
│   │   └── main.jsx               # Configuración Amplify
│   └── dist/                      # Build para producción
│
├── 📁 admin-panel/                 # 🆕 Admin Panel separado
│   ├── src/
│   │   ├── AdminPanel.jsx         # Componente principal admin
│   │   ├── App.jsx                # App admin independiente
│   │   └── main.jsx               # Configuración Amplify admin
│   └── dist/                      # Build admin para producción
│
├── 📁 infrastructure/              # AWS CDK Infrastructure
│   ├── bin/sportshop.ts           # Entry point principal
│   ├── lib/stacks/                # Stacks organizados por dominio
│   │   ├── data-stack.ts          # DynamoDB tables
│   │   ├── compute-stack.ts       # Lambda functions  
│   │   ├── api-stack.ts           # API Gateway
│   │   ├── storage-stack.ts       # 🆕 3 buckets S3 (web + admin + images)
│   │   └── auth-stack.ts          # Cognito + Admin Group
│   ├── lib/config/                # Configuraciones por ambiente
│   ├── lib/constructs/            # Componentes reutilizables
│   └── lambda-functions/          # Código de 15 funciones Lambda
│
└── 📁 pictures/                   # Diagramas de arquitectura
```

---

## 🔐 Seguridad del Admin Panel

### 🛡️ **Arquitectura de Seguridad Implementada**

**1. Separación Física:**
- Admin panel en bucket S3 completamente separado
- URL independiente no enlazada desde el sitio público
- Aplicación React independiente con su propio build

**2. Control de Acceso:**
- Grupo "admin" en AWS Cognito para autorización
- Verificación de permisos en cada función Lambda
- Tokens JWT validados en todas las operaciones admin

**3. Principio de Menor Privilegio:**
- Solo usuarios autorizados pueden acceder al admin
- Funciones admin separadas de funciones públicas
- Mensajes de error específicos para acceso denegado

### 🔑 **Gestión de Usuarios Admin**

```bash
# Crear usuario admin
aws cognito-idp admin-create-user \
  --user-pool-id TU-USER-POOL-ID \
  --username admin@tudominio.com \
  --temporary-password TempPass123! \
  --message-action SUPPRESS

# Agregar al grupo admin
aws cognito-idp admin-add-user-to-group \
  --user-pool-id TU-USER-POOL-ID \
  --username admin@tudominio.com \
  --group-name admin

# Remover del grupo admin
aws cognito-idp admin-remove-user-from-group \
  --user-pool-id TU-USER-POOL-ID \
  --username admin@tudominio.com \
  --group-name admin
```

---

## 🔧 Configuración Personalizada

### 🏷️ **Variables de Entorno**

Editar `infrastructure/lib/config/environments.ts`:

```typescript
export const environments = {
  dev: {
    prefix: 'tu-proyecto-dev',  // Cambiar prefijo
    tags: {
      Project: 'tu-proyecto',
      Owner: 'tu-nombre',
      Environment: 'dev'
    }
  }
}
```

### 🔐 **Configuración de Cognito**

**Frontend Público** (`frontend/src/main.jsx`):
```javascript
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'TU-USER-POOL-ID',
      userPoolClientId: 'TU-CLIENT-ID',
      region: 'us-east-1'
    }
  },
  API: {
    REST: {
      SportShopAPI: {
        endpoint: 'TU-API-GATEWAY-URL',
        region: 'us-east-1'
      }
    }
  }
})
```

**Admin Panel** (`admin-panel/src/main.jsx`):
```javascript
// Misma configuración que el frontend público
// El admin panel reutiliza la misma infraestructura de auth
```

---

## 🧪 Testing y Validación

### ✅ **Verificar Despliegue**

```bash
# Verificar stacks desplegados
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# Probar API endpoints públicos
curl https://TU-API-GATEWAY-URL/products

# Probar endpoint admin (requiere token)
curl -H "Authorization: Bearer TU-JWT-TOKEN" https://TU-API-GATEWAY-URL/admin/products

# Verificar buckets S3
aws s3 ls | grep sportshop
```

### 🔍 **Testing del Admin Panel**

1. **Acceso sin autenticación**: Debe redirigir a login
2. **Usuario normal**: Debe mostrar "Acceso Denegado"
3. **Usuario admin**: Debe permitir todas las operaciones CRUD
4. **Upload de imágenes**: Debe funcionar con presigned URLs
5. **Validaciones**: Debe validar campos requeridos

### 🔍 **Logs y Debugging**

```bash
# Ver logs de API Gateway
aws logs tail /aws/apigateway/SportShop-Dev-Api --follow

# Ver logs de función admin específica
aws logs tail /aws/lambda/sportshop-dev-create-product --follow

# Ver métricas de admin panel
aws cloudwatch get-metric-statistics --namespace AWS/S3 \
  --metric-name NumberOfObjects --dimensions Name=BucketName,Value=sportshop-dev-admin \
  --start-time 2024-01-01T00:00:00Z --end-time 2024-01-02T00:00:00Z \
  --period 3600 --statistics Average
```

---

## 🗑️ Limpieza y Eliminación

### ⚠️ **Eliminar Recursos AWS**

```bash
cd infrastructure

# Eliminar todos los stacks (CUIDADO: Elimina todo)
cdk destroy --all

# O eliminar en orden inverso:
cdk destroy SportShop-Dev-Api
cdk destroy SportShop-Dev-Compute  
cdk destroy SportShop-Dev-Auth
cdk destroy SportShop-Dev-Storage  # Incluye los 3 buckets
cdk destroy SportShop-Dev-Data
```

**⚠️ IMPORTANTE**: El bucket admin también se eliminará con el storage stack.

---

## 💰 Estimación de Costos

### 💵 **Costos Mensuales Estimados (Free Tier)**

| Servicio | Uso Estimado | Costo Mensual |
|----------|--------------|---------------|
| **Lambda** | 1M requests | $0.00 (Free Tier) |
| **DynamoDB** | 25GB storage | $0.00 (Free Tier) |
| **API Gateway** | 1M requests | $3.50 |
| **S3** | 10GB storage (3 buckets) | $0.23 |
| **Cognito** | 50K MAU | $0.00 (Free Tier) |
| **CloudWatch** | Logs básicos | $2.00 |
| **TOTAL** | | **~$5.73/mes** |

**💡 Nota**: El admin panel separado agrega mínimo costo adicional (~$0.11/mes por bucket extra).

---

## 🚀 Mejoras Futuras Sugeridas

### 🔐 **Seguridad Avanzada**
- **CloudFront** con WAF para protección DDoS
- **Dominio personalizado** con SSL/TLS
- **MFA obligatorio** para usuarios admin
- **Logs de auditoría** detallados

### 📊 **Monitoreo y Observabilidad**
- **CloudWatch Dashboards** personalizados
- **Alertas automáticas** para errores
- **X-Ray tracing** para debugging
- **Cost Explorer** para optimización

### ⚡ **Performance**
- **CloudFront CDN** para ambas aplicaciones
- **Lambda@Edge** para optimizaciones
- **DynamoDB DAX** para cache
- **Compresión Gzip** automática

---

## 🤝 Contribución

Este es un proyecto de aprendizaje que implementa patrones empresariales reales. Las contribuciones son bienvenidas siguiendo las mejores prácticas de desarrollo.

### 📝 **Proceso de Contribución**

1. Fork del repositorio
2. Crear branch para feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

### 🎯 **Áreas de Contribución**
- Mejoras de seguridad
- Optimizaciones de performance
- Nuevas funcionalidades de e-commerce
- Documentación y tutoriales
- Tests automatizados

---

## 📄 Licencia

MIT License - Ver archivo LICENSE para más detalles.

---

## 🆘 Soporte y Troubleshooting

### ❓ **Problemas Comunes**

**Error: "Stack already exists"**
```bash
# Verificar stacks existentes
aws cloudformation list-stacks

# Eliminar stack problemático
cdk destroy SportShop-Dev-STACK-NAME
```

**Error: "Bucket already exists"**
```bash
# Cambiar nombre del bucket en environments.ts
prefix: 'tu-nombre-unico-dev'
```

**Admin Panel: "Acceso Denegado"**
```bash
# Verificar que el usuario está en el grupo admin
aws cognito-idp admin-list-groups-for-user \
  --user-pool-id TU-USER-POOL-ID \
  --username TU-EMAIL

# Agregar al grupo si no está
aws cognito-idp admin-add-user-to-group \
  --user-pool-id TU-USER-POOL-ID \
  --username TU-EMAIL \
  --group-name admin
```

**Frontend no carga productos**
```bash
# Verificar configuración de API en main.jsx
# Verificar CORS en API Gateway
# Verificar logs de Lambda functions
```

**Admin Panel no carga**
```bash
# Verificar que el bucket admin existe
aws s3 ls s3://sportshop-dev-admin

# Verificar configuración de hosting estático
aws s3api get-bucket-website --bucket sportshop-dev-admin
```

### 📞 **Contacto**

- **GitHub**: [@AndresAlvarez564](https://github.com/AndresAlvarez564)
- **Proyecto**: [SportShop Repository](https://github.com/AndresAlvarez564/SportShop)

---

**⭐ Si este proyecto te ayudó, considera darle una estrella en GitHub!**

---

## 🏆 **Logros del Proyecto**

✅ **E-commerce completo y funcional**  
✅ **Arquitectura serverless escalable**  
✅ **Seguridad empresarial implementada**  
✅ **Admin panel separado y seguro**  
✅ **Diseño profesional (YoungLA/Gymshark)**  
✅ **Infraestructura como código**  
✅ **Costos optimizados**  
✅ **Documentación completa**  

**Este proyecto demuestra competencias reales de Solutions Architect y desarrollo full-stack con AWS.**