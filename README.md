# SportShop - E-commerce Serverless Web Application

## � *r*SISTEMA COMPLETAMENTE FUNCIONAL EN AWS**

**URLs en Producción:**
- **🌐 Página Web**: http://sportshop-dev-website.s3-website-us-east-1.amazonaws.com
- **🔗 API Backend**: https://n6k1hqcj6d.execute-api.us-east-1.amazonaws.com/prod

---

## 📋 Descripción del Proyecto

Aplicación web de tienda de ropa construida con **arquitectura serverless en AWS**. Proyecto real para aprender el trabajo de un Solutions Architect, implementando mejores prácticas de escalabilidad, seguridad y optimización de costos.

## ✨ Funcionalidades Implementadas

### 🛍️ **E-commerce Completo**
- ✅ **Catálogo de productos** con filtros y búsqueda
- ✅ **Carrito de compras** completo (agregar, actualizar, eliminar)
- ✅ **Sistema de autenticación** con AWS Cognito
- ✅ **Panel de administración** con CRUD de productos
- ✅ **Upload de imágenes** a S3 con presigned URLs
- ✅ **Sistema de reseñas** y ratings
- ✅ **Gestión de pedidos** con integración WhatsApp

### 🏗️ **Arquitectura AWS Serverless**
- ✅ **15 funciones Lambda** con lógica de negocio
- ✅ **3 tablas DynamoDB** optimizadas
- ✅ **API Gateway** con autenticación Cognito
- ✅ **2 buckets S3** (imágenes + hosting web)
- ✅ **Infraestructura como código** con AWS CDK
- ✅ **5 stacks CDK** organizados por dominio

---

## 🏗️ Arquitectura del Sistema

### 📐 Diagrama de Arquitectura

![SportShop L0 Architecture](pictures/Architecture_L0.png)

**Flujo de la aplicación:**
```
Usuario → S3 Website → API Gateway → Lambda → DynamoDB
                    ↓
                Cognito (Auth) → S3 (Images)
```

### � AComponentes AWS Desplegados

| Servicio | Recurso | Propósito |
|----------|---------|-----------|
| **S3** | `sportshop-dev-website` | Hosting estático del frontend |
| **S3** | `sportshop-dev-product-images` | Almacenamiento de imágenes |
| **DynamoDB** | `sportshop-dev-products` | Catálogo de productos |
| **DynamoDB** | `sportshop-dev-cart` | Carritos de usuarios |
| **DynamoDB** | `sportshop-dev-orders` | Historial de pedidos |
| **Cognito** | User Pool | Autenticación de usuarios |
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

### 🌐 **Paso 4: Desplegar Frontend**

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

### 🔍 **Paso 5: Obtener URLs**

```bash
# URL de la página web
echo "Website: http://TU-BUCKET-WEBSITE.s3-website-us-east-1.amazonaws.com"

# URL de la API
aws cloudformation describe-stacks --stack-name SportShop-Dev-Api \
  --query "Stacks[0].Outputs[0].OutputValue" --output text
```

---

## �️ Desarrollo Local

### 🖥️ **Frontend (React + Vite)**

```bash
cd frontend

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev  # http://localhost:5173

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
├── 📁 frontend/                    # React + Vite application
│   ├── src/
│   │   ├── pages/                  # Páginas principales
│   │   ├── components/             # Componentes reutilizables
│   │   └── main.jsx               # Configuración Amplify
│   └── dist/                      # Build para producción
│
├── 📁 infrastructure/              # AWS CDK Infrastructure
│   ├── bin/sportshop.ts           # Entry point principal
│   ├── lib/stacks/                # Stacks organizados por dominio
│   │   ├── data-stack.ts          # DynamoDB tables
│   │   ├── compute-stack.ts       # Lambda functions  
│   │   ├── api-stack.ts           # API Gateway
│   │   ├── storage-stack.ts       # S3 buckets
│   │   └── auth-stack.ts          # Cognito authentication
│   ├── lib/config/                # Configuraciones por ambiente
│   ├── lib/constructs/            # Componentes reutilizables
│   └── lambda-functions/          # Código de 15 funciones Lambda
│
└── 📁 pictures/                   # Diagramas de arquitectura
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

Después del deploy, actualizar `frontend/src/main.jsx`:

```javascript
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'TU-USER-POOL-ID',      // Del output de Auth stack
      userPoolClientId: 'TU-CLIENT-ID',    // Del output de Auth stack
      region: 'us-east-1'
    }
  },
  API: {
    REST: {
      SportShopAPI: {
        endpoint: 'TU-API-GATEWAY-URL',     // Del output de Api stack
        region: 'us-east-1'
      }
    }
  }
})
```

---

## 🧪 Testing y Validación

### ✅ **Verificar Despliegue**

```bash
# Verificar stacks desplegados
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# Probar API endpoints
curl https://TU-API-GATEWAY-URL/products

# Verificar funciones Lambda
aws lambda list-functions --query "Functions[?contains(FunctionName, 'sportshop')]"
```

### 🔍 **Logs y Debugging**

```bash
# Ver logs de API Gateway
aws logs tail /aws/apigateway/SportShop-Dev-Api --follow

# Ver logs de función específica
aws logs tail /aws/lambda/sportshop-dev-get-products --follow

# Ver métricas en CloudWatch
aws cloudwatch get-metric-statistics --namespace AWS/Lambda \
  --metric-name Invocations --dimensions Name=FunctionName,Value=sportshop-dev-get-products \
  --start-time 2024-01-01T00:00:00Z --end-time 2024-01-02T00:00:00Z \
  --period 3600 --statistics Sum
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
cdk destroy SportShop-Dev-Storage
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
| **S3** | 5GB storage | $0.12 |
| **Cognito** | 50K MAU | $0.00 (Free Tier) |
| **CloudWatch** | Logs básicos | $2.00 |
| **TOTAL** | | **~$5.62/mes** |

---

## 🤝 Contribución

Este es un proyecto de aprendizaje. Las contribuciones son bienvenidas siguiendo las mejores prácticas de desarrollo.

### 📝 **Proceso de Contribución**

1. Fork del repositorio
2. Crear branch para feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

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

**Frontend no carga productos**
```bash
# Verificar configuración de API en main.jsx
# Verificar CORS en API Gateway
# Verificar logs de Lambda functions
```

### 📞 **Contacto**

- **GitHub**: [@AndresAlvarez564](https://github.com/AndresAlvarez564)
- **Proyecto**: [SportShop Repository](https://github.com/AndresAlvarez564/SportShop)

---

**⭐ Si este proyecto te ayudó, considera darle una estrella en GitHub!**