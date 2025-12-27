import { useState, useEffect } from 'react'
import { get, post, put, del } from 'aws-amplify/api'
import { fetchAuthSession } from 'aws-amplify/auth'
// Removemos uploadData y getUrl por ahora

function AdminPanel({ user }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [accessDenied, setAccessDenied] = useState(false)
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

  const getAuthHeaders = async () => {
    const session = await fetchAuthSession()
    const token = session.tokens?.idToken?.toString()  // ← Usar IdToken, no AccessToken
    return {
      Authorization: `Bearer ${token}`
    }
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
      const restOperation = get({
        apiName: 'SportShopAPI',
        path: '/products'
      })
      
      const { body } = await restOperation.response
      const data = await body.json()
      setProducts(data.products || [])
    } catch (err) {
      console.error('Error fetching products:', err)
    } finally {
      setLoading(false)
    }
  }

  const createProduct = async (e) => {
    e.preventDefault()
    try {
      console.log('Creating product with data:', formData)
      
      const headers = await getAuthHeaders() // ← RESTAURAR HEADERS
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
        imageUrl: imageUrl // Usar la URL de S3 o la URL manual
      }
      console.log('Product data to send:', productData)
      
      const restOperation = post({
        apiName: 'SportShopAPI',
        path: '/admin/products',
        options: {
          headers, // ← RESTAURAR HEADERS
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
      setSelectedFile(null) // Limpiar archivo seleccionado
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
      
      const headers = await getAuthHeaders() // ← AGREGAR HEADERS
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
          headers, // ← AGREGAR HEADERS
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
      
      const headers = await getAuthHeaders() // ← AGREGAR HEADERS
      console.log('Auth headers:', headers)
      
      const restOperation = del({
        apiName: 'SportShopAPI',
        path: `/admin/products/${productId}`,
        options: {
          headers // ← AGREGAR HEADERS
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
      // category: product.category,  ← REMOVER - No se puede cambiar
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
            Volver al Inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="admin-header">
        <h1>Panel de Administración</h1>
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn btn-primary"
        >
          {showCreateForm ? 'Cancelar' : '+ Crear Producto'}
        </button>
      </div>

      {showCreateForm && (
        <div className="admin-form-container">
          <h2>{editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}</h2>
          <form onSubmit={editingProduct ? updateProduct : createProduct} className="admin-form">
            <div className="form-row">
              <div className="form-group">
                <label>Nombre del Producto</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Precio</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  required
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
                    <option value="Camisetas">Camisetas</option>
                    <option value="Pantalones">Pantalones</option>
                    <option value="Zapatos">Zapatos</option>
                    <option value="Accesorios">Accesorios</option>
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
                    style={{ backgroundColor: '#f5f5f5', color: '#666' }}
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
                  <option value="Hombre">Hombre</option>
                  <option value="Mujer">Mujer</option>
                  <option value="Unisex">Unisex</option>
                </select>
              </div>
              <div className="form-group">
                <label>Stock</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({...formData, stock: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Imagen del Producto</label>
              
              {/* Upload de archivo */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '14px', color: '#666' }}>Subir imagen desde tu computadora:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    border: '1px solid #333',
                    backgroundColor: '#2a2a2a',
                    color: '#fff',
                    borderRadius: '4px'
                  }}
                />
                {selectedFile && (
                  <div style={{ fontSize: '12px', color: '#00d4ff', marginTop: '5px' }}>
                    ✓ Archivo seleccionado: {selectedFile.name}
                  </div>
                )}
                {uploadingImage && (
                  <div style={{ fontSize: '12px', color: '#00d4ff', marginTop: '5px' }}>
                    📤 Subiendo imagen...
                  </div>
                )}
              </div>
              
              {/* Separador */}
              <div style={{ textAlign: 'center', margin: '15px 0', color: '#666' }}>
                - O -
              </div>
              
              {/* URL manual */}
              <div>
                <label style={{ fontSize: '14px', color: '#666' }}>O pegar URL de imagen:</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    border: '1px solid #333',
                    backgroundColor: '#2a2a2a',
                    color: '#fff',
                    borderRadius: '4px'
                  }}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingProduct ? 'Actualizar Producto' : 'Crear Producto'}
              </button>
              <button type="button" onClick={cancelEdit} className="btn btn-outline">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-products">
        <h2>Productos Existentes ({products.length})</h2>
        <div className="products-table">
          {products.map((product) => (
            <div key={product.id} className="product-row">
              <div className="product-info">
                <h4>{product.name}</h4>
                <p>{product.category} - {product.gender}</p>
                <p className="product-price">${product.price}</p>
                <p className="product-stock">Stock: {product.stock}</p>
              </div>
              <div className="product-actions">
                <button 
                  onClick={() => startEdit(product)}
                  className="btn btn-outline"
                >
                  ✏️ Editar
                </button>
                <button 
                  onClick={() => deleteProduct(product.id, product.name)}
                  className="btn remove-btn"
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AdminPanel