import { useState, useEffect } from 'react'
import { get, post, put, del } from 'aws-amplify/api'
import { fetchAuthSession } from 'aws-amplify/auth'

function AdminPanel({ user }) {
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [accessDenied, setAccessDenied] = useState(false)
  
  // Estados para filtros
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    gender: 'all',
    stockStatus: 'all',
    priceRange: 'all'
  })
  
  // Estados para ordenamiento
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  
  // Estados para vista
  const [viewMode, setViewMode] = useState('grid') // 'grid' o 'table'
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    gender: '',
    stock: '',
    imageUrl: ''
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    applyFiltersAndSort()
  }, [products, filters, sortBy, sortOrder])

  const getAuthHeaders = async () => {
    const session = await fetchAuthSession()
    const token = session.tokens?.idToken?.toString()
    return {
      Authorization: `Bearer ${token}`
    }
  }

  // Función para aplicar filtros y ordenamiento
  const applyFiltersAndSort = () => {
    console.log('🔍 Aplicando filtros:', filters)
    console.log('📦 Productos totales:', products.length)
    
    let filtered = [...products]

    // Aplicar filtros
    if (filters.search) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        product.description.toLowerCase().includes(filters.search.toLowerCase())
      )
      console.log('🔍 Después de búsqueda:', filtered.length)
    }

    if (filters.category !== 'all') {
      filtered = filtered.filter(product => product.category.toLowerCase() === filters.category.toLowerCase())
      console.log('📂 Después de categoría:', filtered.length)
    }

    if (filters.gender !== 'all') {
      filtered = filtered.filter(product => product.gender.toLowerCase() === filters.gender.toLowerCase())
      console.log('👥 Después de género:', filtered.length)
    }

    if (filters.stockStatus !== 'all') {
      switch (filters.stockStatus) {
        case 'in-stock':
          filtered = filtered.filter(product => parseInt(product.stock) > 0)
          break
        case 'low-stock':
          filtered = filtered.filter(product => parseInt(product.stock) > 0 && parseInt(product.stock) <= 5)
          break
        case 'out-of-stock':
          filtered = filtered.filter(product => parseInt(product.stock) === 0)
          break
      }
      console.log('📦 Después de stock:', filtered.length)
    }

    if (filters.priceRange !== 'all') {
      switch (filters.priceRange) {
        case 'under-25':
          filtered = filtered.filter(product => parseFloat(product.price) < 25)
          break
        case '25-50':
          filtered = filtered.filter(product => parseFloat(product.price) >= 25 && parseFloat(product.price) <= 50)
          break
        case '50-100':
          filtered = filtered.filter(product => parseFloat(product.price) > 50 && parseFloat(product.price) <= 100)
          break
        case 'over-100':
          filtered = filtered.filter(product => parseFloat(product.price) > 100)
          break
      }
      console.log('💰 Después de precio:', filtered.length)
    }

    // Aplicar ordenamiento
    filtered.sort((a, b) => {
      let aValue, bValue

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'price':
          aValue = parseFloat(a.price)
          bValue = parseFloat(b.price)
          break
        case 'stock':
          aValue = parseInt(a.stock)
          bValue = parseInt(b.stock)
          break
        case 'category':
          aValue = a.category.toLowerCase()
          bValue = b.category.toLowerCase()
          break
        default:
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    console.log('✅ Productos filtrados finales:', filtered.length)
    setFilteredProducts(filtered)
  }

  // Función para limpiar filtros
  const clearFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      gender: 'all',
      stockStatus: 'all',
      priceRange: 'all'
    })
    setSortBy('name')
    setSortOrder('asc')
  }

  // Obtener estadísticas
  const getStats = () => {
    const totalProducts = products.length
    const inStock = products.filter(p => p.stock > 0).length
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5).length
    const outOfStock = products.filter(p => p.stock === 0).length
    const categories = [...new Set(products.map(p => p.category))].length

    return { totalProducts, inStock, lowStock, outOfStock, categories }
  }

  // Función para manejar errores de autorización
  const handleAuthError = (error, action = 'realizar esta acción') => {
    if (error.response?.status === 403) {
      setAccessDenied(true)
      alert('❌ Acceso Denegado: Solo los administradores pueden ' + action + '. Contacta al administrador del sistema para obtener permisos.')
      return true
    }
    return false
  }

  // Función para manejar selección de archivo
  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido')
        return
      }
      
      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen debe ser menor a 5MB')
        return
      }
      
      setSelectedFile(file)
      console.log('Archivo seleccionado:', file.name, 'Tamaño:', file.size)
    }
  }

  // Función para subir imagen usando presigned URL
  const uploadImageToS3 = async (file) => {
    try {
      setUploadingImage(true)
      console.log('Subiendo imagen usando presigned URL:', file.name)
      
      const headers = await getAuthHeaders()
      
      // 1. Obtener presigned URL del Lambda
      console.log('Solicitando presigned URL...')
      const urlRequest = post({
        apiName: 'SportShopAPI',
        path: '/admin/upload-url',
        options: {
          headers,
          body: {
            fileName: file.name,
            fileType: file.type
          }
        }
      })
      
      const { body } = await urlRequest.response
      const urlData = await body.json()
      
      console.log('Presigned URL obtenida:', urlData)
      
      // 2. Subir archivo directamente a S3 usando presigned URL
      console.log('Subiendo archivo a S3...')
      const uploadResponse = await fetch(urlData.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type
        },
        body: file
      })
      
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`)
      }
      
      console.log('Archivo subido exitosamente a S3')
      return urlData.publicUrl
      
    } catch (error) {
      console.error('Error subiendo imagen:', error)
      throw new Error('Error al subir la imagen: ' + error.message)
    } finally {
      setUploadingImage(false)
    }
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      console.log('📡 Obteniendo productos...')
      
      const restOperation = get({
        apiName: 'SportShopAPI',
        path: '/products'
      })
      
      const { body } = await restOperation.response
      const data = await body.json()
      
      console.log('📦 Datos recibidos:', data)
      console.log('📦 Productos:', data.products?.length || 0)
      
      if (data.products && data.products.length > 0) {
        console.log('📦 Primer producto ejemplo:', data.products[0])
      }
      
      setProducts(data.products || [])
    } catch (err) {
      console.error('❌ Error fetching products:', err)
    } finally {
      setLoading(false)
    }
  }

  const createProduct = async (e) => {
    e.preventDefault()
    try {
      console.log('Creating product with data:', formData)
      
      const headers = await getAuthHeaders()
      console.log('Auth headers:', headers)
      
      let imageUrl = formData.imageUrl
      
      // Si hay un archivo seleccionado, subirlo a S3 primero
      if (selectedFile) {
        console.log('Subiendo imagen antes de crear producto...')
        imageUrl = await uploadImageToS3(selectedFile)
        console.log('Imagen subida exitosamente:', imageUrl)
      }
      
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        imageUrl: imageUrl
      }
      console.log('Product data to send:', productData)
      
      const restOperation = post({
        apiName: 'SportShopAPI',
        path: '/admin/products',
        options: {
          headers,
          body: productData
        }
      })

      console.log('Sending request...')
      const { body } = await restOperation.response
      const result = await body.json()
      
      console.log('Product created successfully:', result)
      alert('¡Producto creado exitosamente!')
      
      // Limpiar formulario y recargar productos
      setFormData({
        name: '', description: '', price: '', category: '', 
        gender: '', stock: '', imageUrl: ''
      })
      setSelectedFile(null)
      setShowCreateForm(false)
      fetchProducts()
      
    } catch (err) {
      console.error('Error creating product - Full error:', err)
      
      // Verificar si es error de autorización
      if (handleAuthError(err, 'crear productos')) return
      
      // Verificar si es un error de respuesta HTTP
      if (err.response) {
        try {
          const errorBody = await err.response.body.json()
          console.error('Error response body:', errorBody)
          alert('Error: ' + (errorBody.message || 'Error desconocido'))
        } catch (parseError) {
          console.error('Could not parse error response:', parseError)
          alert('Error al crear producto: ' + err.message)
        }
      } else {
        alert('Error al crear producto: ' + err.message)
      }
    }
  }

  const updateProduct = async (e) => {
    e.preventDefault()
    try {
      console.log('Updating product:', editingProduct.id, 'with data:', formData)
      
      const headers = await getAuthHeaders()
      console.log('Auth headers:', headers)
      
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock)
      }
      console.log('Product data to send:', productData)
      
      const restOperation = put({
        apiName: 'SportShopAPI',
        path: `/admin/products/${editingProduct.id}`,
        options: {
          headers,
          body: productData
        }
      })

      console.log('Sending update request...')
      const { body } = await restOperation.response
      const result = await body.json()
      
      console.log('Product updated successfully:', result)
      alert('¡Producto actualizado exitosamente!')
      
      setEditingProduct(null)
      setFormData({
        name: '', description: '', price: '', category: '', 
        gender: '', stock: '', imageUrl: ''
      })
      fetchProducts()
      
    } catch (err) {
      console.error('Error updating product - Full error:', err)
      
      // Verificar si es error de autorización
      if (handleAuthError(err, 'actualizar productos')) return
      
      // Verificar si es un error de respuesta HTTP
      if (err.response) {
        try {
          const errorBody = await err.response.body.json()
          console.error('Error response body:', errorBody)
          alert('Error: ' + (errorBody.message || 'Error desconocido'))
        } catch (parseError) {
          console.error('Could not parse error response:', parseError)
          alert('Error al actualizar producto: ' + err.message)
        }
      } else {
        alert('Error al actualizar producto: ' + err.message)
      }
    }
  }

  const deleteProduct = async (productId, productName) => {
    if (!confirm(`¿Estás seguro de eliminar "${productName}"?`)) return
    
    try {
      console.log('Deleting product:', productId)
      
      const headers = await getAuthHeaders()
      console.log('Auth headers:', headers)
      
      const restOperation = del({
        apiName: 'SportShopAPI',
        path: `/admin/products/${productId}`,
        options: {
          headers
        }
      })

      console.log('Sending delete request...')
      const { body } = await restOperation.response
      const result = await body.json()
      
      console.log('Product deleted successfully:', result)
      alert('Producto eliminado exitosamente')
      fetchProducts()
      
    } catch (err) {
      console.error('Error deleting product - Full error:', err)
      
      // Verificar si es error de autorización
      if (handleAuthError(err, 'eliminar productos')) return
      
      // Verificar si es un error de respuesta HTTP
      if (err.response) {
        try {
          const errorBody = await err.response.body.json()
          console.error('Error response body:', errorBody)
          alert('Error: ' + (errorBody.message || 'Error desconocido'))
        } catch (parseError) {
          console.error('Could not parse error response:', parseError)
          alert('Error al eliminar producto: ' + err.message)
        }
      } else {
        alert('Error al eliminar producto: ' + err.message)
      }
    }
  }

  const startEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      gender: product.gender,
      stock: product.stock.toString(),
      imageUrl: product.imageUrl || ''
    })
    setShowCreateForm(true)
  }

  const cancelEdit = () => {
    setEditingProduct(null)
    setShowCreateForm(false)
    setFormData({
      name: '', description: '', price: '', category: '', 
      gender: '', stock: '', imageUrl: ''
    })
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Cargando panel de administración...</div>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="container">
        <div className="access-denied">
          <h2>🚫 Acceso Denegado</h2>
          <p>Solo los administradores pueden acceder a este panel.</p>
          <p>Si necesitas permisos de administrador, contacta al administrador del sistema.</p>
          <button onClick={() => window.location.href = '/'} className="btn btn-primary">
            Volver al Sitio Principal
          </button>
        </div>
      </div>
    )
  }

  const stats = getStats()

  return (
    <div className="container">
      {/* Header con estadísticas */}
      <div className="admin-header">
        <div className="admin-title-section">
          <h1>📊 Panel de Administración</h1>
          <div className="admin-stats">
            <div className="stat-card">
              <span className="stat-number">{stats.totalProducts}</span>
              <span className="stat-label">Total Productos</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.inStock}</span>
              <span className="stat-label">En Stock</span>
            </div>
            <div className="stat-card warning">
              <span className="stat-number">{stats.lowStock}</span>
              <span className="stat-label">Stock Bajo</span>
            </div>
            <div className="stat-card danger">
              <span className="stat-number">{stats.outOfStock}</span>
              <span className="stat-label">Sin Stock</span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn btn-primary create-btn"
        >
          {showCreateForm ? '✕ Cancelar' : '+ Crear Producto'}
        </button>
      </div>

      {/* Filtros y controles */}
      <div className="admin-controls">
        <div className="filters-section">
          <div className="search-filter">
            <input
              type="text"
              placeholder="🔍 Buscar productos..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="search-input"
            />
          </div>
          
          <div className="filter-group">
            <select
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
              className="filter-select"
            >
              <option value="all">📂 Todas las categorías</option>
              <option value="camisetas">👕 Camisetas</option>
              <option value="pantalones">👖 Pantalones</option>
              <option value="zapatos">👟 Zapatos</option>
              <option value="accesorios">🎒 Accesorios</option>
            </select>
          </div>

          <div className="filter-group">
            <select
              value={filters.gender}
              onChange={(e) => setFilters({...filters, gender: e.target.value})}
              className="filter-select"
            >
              <option value="all">👥 Todos los géneros</option>
              <option value="hombre">👨 Hombre</option>
              <option value="mujer">👩 Mujer</option>
              <option value="unisex">⚧ Unisex</option>
            </select>
          </div>

          <div className="filter-group">
            <select
              value={filters.stockStatus}
              onChange={(e) => setFilters({...filters, stockStatus: e.target.value})}
              className="filter-select"
            >
              <option value="all">📦 Todo el stock</option>
              <option value="in-stock">✅ En stock</option>
              <option value="low-stock">⚠️ Stock bajo</option>
              <option value="out-of-stock">❌ Sin stock</option>
            </select>
          </div>

          <div className="filter-group">
            <select
              value={filters.priceRange}
              onChange={(e) => setFilters({...filters, priceRange: e.target.value})}
              className="filter-select"
            >
              <option value="all">💰 Todos los precios</option>
              <option value="under-25">💵 Menos de $25</option>
              <option value="25-50">💴 $25 - $50</option>
              <option value="50-100">💶 $50 - $100</option>
              <option value="over-100">💷 Más de $100</option>
            </select>
          </div>
        </div>

        <div className="controls-section">
          <div className="sort-controls">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="name">📝 Ordenar por Nombre</option>
              <option value="price">💰 Ordenar por Precio</option>
              <option value="stock">📦 Ordenar por Stock</option>
              <option value="category">📂 Ordenar por Categoría</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="sort-order-btn"
              title={sortOrder === 'asc' ? 'Cambiar a descendente' : 'Cambiar a ascendente'}
            >
              {sortOrder === 'asc' ? '⬆️' : '⬇️'}
            </button>
          </div>

          <div className="view-controls">
            <button
              onClick={() => setViewMode('grid')}
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              title="Vista en cuadrícula"
            >
              ⊞
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              title="Vista en tabla"
            >
              ☰
            </button>
          </div>

          <button
            onClick={clearFilters}
            className="clear-filters-btn"
            title="Limpiar todos los filtros"
          >
            🗑️ Limpiar
          </button>
        </div>
      </div>

      {/* Resultados */}
      <div className="results-info">
        <span>Mostrando {filteredProducts.length} de {products.length} productos</span>
      </div>

      {showCreateForm && (
        <ProductForm
          formData={formData}
          setFormData={setFormData}
          editingProduct={editingProduct}
          selectedFile={selectedFile}
          uploadingImage={uploadingImage}
          onSubmit={editingProduct ? updateProduct : createProduct}
          onCancel={cancelEdit}
          onFileSelect={handleFileSelect}
        />
      )}

      <div className="admin-products">
        {filteredProducts.length === 0 ? (
          <div className="no-products-found">
            <h3>🔍 No se encontraron productos</h3>
            <p>Intenta ajustar los filtros o crear un nuevo producto</p>
            <button onClick={clearFilters} className="btn btn-outline">
              Limpiar Filtros
            </button>
          </div>
        ) : (
          <ProductsList
            products={filteredProducts}
            viewMode={viewMode}
            onEdit={startEdit}
            onDelete={deleteProduct}
          />
        )}
      </div>
    </div>
  )
}

// Componente para el formulario de producto
function ProductForm({ formData, setFormData, editingProduct, selectedFile, uploadingImage, onSubmit, onCancel, onFileSelect }) {
  return (
    <div className="admin-form-container">
      <h2>{editingProduct ? '✏️ Editar Producto' : '➕ Crear Nuevo Producto'}</h2>
      <form onSubmit={onSubmit} className="admin-form">
        <div className="form-row">
          <div className="form-group">
            <label>Nombre del Producto</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              placeholder="Ej: Camiseta Nike Dri-FIT"
            />
          </div>
          <div className="form-group">
            <label>Precio ($)</label>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: e.target.value})}
              required
              placeholder="29.99"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Descripción</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows="3"
            required
            placeholder="Describe las características del producto..."
          />
        </div>

        <div className="form-row">
          {!editingProduct && (
            <div className="form-group">
              <label>Categoría</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                required
              >
                <option value="">Seleccionar categoría</option>
                <option value="camisetas">👕 Camisetas</option>
                <option value="pantalones">👖 Pantalones</option>
                <option value="zapatos">👟 Zapatos</option>
                <option value="accesorios">🎒 Accesorios</option>
              </select>
            </div>
          )}
          {editingProduct && (
            <div className="form-group">
              <label>Categoría (no se puede cambiar)</label>
              <input
                type="text"
                value={editingProduct.category}
                disabled
                className="disabled-input"
              />
            </div>
          )}
          <div className="form-group">
            <label>Género</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({...formData, gender: e.target.value})}
              required
            >
              <option value="">Seleccionar género</option>
              <option value="hombre">👨 Hombre</option>
              <option value="mujer">👩 Mujer</option>
              <option value="unisex">⚧ Unisex</option>
            </select>
          </div>
          <div className="form-group">
            <label>Stock</label>
            <input
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData({...formData, stock: e.target.value})}
              required
              min="0"
              placeholder="100"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Imagen del Producto</label>
          
          <div className="image-upload-section">
            <div className="upload-option">
              <label className="upload-label">📁 Subir desde computadora:</label>
              <input
                type="file"
                accept="image/*"
                onChange={onFileSelect}
                className="file-input"
              />
              {selectedFile && (
                <div className="file-selected">
                  ✅ {selectedFile.name}
                </div>
              )}
              {uploadingImage && (
                <div className="uploading">
                  ⏳ Subiendo imagen...
                </div>
              )}
            </div>
            
            <div className="upload-divider">- O -</div>
            
            <div className="upload-option">
              <label className="upload-label">🔗 URL de imagen:</label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                placeholder="https://ejemplo.com/imagen.jpg"
                className="url-input"
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={uploadingImage}>
            {uploadingImage ? '⏳ Subiendo...' : (editingProduct ? '💾 Actualizar' : '➕ Crear')}
          </button>
          <button type="button" onClick={onCancel} className="btn btn-outline">
            ❌ Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

// Componente para la lista de productos
function ProductsList({ products, viewMode, onEdit, onDelete }) {
  if (viewMode === 'table') {
    return (
      <div className="products-table-view">
        <div className="table-header">
          <div className="table-cell">Imagen</div>
          <div className="table-cell">Producto</div>
          <div className="table-cell">Categoría</div>
          <div className="table-cell">Precio</div>
          <div className="table-cell">Stock</div>
          <div className="table-cell">Acciones</div>
        </div>
        {products.map((product) => (
          <div key={product.id} className="table-row">
            <div className="table-cell">
              <div className="product-image-small">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} />
                ) : (
                  <div className="no-image-small">📷</div>
                )}
              </div>
            </div>
            <div className="table-cell">
              <div className="product-name-cell">
                <strong>{product.name}</strong>
                <span className="product-gender">{product.gender}</span>
              </div>
            </div>
            <div className="table-cell">
              <span className="category-badge">{product.category}</span>
            </div>
            <div className="table-cell">
              <span className="price-cell">${product.price}</span>
            </div>
            <div className="table-cell">
              <span className={`stock-badge ${getStockStatus(product.stock)}`}>
                {product.stock}
              </span>
            </div>
            <div className="table-cell">
              <div className="table-actions">
                <button 
                  onClick={() => onEdit(product)}
                  className="btn btn-sm btn-outline"
                  title="Editar producto"
                >
                  ✏️
                </button>
                <button 
                  onClick={() => onDelete(product.id, product.name)}
                  className="btn btn-sm remove-btn"
                  title="Eliminar producto"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="products-grid-view">
      {products.map((product) => (
        <div key={product.id} className="product-card-admin">
          <div className="product-image-admin">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} />
            ) : (
              <div className="no-image-admin">
                <span>📷</span>
                <p>Sin imagen</p>
              </div>
            )}
            <div className={`stock-indicator ${getStockStatus(product.stock)}`}>
              {product.stock === 0 ? 'Sin Stock' : product.stock <= 5 ? 'Stock Bajo' : 'En Stock'}
            </div>
          </div>
          
          <div className="product-info-admin">
            <h4 className="product-name-admin">{product.name}</h4>
            <div className="product-meta">
              <span className="category-tag">{product.category}</span>
              <span className="gender-tag">{product.gender}</span>
            </div>
            <div className="product-price-admin">${product.price}</div>
            <div className="product-stock-admin">Stock: {product.stock}</div>
          </div>
          
          <div className="product-actions-admin">
            <button 
              onClick={() => onEdit(product)}
              className="btn btn-outline action-btn"
              title="Editar producto"
            >
              ✏️ Editar
            </button>
            <button 
              onClick={() => onDelete(product.id, product.name)}
              className="btn remove-btn action-btn"
              title="Eliminar producto"
            >
              🗑️ Eliminar
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// Función helper para obtener el estado del stock
function getStockStatus(stock) {
  if (stock === 0) return 'out-of-stock'
  if (stock <= 5) return 'low-stock'
  return 'in-stock'
}

export default AdminPanel