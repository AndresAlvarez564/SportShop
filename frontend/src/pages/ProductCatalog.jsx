import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { get } from 'aws-amplify/api'

function ProductCatalog() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedGender, setSelectedGender] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

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

  // Obtener categorías únicas
  const categories = [...new Set(products.map(p => p.category))].sort()
  const genders = [...new Set(products.map(p => p.gender))].sort()

  // Filtrar productos
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    const matchesGender = selectedGender === 'all' || product.gender === selectedGender
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesCategory && matchesGender && matchesSearch
  })

  // Agrupar productos por categoría
  const productsByCategory = categories.reduce((acc, category) => {
    acc[category] = filteredProducts.filter(p => p.category === category)
    return acc
  }, {})

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
      {/* Header del Catálogo */}
      <div className="catalog-header">
        <h1>Catálogo SportShop</h1>
        <p>Descubre nuestra colección de ropa deportiva premium</p>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="catalog-filters">
        <div className="search-section">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-section">
          <div className="filter-group">
            <label>Categoría:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="filter-select"
            >
              <option value="all">Todas las categorías</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Género:</label>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="filter-select"
            >
              <option value="all">Todos</option>
              {genders.map(gender => (
                <option key={gender} value={gender}>
                  {gender.charAt(0).toUpperCase() + gender.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-results">
            {filteredProducts.length} productos encontrados
          </div>
        </div>
      </div>

      {/* Contenido del Catálogo */}
      {filteredProducts.length === 0 ? (
        <div className="no-products">
          <h3>No se encontraron productos</h3>
          <p>Intenta ajustar los filtros o buscar otros términos</p>
          <button
            onClick={() => {
              setSelectedCategory('all')
              setSelectedGender('all')
              setSearchTerm('')
            }}
            className="btn btn-primary"
          >
            Limpiar Filtros
          </button>
        </div>
      ) : selectedCategory === 'all' && !searchTerm ? (
        // Vista por categorías (cuando no hay filtros específicos)
        <div className="categories-view">
          {categories.map(category => {
            const categoryProducts = productsByCategory[category]
            if (categoryProducts.length === 0) return null

            return (
              <CategorySection
                key={category}
                category={category}
                products={categoryProducts}
                selectedGender={selectedGender}
              />
            )
          })}
        </div>
      ) : (
        // Vista de grid simple (cuando hay filtros activos)
        <div className="filtered-view">
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CategorySection({ category, products, selectedGender }) {
  const filteredProducts = selectedGender === 'all'
    ? products
    : products.filter(p => p.gender === selectedGender)

  if (filteredProducts.length === 0) return null

  return (
    <div className="category-section">
      <div className="category-header">
        <h2 className="category-title">
          {category.charAt(0).toUpperCase() + category.slice(1)}
        </h2>
        <span className="category-count">
          {filteredProducts.length} productos
        </span>
      </div>

      <div className="product-grid">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}

function ProductCard({ product }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Obtener imágenes del producto
  const getImages = () => {
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

  return (
    <div className="product-card">
      <div className="product-image">
        {images.length > 0 ? (
          <>
            <img 
              src={images[currentImageIndex].url} 
              alt={images[currentImageIndex].alt || product.name} 
            />
            
            {/* Navigation arrows for multiple images */}
            {hasMultipleImages && (
              <>
                <button
                  className="image-nav-btn prev-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    prevImage()
                  }}
                  aria-label="Imagen anterior"
                >
                  ‹
                </button>
                <button
                  className="image-nav-btn next-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    nextImage()
                  }}
                  aria-label="Siguiente imagen"
                >
                  ›
                </button>
              </>
            )}

            {/* Image indicators */}
            {hasMultipleImages && (
              <div className="image-indicators">
                {images.map((_, index) => (
                  <button
                    key={index}
                    className={`image-indicator ${index === currentImageIndex ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      goToImage(index)
                    }}
                    aria-label={`Ver imagen ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="no-image">
            <span>📷</span>
            <p>Sin imagen</p>
          </div>
        )}

        {/* Badge de stock bajo */}
        {product.stock <= 5 && product.stock > 0 && (
          <div className="stock-badge low-stock">
            ¡Últimas {product.stock}!
          </div>
        )}

        {/* Badge de sin stock */}
        {product.stock === 0 && (
          <div className="stock-badge out-of-stock">
            Agotado
          </div>
        )}
      </div>

      <div className="product-info">
        <div className="product-category-badge">
          {product.category} • {product.gender}
        </div>

        <h3 className="product-name">{product.name}</h3>

        {product.description && (
          <p className="product-description">
            {product.description.length > 80
              ? product.description.substring(0, 80) + '...'
              : product.description
            }
          </p>
        )}

        <div className="product-footer">
          <div className="product-price">
            <span className="price-label">Precio:</span>
            <span className="price-value">${product.price}</span>
          </div>

          <div className="product-actions">
            <Link
              to={`/products/${product.id}`}
              className="btn btn-primary"
            >
              Ver Detalles
            </Link>
          </div>
        </div>

        {/* Rating si existe */}
        {product.averageRating > 0 && (
          <div className="product-rating">
            <span className="stars">
              {'★'.repeat(Math.floor(product.averageRating))}
              {'☆'.repeat(5 - Math.floor(product.averageRating))}
            </span>
            <span className="rating-text">
              ({product.reviewCount} reseñas)
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductCatalog