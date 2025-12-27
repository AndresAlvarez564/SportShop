import { useState, useEffect } from 'react'
import { get, post, del, put } from 'aws-amplify/api'
import { fetchAuthSession } from 'aws-amplify/auth'

function Cart({ user }) {
  const [cartItems, setCartItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updating, setUpdating] = useState({})

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
      const headers = await getAuthHeaders()
      
      const restOperation = post({
        apiName: 'SportShopAPI',
        path: '/orders',
        options: { headers }
      })

      const { body } = await restOperation.response
      const result = await body.json()
      
      console.log('Create order result:', result)
      
      alert('¡Pedido creado exitosamente! Te contactaremos por WhatsApp.')
      setCartItems([]) // Limpiar carrito
      
    } catch (err) {
      console.error('Error creating order:', err)
      alert('Error al crear pedido')
    }
  }

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (parseFloat(item.productPrice) * item.quantity)
    }, 0).toFixed(2)
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
      <h1>Mi Carrito</h1>
      
      {cartItems.length === 0 ? (
        <div className="empty-cart">
          <h3>Tu carrito está vacío</h3>
          <p>Agrega algunos productos para comenzar</p>
          <a href="/" className="btn btn-primary">Ver Catálogo</a>
        </div>
      ) : (
        <div className="cart-container">
          <div className="cart-items">
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
          
          <div className="cart-summary">
            <div className="cart-total">
              <strong>Total: ${calculateTotal()}</strong>
            </div>
            
            <button 
              onClick={createOrder}
              className="btn btn-primary checkout-btn"
            >
              Crear Pedido (WhatsApp)
            </button>
            
            <p className="checkout-notice">
              Al crear el pedido, te contactaremos por WhatsApp para coordinar el pago y entrega.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function CartItem({ item, onUpdateQuantity, onRemove, updating }) {
  return (
    <div className="cart-item">
      <div className="cart-item-info">
        <h4>{item.productName}</h4>
        <p className="cart-item-category">{item.productCategory}</p>
        <p className="cart-item-price">${item.productPrice}</p>
      </div>
      
      <div className="cart-item-controls">
        <div className="quantity-controls">
          <button 
            onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
            disabled={updating || item.quantity <= 1}
            className="btn btn-outline quantity-btn"
            title="Disminuir cantidad"
          >
            -
          </button>
          <span className="quantity-display">{item.quantity}</span>
          <button 
            onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
            disabled={updating}
            className="btn btn-outline quantity-btn"
            title="Aumentar cantidad"
          >
            +
          </button>
        </div>
        
        <button 
          onClick={() => onRemove(item.productId)}
          disabled={updating}
          className="btn remove-btn"
          title="Eliminar producto"
        >
          {updating ? 'Eliminando...' : '🗑️ Eliminar'}
        </button>
      </div>
      
      <div className="cart-item-subtotal">
        <strong>${(parseFloat(item.productPrice) * item.quantity).toFixed(2)}</strong>
      </div>
    </div>
  )
}

export default Cart