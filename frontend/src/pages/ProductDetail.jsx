import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { get, post } from 'aws-amplify/api'
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth'

function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [addingToCart, setAddingToCart] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetchProduct()
    checkUser()
  }, [id])

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      setUser(null)
    }
  }

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const response = await get({
        apiName: 'SportShopAPI',
        path: `/products/${id}`
      }).response
      
      const data = await response.body.json()
      setProduct(data.product)
    } catch (err) {
      console.error('Error fetching product:', err)
      setError('Producto no encontrado')
    } finally {
      setLoading(false)
    }
  }

  const addToCart = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    try {
      setAddingToCart(true)
      
      // Obtener el token de autenticación
      const session = await fetchAuthSession()
      const token = session.tokens?.idToken?.toString()

      const restOperation = post({
        apiName: 'SportShopAPI',
        path: '/cart',
        options: {
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: {
            productId: product.id,
            quantity: quantity
          }
        }
      })

      const { body } = await restOperation.response
      const result = await body.json()
      
      console.log('Resultado:', result)
      
      // Si llegamos aquí sin error, fue exitoso
      alert('¡Producto agregado al carrito exitosamente!')
      
    } catch (err) {
      console.error('Error adding to cart:', err)
      
      // Verificar si es un error de respuesta HTTP
      if (err.response) {
        const errorBody = await err.response.body.json()
        alert('Error: ' + (errorBody.message || 'Error desconocido'))
      } else {
        alert('Error al agregar al carrito: ' + err.message)
      }
    } finally {
      setAddingToCart(false)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Cargando producto...</div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container">
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Volver al Catálogo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <button onClick={() => navigate('/')} className="btn btn-outline">
        ← Volver al Catálogo
      </button>
      
      <div className="product-detail">
        <div className="product-detail-image">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} />
          ) : (
            <div className="no-image">Sin imagen disponible</div>
          )}
        </div>
        
        <div className="product-detail-info">
          <h1>{product.name}</h1>
          <p className="product-category">{product.category} - {product.gender}</p>
          <p className="product-description">{product.description}</p>
          
          <div className="product-price-section">
            <span className="product-price">${product.price}</span>
            <span className="product-stock">Stock: {product.stock} unidades</span>
          </div>
          
          {product.stock > 0 ? (
            <div className="add-to-cart-section">
              <div className="quantity-selector">
                <label htmlFor="quantity">Cantidad:</label>
                <select 
                  id="quantity"
                  value={quantity} 
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                >
                  {[...Array(Math.min(product.stock, 10))].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>
              
              <button 
                onClick={addToCart}
                disabled={addingToCart}
                className="btn btn-primary add-to-cart-btn"
              >
                {addingToCart ? 'Agregando...' : 'Agregar al Carrito'}
              </button>
              
              {!user && (
                <p className="login-notice">
                  <button onClick={() => navigate('/login')} className="btn btn-outline">
                    Inicia sesión
                  </button> para agregar al carrito
                </p>
              )}
            </div>
          ) : (
            <div className="out-of-stock">
              <p>Producto agotado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductDetail