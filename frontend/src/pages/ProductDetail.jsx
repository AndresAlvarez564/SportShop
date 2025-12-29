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
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

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
      setCurrentImageIndex(0) // Reset image index when product changes
    } catch (err) {
      console.error('Error fetching product:', err)
      setError('Producto no encontrado')
    } finally {
      setLoading(false)
    }
  }

  // Obtener imágenes del producto
  const getImages = () => {
    if (!product) return []
    
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      return product.images.sort((a, b) => (a.order || 0) - (b.order || 0))
    } else if (product.imageUrl) {
      return [{ url: product.imageUrl, alt: product.name }]
    }
    return []
  }

  const images = getImages()
  const hasMultipleImages = images.length > 1

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => prev === 0 ? images.length - 1 : prev - 1)
  }

  const goToImage = (index) => {
    setCurrentImageIndex(index)
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
      <div className="product-detail-header">
        <button onClick={() => navigate('/')} className="back-btn">
          ← Volver al Catálogo
        </button>
      </div>
      
      <div className="product-detail">
        <div className="product-detail-image">
          {images.length > 0 ? (
            <div className="product-detail-image-container">
              <img 
                src={images[currentImageIndex].url} 
                alt={images[currentImageIndex].alt || product.name} 
                className="product-detail-main-image"
              />
              
              {/* Navigation arrows for multiple images */}
              {hasMultipleImages && (
                <>
                  <button
                    className="product-detail-nav-btn prev-btn"
                    onClick={prevImage}
                    aria-label="Imagen anterior"
                  >
                    ‹
                  </button>
                  <button
                    className="product-detail-nav-btn next-btn"
                    onClick={nextImage}
                    aria-label="Siguiente imagen"
                  >
                    ›
                  </button>
                </>
              )}

              {/* Image indicators */}
              {hasMultipleImages && (
                <div className="product-detail-indicators">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      className={`product-detail-indicator ${index === currentImageIndex ? 'active' : ''}`}
                      onClick={() => goToImage(index)}
                      aria-label={`Ver imagen ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="no-image-detail">
              <span>📷</span>
              <p>Sin imagen disponible</p>
            </div>
          )}
        </div>
        
        <div className="product-detail-info">
          <div className="product-detail-category">
            {product.category} • {product.gender}
          </div>
          
          <h1 className="product-detail-name">{product.name}</h1>
          
          <p className="product-detail-description">{product.description}</p>
          
          <div className="product-detail-price-section">
            <div className="price-info">
              <span className="price-label">Precio</span>
              <span className="price-value">${product.price}</span>
            </div>
            <div className="stock-info">
              <span className="stock-label">Stock disponible</span>
              <span className="stock-value">{product.stock} unidades</span>
            </div>
          </div>
          
          {product.stock > 0 ? (
            <div className="product-detail-actions">
              <div className="quantity-section">
                <label htmlFor="quantity" className="quantity-label">Cantidad</label>
                <select 
                  id="quantity"
                  value={quantity} 
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="quantity-select"
                >
                  {[...Array(Math.min(product.stock, 10))].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>
              
              <button 
                onClick={addToCart}
                disabled={addingToCart}
                className="add-to-cart-btn-detail"
              >
                {addingToCart ? 'Agregando...' : 'Agregar al Carrito'}
              </button>
              
              {!user && (
                <div className="login-notice-detail">
                  <p>Inicia sesión para agregar al carrito</p>
                  <button onClick={() => navigate('/login')} className="login-btn">
                    Iniciar Sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="out-of-stock-detail">
              <p>Producto Agotado</p>
              <span>Este producto no está disponible actualmente</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductDetail