# 📱 Configuración de WhatsApp para SportShop

## 🎯 Funcionalidad Implementada

El sistema ahora permite que los clientes envíen sus pedidos directamente a WhatsApp con un mensaje estructurado que incluye:

- ✅ **Información del cliente** (email/username)
- ✅ **Fecha y hora del pedido**
- ✅ **Lista detallada de productos** con cantidades y precios
- ✅ **Resumen del pedido** con total
- ✅ **Información adicional** (envío gratis, pago contra entrega)
- ✅ **Mensaje de confirmación** profesional

## ⚙️ Configuración del Número de WhatsApp

### 📍 Ubicación del archivo de configuración:
```
frontend/src/config/whatsapp.js
```

### 🔧 Cambiar el número de WhatsApp:

1. **Abrir el archivo** `frontend/src/config/whatsapp.js`

2. **Modificar la línea 6:**
```javascript
phoneNumber: "573001234567", // ⚠️ CAMBIAR POR EL NÚMERO REAL
```

3. **Formato del número:**
   - ❌ **Incorrecto**: `+57 300 123 4567`
   - ❌ **Incorrecto**: `57 300 123 4567`
   - ✅ **Correcto**: `573001234567`

### 🌍 Ejemplos por país:

| País | Formato | Ejemplo |
|------|---------|---------|
| 🇧🇴 Bolivia | `591XXXXXXXX` | `59172267855` |
| 🇨🇴 Colombia | `57XXXXXXXXX` | `573001234567` |
| 🇲🇽 México | `52XXXXXXXXXX` | `525512345678` |
| 🇦🇷 Argentina | `54XXXXXXXXXX` | `541123456789` |
| 🇪🇸 España | `34XXXXXXXXX` | `34612345678` |
| 🇺🇸 Estados Unidos | `1XXXXXXXXXX` | `15551234567` |

## 🎨 Personalización del Mensaje

### 📝 Cambiar información de la tienda:

```javascript
export const WHATSAPP_CONFIG = {
  phoneNumber: "TU_NUMERO_AQUI",
  
  // Personalizar información de la tienda
  storeName: "Tu Tienda Deportiva",
  storeWebsite: "https://tu-dominio.com",
  
  // Personalizar mensajes
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
}
```

## 🚀 Cómo Funciona

### 👤 **Experiencia del Cliente:**

1. **Cliente agrega productos** al carrito
2. **Hace clic en "Crear Pedido (WhatsApp)"**
3. **Se abre WhatsApp** automáticamente con el mensaje pre-formateado
4. **Cliente envía el mensaje** y puede agregar su dirección
5. **Tienda recibe el pedido** completo por WhatsApp

### 📱 **Ejemplo de mensaje generado:**

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
   🏷️ Categoría: camisetas

2. *Pantalones de Entrenamiento*
   📦 Cantidad: 1
   💰 Precio unitario: $65.99
   💵 Subtotal: $65.99
   🏷️ Categoría: pantalones

──────────────────────────────
📊 *RESUMEN DEL PEDIDO:*
• Total de artículos: 3
• *TOTAL A PAGAR: $157.97*

📋 *INFORMACIÓN ADICIONAL:*
• 🚚 Envío: GRATIS
• 💳 Pago: Contra entrega disponible
• 🌐 Web: https://d36zsvraqkmul5.cloudfront.net

✅ *Por favor confirma tu pedido y proporciona tu dirección de entrega.*

¡Gracias por elegir SportShop! 🙌
```

## 🔄 Desplegar los Cambios

### 1️⃣ **Después de configurar el número:**

```bash
cd frontend

# Build del frontend actualizado
npm run build

# Subir a S3
aws s3 sync dist/ s3://sportshop-dev-v2-website-v2 --delete

# Invalidar caché de CloudFront
aws cloudfront create-invalidation --distribution-id EUZXYKLM1PVJP --paths "/*"
```

### 2️⃣ **Verificar funcionamiento:**

1. Ir a https://d36zsvraqkmul5.cloudfront.net
2. Agregar productos al carrito
3. Hacer clic en "Crear Pedido (WhatsApp)"
4. Verificar que se abre WhatsApp con el mensaje correcto

## 🛠️ Troubleshooting

### ❓ **Problemas Comunes:**

**WhatsApp no se abre:**
- ✅ Verificar que el número esté en formato correcto (sin + ni espacios)
- ✅ Probar el número manualmente: `https://wa.me/TU_NUMERO`

**Mensaje se ve mal formateado:**
- ✅ WhatsApp Web puede mostrar diferente que la app móvil
- ✅ Los asteriscos (*) crean texto en negrita
- ✅ Los emojis mejoran la legibilidad

**Error al generar mensaje:**
- ✅ Verificar que hay productos en el carrito
- ✅ Revisar la consola del navegador para errores
- ✅ Verificar que el usuario esté autenticado

### 🔍 **Testing:**

```javascript
// Probar la función directamente en la consola del navegador
import { generateWhatsAppURL } from './src/config/whatsapp'

const testMessage = "Hola, este es un mensaje de prueba"
const url = generateWhatsAppURL(testMessage)
console.log(url)
window.open(url, '_blank')
```

## 📈 Beneficios de esta Implementación

### ✅ **Para la Tienda:**
- **Comunicación directa** con clientes
- **Pedidos estructurados** y fáciles de procesar
- **No requiere integración compleja** de pagos
- **Flexibilidad** para negociar precios/envío

### ✅ **Para los Clientes:**
- **Proceso familiar** (todos usan WhatsApp)
- **Comunicación inmediata** con la tienda
- **Pueden hacer preguntas** antes de confirmar
- **Pago contra entrega** disponible

### ✅ **Técnicamente:**
- **Sin costos adicionales** de APIs de pago
- **Implementación simple** y robusta
- **Compatible** con todos los dispositivos
- **Fácil de mantener** y personalizar

## 🎯 Próximas Mejoras Sugeridas

1. **Agregar botón de "Cotizar"** para consultas sin compromiso
2. **Incluir imágenes** de productos en el mensaje (si WhatsApp lo soporta)
3. **Tracking de pedidos** con números únicos
4. **Integración con CRM** para gestionar conversaciones
5. **Plantillas de respuesta** automáticas para la tienda

---

**💡 Tip:** Mantén el número de WhatsApp siempre actualizado y asegúrate de que esté disponible durante horarios comerciales para brindar la mejor experiencia al cliente.