// Configuración de WhatsApp para SportShop

export const WHATSAPP_CONFIG = {
  // Número de WhatsApp de la tienda (formato: código país + número sin +)
  // Ejemplo: Bolivia +591 72267855 = "59172267855"
  phoneNumber: "59172267855", // ✅ Número configurado para pruebas
  
  // Información de la tienda
  storeName: "SportShop",
  storeWebsite: "https://d36zsvraqkmul5.cloudfront.net",
  
  // Mensajes personalizables
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

/**
 * Genera un mensaje de WhatsApp formateado para un pedido
 * @param {Object} orderData - Datos del pedido
 * @param {string} orderData.orderId - ID único del pedido
 * @param {Array} orderData.items - Items del carrito
 * @param {Object} orderData.user - Información del usuario
 * @param {string} orderData.total - Total del pedido
 * @param {number} orderData.totalItems - Total de artículos
 * @param {string} orderData.createdAt - Fecha de creación del pedido
 * @returns {string} Mensaje formateado para WhatsApp
 */
export const generateWhatsAppOrderMessage = (orderData) => {
  const { orderId, items, user, total, totalItems, createdAt } = orderData
  const config = WHATSAPP_CONFIG
  
  let message = config.messages.orderHeader.replace('{storeName}', config.storeName) + '\n\n'
  
  // Información del pedido y cliente
  if (orderId) {
    message += `📋 *NÚMERO DE PEDIDO:* ${orderId}\n`
  }
  message += `👤 *Cliente:* ${user.signInDetails?.loginId || user.username}\n`
  
  if (createdAt) {
    const orderDate = new Date(createdAt)
    message += `📅 *Fecha:* ${orderDate.toLocaleDateString('es-ES')}\n`
    message += `🕐 *Hora:* ${orderDate.toLocaleTimeString('es-ES')}\n\n`
  } else {
    message += `📅 *Fecha:* ${new Date().toLocaleDateString('es-ES')}\n`
    message += `🕐 *Hora:* ${new Date().toLocaleTimeString('es-ES')}\n\n`
  }
  
  // Productos
  message += `🛒 *PRODUCTOS SOLICITADOS:*\n`
  message += `${'─'.repeat(30)}\n`
  
  items.forEach((item, index) => {
    message += `${index + 1}. *${item.productName}*\n`
    message += `   📦 Cantidad: ${item.quantity}\n`
    message += `   💰 Precio unitario: $${item.unitPrice || item.productPrice}\n`
    message += `   💵 Subtotal: $${item.subtotal ? parseFloat(item.subtotal).toFixed(2) : (parseFloat(item.unitPrice || item.productPrice) * item.quantity).toFixed(2)}\n`
    if (item.productCategory) {
      message += `   🏷️ Categoría: ${item.productCategory}\n`
    }
    message += `\n`
  })
  
  // Resumen
  message += `${'─'.repeat(30)}\n`
  message += `📊 *RESUMEN DEL PEDIDO:*\n`
  if (orderId) {
    message += `• Número de pedido: ${orderId}\n`
  }
  message += `• Total de artículos: ${totalItems}\n`
  message += `• *TOTAL A PAGAR: $${total}*\n\n`
  
  // Información adicional
  message += `📋 *INFORMACIÓN ADICIONAL:*\n`
  config.messages.additionalInfo.forEach(info => {
    message += info.replace('{storeWebsite}', config.storeWebsite) + '\n'
  })
  message += '\n'
  
  // Confirmación
  message += config.messages.confirmationText + '\n'
  if (orderId) {
    message += `\n🔖 *IMPORTANTE:* Menciona tu número de pedido: *${orderId}*\n`
  }
  message += '\n' + config.messages.orderFooter.replace('{storeName}', config.storeName)
  
  return message
}

/**
 * Genera la URL de WhatsApp con el mensaje
 * @param {string} message - Mensaje a enviar
 * @returns {string} URL de WhatsApp
 */
export const generateWhatsAppURL = (message) => {
  return `https://wa.me/${WHATSAPP_CONFIG.phoneNumber}?text=${encodeURIComponent(message)}`
}

/**
 * Abre WhatsApp con el mensaje del pedido
 * @param {Object} orderData - Datos del pedido
 */
export const sendOrderToWhatsApp = (orderData) => {
  const message = generateWhatsAppOrderMessage(orderData)
  const whatsappURL = generateWhatsAppURL(message)
  window.open(whatsappURL, '_blank')
}