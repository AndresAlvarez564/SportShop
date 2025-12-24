# TiendaRopa - E-commerce Web Application

## 📋 Descripción del Proyecto

Aplicación web tipo tienda de ropa diseñada para mostrar productos a clientes y servir como proyecto de aprendizaje para Solutions Architect en AWS.

## 🎯 Objetivos

- Construir una tienda online funcional
- Implementar arquitectura escalable en AWS
- Aplicar mejores prácticas de Solutions Architecture
- Mantener costos optimizados

## 👥 Usuarios y Roles

- **Visitante/Cliente**: Ver catálogo, buscar productos, ver detalles, contactar
- **Cliente Autenticado**: Realizar compras y dejar reseñas
- **Administrador**: Gestionar productos, precios, pedidos y mensajes

## ⚡ Funcionalidades MVP

- ✅ Catálogo de productos (visualización pública)
- ✅ Carrito de compras
- ✅ Sistema de login/registro
- ✅ Formulario de contacto
- ✅ Sistema de reseñas

## 💳 Modelo de Compra

- Registro de pedidos sin pago online
- Derivación a WhatsApp para coordinación directa
- Gestión de pago fuera de la plataforma web

## 🏗️ Arquitectura

### Principios de Diseño
- **Escalabilidad automática**
- **Servicios administrados** (evitar gestión de servidores)
- **Alta disponibilidad** con enfoque en costo-beneficio
- **Seguridad** con HTTPS y autenticación

### Tecnologías Planificadas
- Frontend: React/Next.js
- Backend: AWS Lambda + API Gateway
- Base de datos: DynamoDB
- Almacenamiento: S3 + CloudFront
- Autenticación: AWS Cognito

## 🔒 Seguridad

- Tráfico HTTPS obligatorio
- Autenticación para compras y reseñas
- Separación de roles (Admin vs Cliente)
- Protección de datos sensibles

## 📊 Observabilidad

- ✅ Monitoreo con CloudWatch
- ✅ Logs centralizados
- ✅ Alertas críticas (email/WhatsApp)
- ❌ Backups automáticos (desactivados por costo)

## 💰 Enfoque de Costos

- Prioridad en **costo mínimo**
- Uso de **Free Tier** cuando sea posible
- Escalabilidad sin sobrecostos innecesarios
- Servicios pay-per-use

## 🚀 Roadmap

### Fase 1: MVP
- [ ] Configuración de infraestructura básica
- [ ] Frontend con catálogo
- [ ] Sistema de autenticación
- [ ] Carrito básico

### Fase 2: Funcionalidades Core
- [ ] Sistema de pedidos
- [ ] Integración con WhatsApp
- [ ] Panel de administración
- [ ] Sistema de reseñas

### Fase 3: Optimización
- [ ] CDN para imágenes
- [ ] Optimización de performance
- [ ] Monitoreo avanzado
- [ ] Pruebas de carga

## 📁 Estructura del Proyecto

```
TiendaRopa/
├── contexto              # Documentación de requisitos
├── frontend/            # Aplicación React/Next.js
├── backend/             # Funciones Lambda
├── infrastructure/      # Código IaC (CloudFormation/CDK)
└── docs/               # Documentación adicional
```

## 🛠️ Instalación y Desarrollo

```bash
# Clonar repositorio
git clone https://github.com/[usuario]/TiendaRopa.git
cd TiendaRopa

# Instalar dependencias (cuando se agreguen)
npm install

# Ejecutar en desarrollo
npm run dev
```

## 📝 Contribución

Este es un proyecto de aprendizaje. Las contribuciones son bienvenidas siguiendo las mejores prácticas de desarrollo.

## 📄 Licencia

MIT License - Ver archivo LICENSE para más detalles.