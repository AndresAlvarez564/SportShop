import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { get } from 'aws-amplify/api'

function ProductCatalog() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await get({
        apiName: 'SportShopAPI',
        path: '/products'
      }).response
      
      const data = await response.body.json()
      setProducts(data.products || [])
    } catch (err) {
      console.error('Error fetching products:', err)
      setError('Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Cargando productos...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchProducts} className="btn btn-primary">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <h1>Catálogo de Productos</h1>
      <p>Descubre nuestra colección de ropa deportiva</p>
      
      {products.length === 0 ? (
        <div className="no-products">
          <h3>No hay productos disponibles</h3>
          <p>Vuelve pronto para ver nuestras novedades</p>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProductCard({ product }) {
  return (
    <div className="product-card">
      <div className="product-image">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} />
        ) : (
          <span>Sin imagen</span>
        )}
      </div>
      
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-category">{product.category} - {product.gender}</p>
        <p className="product-price">${product.price}</p>
        
        <div className="product-actions">
          <Link 
            to={`/products/${product.id}`} 
            className="btn btn-primary"
          >
            Ver Detalles
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ProductCatalog