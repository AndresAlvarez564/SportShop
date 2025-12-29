import { useState, useEffect } from 'react'
import { get, post, del, put } from 'aws-amplify/api'
import { fetchAuthSession } from 'aws-amplify/auth'
import { sendOrderToWhatsApp } from '../config/whatsapp'

function Cart({ user }) {
  const [cartItems, setCartItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updating, setUpdating] = useState({})
  const [processingOrder, setProcessingOrder] = useState(false)

  useEffect(() => {
    if (user) {
      fetchCart()
    }
  }, [user])

  const getAuthHeaders = async () => {
    const session = await fetchAuthSession()
    const token = session.tokens?.idToken?.toString()
    return {
      Authorization: `Bearer ${token}`
    }
  }

  const fetchCart = async () => {
    try {
      setLoading(true)
      console.log('Fetching cart for user:', user)
      
      const headers = await getAuthHeaders()
      console.log('Auth headers:', headers)
      
      const restOperation = get({
        apiName: 'SportShopAPI',
        path: '/cart',
        options: { headers }
      })
      
      const { body } = await restOperation.response
      const data = await body.json()
      console.log('Cart data received:', data)
      
      // La respuesta viene en data.cart.items, no en data.cartItems
      const items = data.cart?.items || []
      console.log('Cart items:', items)
      
      setCartItems(items)
    } catch (err) {
      console.error('Error fetching cart:', err)
      setError('Error al cargar el carrito')
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) return

    try {
      setUpdating(prev => ({ ...prev, [productId]: true }))
      const headers = await getAuthHeaders()
      
      const restOperation = put({
        apiName: 'SportShopAPI',
        path: `/cart/${productId}`,
        options: {
          headers,
          body: { quantity: newQuantity }
        }
      })

      const { body } = await restOperation.response
      const result = await body.json()
      
      console.log('Update quantity result:', result)
      
      // Actualizar el estado local
      setCartItems(prev => 
        prev.map(item => 
          item.productId === productId 
            ? { ...item, quantity: newQuantity }
            : item
        )
      )
      
    } catch (err) {
      console.error('Error updating quantity:', err)
      alert('Error al actualizar cantidad')
    } finally {
      setUpdating(prev => ({ ...prev, [productId]: false }))
    }
  }

  const removeFromCart = async (productId) => {
    try {
      setUpdating(prev => ({ ...prev, [productId]: true }))
      const headers = await getAuthHeaders()
      
      const restOperation = del({
        apiName: 'SportShopAPI',
        path: `/cart/${productId}`,
        options: { headers }
      })

      const { body } = await restOperation.response
      const result = await body.json()
      
      console.log('Remove from cart result:', result)
      
      // Remover del estado local
      setCartItems(prev => prev.filter(item => item.productId !== productId))
      
    } catch (err) {
      console.error('Error removing from cart:', err)
      alert('Error al eliminar producto')
    } finally {
      setUpdating(prev => ({ ...prev, [productId]: false }))
    }
  }

  const createOrder = async () => {
    if (cartItems.length === 0) return

    try {
      setProcessingOrder(true)
      
      // Crear el pedido en la base de datos primero
      const headers = await getAuthHeaders()
      
      const restOperation = post({
        apiName: 'SportShopAPI',
        path: '/orders',
        options: { headers }
      })

      const { body } = await restOperation.response
      const result = await body.json()
      
      console.log('Order created in database:', result)
      
      if (result.order && result.order.orderId) {
        // Preparar datos del pedido para WhatsApp con ORDER ID
        const orderData = {
          orderId: result.order.orderId,
          items: result.order.items || cartItems,
          user: user,
          total: result.order.totalAmount || calculateTotal(),
          totalItems: result.order.totalQuantity || getTotalItems(),
          createdAt: result.order.createdAt
        }
        
        // Enviar pedido a WhatsApp con ORDER ID
        sendOrderToWhatsApp(orderData)
        
        // Mostrar mensaje de éxito con ORDER ID
        alert(`¡Pedido creado exitosamente!\n\nNúmero de pedido: ${result.order.orderId}\n\nSe abrirá WhatsApp para enviar tu pedido. Guarda el número de pedido para referencia.`)
        
        // Limpiar carrito después de crear pedido exitosamente
        setCartItems([])
      } else {
        throw new Error('No se pudo obtener el ID del pedido')
      }
      
    } catch (err) {
      console.error('Error creating order:', err)
      
      // Mostrar error específico si está disponible
      const errorMessage = err.response?.body ? 
        JSON.parse(err.response.body).message : 
        'Error al crear pedido. Por favor intenta nuevamente.'
      
      alert(`Error: ${errorMessage}`)
    } finally {
      setProcessingOrder(false)
    }
  }

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (parseFloat(item.productPrice) * item.quantity)
    }, 0).toFixed(2)
  }

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0)
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Cargando carrito...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchCart} className="btn btn-primary">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="cart-header">
        <div className="cart-title-section">
          <h1 className="cart-title">Carrito</h1>
          <p className="cart-subtitle">Revisa tus productos seleccionados</p>
        </div>
        {cartItems.length > 0 && (
          <div className="cart-summary-header">
            <span className="items-count">{getTotalItems()} {getTotalItems() === 1 ? 'artículo' : 'artículos'}</span>
            <span className="total-preview">${calculateTotal()}</span>
          </div>
        )}
      </div>
      
      {cartItems.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-cart-content">
            <div className="empty-cart-icon">🛒</div>
            <h3 className="empty-cart-title">Carrito Vacío</h3>
            <p className="empty-cart-text">Descubre nuestra colección de ropa deportiva</p>
            <a href="/" className="empty-cart-btn">
              Explorar Catálogo
            </a>
          </div>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items-section">
            <div className="cart-items-header">
              <h2 className="cart-section-title">Productos</h2>
              <span className="cart-items-count">{cartItems.length} {cartItems.length === 1 ? 'producto' : 'productos'}</span>
            </div>
            <div className="cart-items-list">
              {cartItems.map((item) => (
                <CartItem 
                  key={item.productId}
                  item={item}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeFromCart}
                  updating={updating[item.productId]}
                />
              ))}
            </div>
          </div>
          
          <div className="cart-sidebar">
            <div className="cart-summary-card">
              <h3 className="summary-title">Resumen</h3>
              
              <div className="summary-details">
                <div className="summary-line">
                  <span>Subtotal</span>
                  <span>${calculateTotal()}</span>
                </div>
                
                <div className="summary-line">
                  <span>Envío</span>
                  <span className="free-shipping">Gratis</span>
                </div>
                
                <div className="summary-divider"></div>
                
                <div className="summary-total">
                  <span>Total</span>
                  <span>${calculateTotal()}</span>
                </div>
              </div>
              
              <button 
                onClick={createOrder}
                disabled={processingOrder}
                className="checkout-btn"
              >
                {processingOrder ? (
                  <>
                    <span className="loading-spinner"></span>
                    Procesando...
                  </>
                ) : (
                  'Crear Pedido'
                )}
              </button>
              
              <div className="checkout-info">
                <div className="info-item">
                  <span>📱 Contacto por WhatsApp</span>
                </div>
                <div className="info-item">
                  <span>🚚 Envío gratuito</span>
                </div>
                <div className="info-item">
                  <span>💳 Pago contra entrega</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CartItem({ item, onUpdateQuantity, onRemove, updating }) {
  return (
    <div className="cart-item-card">
      <div className="cart-item-image">
        {item.productImageUrl ? (
          <img src={item.productImageUrl} alt={item.productName} />
        ) : (
          <div className="no-image-placeholder">
            <span>📷</span>
          </div>
        )}
      </div>
      
      <div className="cart-item-details">
        <div className="cart-item-info">
          <div className="product-category">{item.productCategory}</div>
          <h4 className="product-name">{item.productName}</h4>
          <div className="product-price">
            <span className="price-value">${item.productPrice}</span>
          </div>
        </div>
        
        <div className="cart-item-actions">
          <div className="quantity-section">
            <span className="quantity-label">Cantidad</span>
            <div className="quantity-controls">
              <button 
                onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                disabled={updating || item.quantity <= 1}
                className="quantity-btn decrease"
                aria-label="Disminuir cantidad"
              >
                −
              </button>
              <span className="quantity-display">{item.quantity}</span>
              <button 
                onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                disabled={updating}
                className="quantity-btn increase"
                aria-label="Aumentar cantidad"
              >
                +
              </button>
            </div>
          </div>
          
          <button 
            onClick={() => onRemove(item.productId)}
            disabled={updating}
            className="remove-btn"
            aria-label="Eliminar producto"
          >
            {updating ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
      
      <div className="cart-item-subtotal">
        <div className="subtotal-label">Subtotal</div>
        <div className="subtotal-value">${(parseFloat(item.productPrice) * item.quantity).toFixed(2)}</div>
      </div>
    </div>
  )
}

export default Cart