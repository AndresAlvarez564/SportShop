import React, { useState, useEffect } from 'react';
import { get } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';

const ProductCatalog = ({ onAddToCart, user }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Estados de filtros
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    gender: 'all',
    priceRange: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  // Categorías disponibles
  const categories = [
    { value: 'all', label: 'Todas las categorías' },
    { value: 'camisetas', label: 'Camisetas' },
    { value: 'pantalones', label: 'Pantalones' },
    { value: 'shorts', label: 'Shorts' },
    { value: 'hoodies', label: 'Hoodies' },
    { value: 'accesorios', label: 'Accesorios' }
  ];

  const genders = [
    { value: 'all', label: 'Todos' },
    { value: 'hombre', label: 'Hombre' },
    { value: 'mujer', label: 'Mujer' },
    { value: 'unisex', label: 'Unisex' }
  ];

  const priceRanges = [
    { value: 'all', label: 'Todos los precios' },
    { value: '0-25', label: '$0 - $25' },
    { value: '25-50', label: '$25 - $50' },
    { value: '50-100', label: '$50 - $100' },
    { value: '100+', label: '$100+' }
  ];

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [products, filters]);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await get({
        apiName: 'SportShopAPI',
        path: '/products'
      }).response;
      
      const data = await response.body.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Error al cargar productos. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...products];

    // Filtro de búsqueda
    if (filters.search) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        product.description.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Filtro de categoría
    if (filters.category !== 'all') {
      filtered = filtered.filter(product => product.category === filters.category);
    }

    // Filtro de género
    if (filters.gender !== 'all') {
      filtered = filtered.filter(product => product.gender === filters.gender);
    }

    // Filtro de precio
    if (filters.priceRange !== 'all') {
      const [min, max] = filters.priceRange.split('-').map(p => p.replace('+', ''));
      filtered = filtered.filter(product => {
        if (max) {
          return product.price >= parseFloat(min) && product.price <= parseFloat(max);
        } else {
          return product.price >= parseFloat(min);
        }
      });
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'stock':
          aValue = a.stock;
          bValue = b.stock;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (filters.sortOrder === 'desc') {
        return aValue < bValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    setFilteredProducts(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleAddToCart = async (product) => {
    if (!user) {
      alert('Debes iniciar sesión para agregar productos al carrito');
      return;
    }

    try {
      const session = await fetchAuthSession();
      const headers = {
        Authorization: `Bearer ${session.tokens.idToken.toString()}`
      };

      await onAddToCart(product, headers);
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Error al agregar al carrito');
    }
  };

  const openProductDetail = (product) => {
    setSelectedProduct(product);
  };

  const closeProductDetail = () => {
    setSelectedProduct(null);
  };

  // Agrupar productos por categoría para mostrar secciones
  const productsByCategory = categories.slice(1).reduce((acc, category) => {
    const categoryProducts = filteredProducts.filter(p => p.category === category.value);
    if (categoryProducts.length > 0) {
      acc[category.value] = {
        label: category.label,
        products: categoryProducts
      };
    }
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="catalog-loading">
        <div className="loading-spinner">⏳</div>
        <p>Cargando productos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="catalog-error">
        <div className="error-icon">❌</div>
        <p>{error}</p>
        <button onClick={fetchProducts} className="retry-btn">
          🔄 Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="product-catalog">
      {/* Hero Section */}
      <section className="catalog-hero">
        <div className="hero-content">
          <h1>🏪 Catálogo de Productos</h1>
          <p>Descubre nuestra colección de ropa deportiva de alta calidad</p>
        </div>
      </section>

      {/* Filters Section */}
      <section className="filters-section">
        <div className="filters-container">
          <div className="filters-header">
            <h3>🔍 Filtros</h3>
            <span className="results-count">
              {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="filters-grid">
            {/* Búsqueda */}
            <div className="filter-group">
              <input
                type="text"
                placeholder="🔍 Buscar productos..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="search-input"
              />
            </div>

            {/* Categoría */}
            <div className="filter-group">
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="filter-select"
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Género */}
            <div className="filter-group">
              <select
                value={filters.gender}
                onChange={(e) => handleFilterChange('gender', e.target.value)}
                className="filter-select"
              >
                {genders.map(gender => (
                  <option key={gender.value} value={gender.value}>
                    {gender.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Precio */}
            <div className="filter-group">
              <select
                value={filters.priceRange}
                onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                className="filter-select"
              >
                {priceRanges.map(range => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Ordenamiento */}
            <div className="filter-group">
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="filter-select"
              >
                <option value="name">Ordenar por nombre</option>
                <option value="price">Ordenar por precio</option>
                <option value="stock">Ordenar por stock</option>
              </select>
            </div>

            {/* Orden */}
            <div className="filter-group">
              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                className="filter-select"
              >
                <option value="asc">Ascendente</option>
                <option value="desc">Descendente</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="products-section">
        <div className="products-container">
          {filters.category === 'all' && Object.keys(productsByCategory).length > 0 ? (
            // Mostrar por categorías cuando no hay filtro específico
            Object.entries(productsByCategory).map(([categoryKey, categoryData]) => (
              <div key={categoryKey} className="category-section">
                <div className="category-header">
                  <h2>{categoryData.label}</h2>
                  <div className="category-line"></div>
                </div>
                <div className="products-grid">
                  {categoryData.products.map(product => (
                    <ProductCard
                      key={product.productId}
                      product={product}
                      onAddToCart={handleAddToCart}
                      onViewDetail={openProductDetail}
                      user={user}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Mostrar todos los productos filtrados
            <div className="category-section">
              <div className="products-grid">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.productId}
                    product={product}
                    onAddToCart={handleAddToCart}
                    onViewDetail={openProductDetail}
                    user={user}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredProducts.length === 0 && (
            <div className="no-products">
              <div className="no-products-icon">📦</div>
              <h3>No se encontraron productos</h3>
              <p>Intenta ajustar los filtros para encontrar lo que buscas</p>
            </div>
          )}
        </div>
      </section>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={closeProductDetail}
          onAddToCart={handleAddToCart}
          user={user}
        />
      )}
    </div>
  );
};

// Componente de tarjeta de producto
const ProductCard = ({ product, onAddToCart, onViewDetail, user }) => {
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= 10;

  return (
    <div className="product-card">
      <div className="product-image-container">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name}
            className="product-image"
            onClick={() => onViewDetail(product)}
          />
        ) : (
          <div className="product-no-image" onClick={() => onViewDetail(product)}>
            📷
          </div>
        )}
        
        {/* Stock Badge */}
        <div className={`stock-badge ${isOutOfStock ? 'out-of-stock' : isLowStock ? 'low-stock' : 'in-stock'}`}>
          {isOutOfStock ? 'Agotado' : isLowStock ? 'Últimas unidades' : 'Disponible'}
        </div>

        {/* Quick View Button */}
        <button 
          className="quick-view-btn"
          onClick={() => onViewDetail(product)}
        >
          👁️ Vista rápida
        </button>
      </div>

      <div className="product-info">
        <div className="product-category">{product.category}</div>
        <h3 className="product-name">{product.name}</h3>
        <p className="product-description">{product.description}</p>
        
        <div className="product-details">
          <span className="product-gender">{product.gender}</span>
          <span className="product-stock">Stock: {product.stock}</span>
        </div>

        <div className="product-footer">
          <div className="product-price">${product.price}</div>
          <button 
            className={`add-to-cart-btn ${isOutOfStock ? 'disabled' : ''}`}
            onClick={() => onAddToCart(product)}
            disabled={isOutOfStock || !user}
          >
            {!user ? '🔒 Inicia sesión' : isOutOfStock ? '❌ Agotado' : '🛒 Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal de detalle del producto
const ProductDetailModal = ({ product, onClose, onAddToCart, user }) => {
  const isOutOfStock = product.stock === 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="product-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="modal-content">
          <div className="product-detail-image">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} />
            ) : (
              <div className="no-image-large">📷</div>
            )}
          </div>
          
          <div className="product-detail-info">
            <div className="product-detail-category">{product.category}</div>
            <h2 className="product-detail-name">{product.name}</h2>
            <p className="product-detail-description">{product.description}</p>
            
            <div className="product-detail-specs">
              <div className="spec-item">
                <span className="spec-label">Género:</span>
                <span className="spec-value">{product.gender}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Stock disponible:</span>
                <span className="spec-value">{product.stock} unidades</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Categoría:</span>
                <span className="spec-value">{product.category}</span>
              </div>
            </div>
            
            <div className="product-detail-price">${product.price}</div>
            
            <div className="product-detail-actions">
              <button 
                className={`add-to-cart-btn-large ${isOutOfStock ? 'disabled' : ''}`}
                onClick={() => {
                  onAddToCart(product);
                  onClose();
                }}
                disabled={isOutOfStock || !user}
              >
                {!user ? '🔒 Inicia sesión para comprar' : 
                 isOutOfStock ? '❌ Producto agotado' : 
                 '🛒 Agregar al carrito'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCatalog;