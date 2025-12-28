# 🏪 SportShop E-commerce - Arquitectura Serverless AWS

Sistema de e-commerce completo construido con arquitectura serverless en AWS, implementando las mejores prácticas de Solutions Architecture.

## ✅ **SISTEMA EMPRESARIAL COMPLETAMENTE FUNCIONAL**

**URLs de Producción (v3 con CloudFront):**
- **�️ Tienda Pública**: https://d17qodo8pv3hts.cloudfront.net
- **🔧 Panel Admin**: https://d17uvi8urmffh3.cloudfront.net

**Infraestructura v3 - Completamente Optimizada:**
- ✅ **21 funciones Lambda** para gestión empresarial completa
- ✅ **Sistema jerárquico de ventas** (Año → Mes → Día → Detalle)
- ✅ **Filtros avanzados estilo Excel** para pedidos
- ✅ **Gestión automática de stock** con reducción al completar pedidos
- ✅ **CloudFront CDN** para performance global
- ✅ **Separación empresarial** de aplicaciones

### �  **Credenciales de Administrador**

- **Email**: jortiwe4@gmail.com
- **Password**: AdminJorge2024!
- **Grupo**: admin (en Cognito)
- **Acceso**: Panel de administración completo

---

## 🌟 Características Principales

### 🛍️ Frontend de Tienda
- **Catálogo de productos** con diseño profesional inspirado en YoungLA/Gymshark
- **Filtros avanzados** por categoría, género, precio y búsqueda
- **Carrito de compras** con gestión de cantidades
- **Checkout completo** con información de cliente
- **Integración WhatsApp** para pedidos directos
- **Diseño responsive** y tema dark profesional

### 🔧 Panel de Administración Empresarial
- **Dashboard completo** con estadísticas en tiempo real
- **Gestión de productos** con upload de imágenes S3
- **Sistema jerárquico de ventas** (Año → Mes → Día → Detalle)
- **Gestión avanzada de pedidos** con filtros estilo Excel (últimos 7 días por defecto)
- **Exportación CSV** para análisis de datos
- **Navegación breadcrumb** profesional
- **Seguridad empresarial** con separación física de aplicaciones

### ⚡ Backend Serverless
- **21 funciones Lambda** para gestión completa
- **4 tablas DynamoDB** optimizadas (Products, Cart, Orders, Sales)
- **API Gateway** con autenticación Cognito
- **Gestión automática de stock** al completar pedidos
- **Sistema completo de pedidos y ventas**

### 📱 **Integración WhatsApp**
- **Pedidos directos** a WhatsApp con mensaje estructurado
- **Información completa** del cliente y productos
- **Formato profesional** con emojis y organización clara
- **Configuración flexible** del número de destino
- **Sin costos adicionales** de APIs de pago
- **Comunicación inmediata** entre cliente y tienda
- **Pago contra entrega** disponible

**Ejemplo de mensaje generado:**
```
🏪 *NUEVO PEDIDO - SportShop*

👤 *Cliente:* cliente@email.com
📅 *Fecha:* 27/12/2024
🕐 *Hora:* 15:30:45

🛒 *PRODUCTOS SOLICITADOS:*
──────────────────────────────
1. *Camiseta Deportiva Premium*
   📦 Cantidad: 2
   💰 Precio unitario: $45.99
   💵 Subtotal: $91.98

📊 *RESUMEN DEL PEDIDO:*
• Total de artículos: 2
• *TOTAL A PAGAR: $91.98*

✅ *Por favor confirma tu pedido y proporciona tu dirección de entrega.*
```

## 🏗️ Arquitectura AWS

### Servicios Utilizados
- **AWS CDK** - Infraestructura como código
- **Lambda Functions** - Lógica de negocio serverless
- **DynamoDB** - Base de datos NoSQL
- **API Gateway** - APIs REST
- **Cognito** - Autenticación y autorización
- **S3** - Almacenamiento de archivos estáticos e imágenes
- **CloudFront** - CDN global con HTTPS

### Estructura de la Infraestructura
```
infrastructure/
├── lib/
│   ├── stacks/
│   │   ├── auth-stack.ts      # Cognito User Pool
│   │   ├── data-stack.ts      # DynamoDB Tables
│   │   ├── storage-stack.ts   # S3 Buckets
│   │   ├── compute-stack.ts   # Lambda Functions
│   │   ├── api-stack.ts       # API Gateway
│   │   └── cdn-stack.ts       # CloudFront CDN
│   └── constructs/
│       └── lambda-construct.ts
└── lambda-functions/          # 21 funciones Lambda
```

## 📊 Funcionalidades del Sistema

### 🛒 Gestión de Productos
- ✅ Crear, editar y eliminar productos
- ✅ Upload de imágenes con presigned URLs
- ✅ Gestión de stock automática
- ✅ Categorización por género y tipo

### 📦 Gestión Avanzada de Pedidos
- ✅ Creación de pedidos desde el carrito
- ✅ **Filtros estilo Excel** con rangos de fecha, búsqueda de clientes, montos
- ✅ **Vista por defecto**: últimos 7 días (optimización de performance)
- ✅ **Búsqueda manual** para pedidos más antiguos
- ✅ Completar pedidos (reduce stock automáticamente)
- ✅ Cancelar pedidos
- ✅ Información completa de clientes

### � Sistsema Jerárquico Profesional de Ventas
- ✅ **Vista por Años**: Estadísticas anuales con drill-down
- ✅ **Vista por Meses**: Breakdown mensual del año seleccionado
- ✅ **Vista por Días**: Breakdown diario del mes seleccionado
- ✅ **Vista Detallada**: Información completa de productos, clientes y horarios
- ✅ **Navegación Breadcrumb**: Navegación intuitiva entre niveles
- ✅ **Estadísticas Contextuales**: Totales y promedios en cada nivel
- ✅ **Exportación CSV**: Análisis de datos externos por día
- ✅ **Diseño Profesional**: Optimizado para grandes volúmenes de ventas

### 🔐 Seguridad Empresarial
- ✅ Autenticación con AWS Cognito
- ✅ Grupos de usuarios (admin)
- ✅ Separación física de aplicaciones
- ✅ HTTPS por defecto con CloudFront
- ✅ Buckets S3 independientes

## 🛠️ Tecnologías

### Frontend
- **React 18** con Vite
- **AWS Amplify SDK** para integración
- **CSS3** con diseño profesional
- **Responsive Design**

### Backend
- **AWS CDK** (TypeScript)
- **Python 3.9** para Lambda functions
- **DynamoDB** para persistencia
- **S3** para almacenamiento

### DevOps
- **Infrastructure as Code** con CDK
- **CloudFront** para CDN global
- **Automated deployments**

## 📈 Métricas del Sistema

### Performance
- **Global CDN** con CloudFront
- **Serverless** - escalado automático
- **Optimización de imágenes** S3
- **Vista jerárquica** para grandes volúmenes de datos

### Costos Optimizados
- **Pay-per-use** con Lambda
- **DynamoDB On-Demand**
- **S3 Standard** para archivos estáticos

## 🔧 Configuración de Desarrollo

### Prerrequisitos
- Node.js 18+
- AWS CLI configurado
- AWS CDK CLI

### Instalación
```bash
# Clonar repositorio
git clone <repository-url>
cd sportshop

# Instalar dependencias de infraestructura
cd infrastructure
npm install

# Desplegar infraestructura
cdk deploy --all

# Instalar y construir frontend
cd ../frontend
npm install
npm run build

# Instalar y construir admin panel
cd ../admin-panel
npm install
npm run build
```

### Configuración de Cognito
```javascript
// Configurar en ambas aplicaciones
const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_rxD1eRJLp',
      userPoolClientId: '898d3gn5iesen0psks0hbm5hd',
      loginWith: {
        email: true
      }
    }
  },
  API: {
    REST: {
      SportShopAPI: {
        endpoint: 'https://v8qfkgmjd5.execute-api.us-east-1.amazonaws.com/prod'
      }
    }
  }
};
```

## 📋 APIs Disponibles

### Productos
- `GET /products` - Listar productos
- `POST /admin/products` - Crear producto
- `PUT /admin/products/{id}` - Actualizar producto
- `DELETE /admin/products/{id}` - Eliminar producto
- `POST /admin/products/upload-url` - Generar URL de upload

### Carrito
- `GET /cart` - Obtener carrito
- `POST /cart/add` - Agregar al carrito
- `PUT /cart/update` - Actualizar cantidad
- `DELETE /cart/remove` - Remover del carrito
- `DELETE /cart/clear` - Limpiar carrito

### Pedidos
- `POST /orders` - Crear pedido
- `GET /admin/orders` - Listar pedidos (con filtros avanzados)
- `GET /admin/orders/{id}` - Detalle de pedido
- `PUT /admin/orders/{id}/complete` - Completar pedido (reduce stock)
- `DELETE /admin/orders/{id}` - Cancelar pedido

### Ventas
- `GET /admin/sales` - Listar ventas (sistema jerárquico)
- `GET /admin/sales/{id}` - Detalle de venta
- `GET /admin/sales/statistics` - Estadísticas de ventas
- `DELETE /admin/sales/{id}` - Cancelar venta (restaura stock)

## 🎯 Próximos Pasos

### Observabilidad
- [ ] CloudWatch Dashboards
- [ ] CloudTrail para auditoría
- [ ] Alertas y métricas personalizadas

### Optimización
- [ ] Lifecycle policies S3
- [ ] WAF para CloudFront
- [ ] Dominios personalizados
- [ ] Optimización de costos

### Funcionalidades
- [ ] Sistema de reseñas
- [ ] Notificaciones por email
- [x] **Integración con WhatsApp** ✅ **COMPLETADO**
- [ ] Analytics avanzados

## 🏆 Logros Arquitectónicos

✅ **Arquitectura serverless** escalable y segura  
✅ **CloudFront CDN** con HTTPS por defecto  
✅ **Interfaz jerárquica profesional** para gestión de ventas  
✅ **Sistema completo de e-commerce** con 21 APIs  
✅ **Control de acceso** basado en roles  
✅ **Infraestructura como código** reproducible  
✅ **Gestión profesional** de grandes volúmenes de datos  
✅ **Performance global** optimizada  
✅ **Filtros avanzados estilo Excel** para análisis empresarial  
✅ **Exportación de datos** para análisis externos

## 💡 Características Empresariales Destacadas

### 🔍 **Sistema de Filtros Profesional**
- **Pedidos**: Filtros estilo Excel con rangos de fecha, búsqueda de clientes, montos
- **Vista por defecto**: Últimos 7 días para optimizar performance
- **Búsqueda manual**: Para pedidos históricos cuando sea necesario

### 📊 **Interfaz Jerárquica de Ventas**
- **Navegación intuitiva**: Año → Mes → Día → Detalle
- **Estadísticas contextuales**: En cada nivel de navegación
- **Exportación CSV**: Para análisis externos y reportes
- **Diseño escalable**: Optimizado para grandes volúmenes de ventas

### 🔄 **Gestión Automática de Stock**
- **Flujo optimizado**: Pedido creado → Admin completa → Stock reducido automáticamente
- **Cancelaciones**: Sin afectar stock (solo completar pedidos reduce stock)
- **Trazabilidad completa**: Historial de cambios de stock

---

**Desarrollado con ❤️ usando AWS Solutions Architecture best practices**

**⭐ Este proyecto demuestra competencias reales de Solutions Architect y desarrollo full-stack empresarial con AWS.**

## 💰 **COSTOS OPERATIVOS AWS (Sin Free Tier)**

### 📊 **Estimación Mensual de Costos**

**Para un e-commerce con tráfico moderado (10,000 usuarios/mes):**

#### 🔧 **Compute (Lambda Functions)**
- **21 Lambda Functions**: ~$15-25 USD/mes
- **Invocaciones**: ~1M requests/mes
- **Duración promedio**: 500ms por función
- **Memoria**: 512MB por función

#### 🗄️ **Base de Datos (DynamoDB)**
- **4 Tablas**: ~$20-35 USD/mes
- **Read/Write Units**: On-demand pricing
- **Storage**: ~5GB de datos
- **Backups**: Automáticos incluidos

#### 🌐 **CDN y Storage (CloudFront + S3)**
- **CloudFront**: ~$10-20 USD/mes
- **S3 Storage**: ~$5-10 USD/mes
- **Data Transfer**: ~$5-15 USD/mes
- **Requests**: GET/PUT operations

#### 🔐 **Autenticación (Cognito)**
- **User Pool**: ~$5-10 USD/mes
- **Monthly Active Users**: Hasta 10,000
- **Authentication requests**: Incluidas

#### 🔌 **API Gateway**
- **REST API**: ~$10-15 USD/mes
- **Requests**: ~1M API calls/mes
- **Data transfer**: Incluido

#### 📊 **Monitoreo (CloudWatch)**
- **Logs**: ~$5-10 USD/mes
- **Metrics**: ~$3-5 USD/mes
- **Alarms**: ~$2-3 USD/mes

### 💵 **TOTAL ESTIMADO MENSUAL**

**🟢 Tráfico Bajo** (1,000 usuarios/mes): **$35-50 USD/mes**
- Ideal para startups o pruebas de concepto
- Escalado automático según demanda

**🟡 Tráfico Moderado** (10,000 usuarios/mes): **$75-125 USD/mes**
- Perfecto para pequeñas/medianas empresas
- Incluye todas las funcionalidades enterprise

**🔴 Tráfico Alto** (100,000 usuarios/mes): **$200-400 USD/mes**
- Empresas establecidas con alto volumen
- Performance optimizada globalmente

### 🎯 **Ventajas del Modelo Serverless**

✅ **Costos Variables**: Solo pagas por lo que usas  
✅ **Sin Infraestructura**: No hay servidores que mantener  
✅ **Escalado Automático**: Crece con tu negocio  
✅ **Alta Disponibilidad**: 99.9% uptime garantizado  
✅ **Seguridad Incluida**: AWS maneja la seguridad base  
✅ **Backups Automáticos**: Protección de datos incluida  

### 📈 **Comparación con Alternativas**

**vs Servidor Dedicado**: $200-500 USD/mes + mantenimiento  
**vs VPS Gestionado**: $100-300 USD/mes + administración  
**vs Shopify Plus**: $2,000+ USD/mes con limitaciones  

**🚀 Ahorro estimado**: 60-80% vs soluciones tradicionales

---

**🚀 PROYECTO LISTO PARA PRODUCCIÓN**



