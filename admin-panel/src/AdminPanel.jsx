import React, { useState, useEffect } from 'react';
import { get, post, put, del } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';

const AdminPanel = ({ user }) => {
  // Estados principales
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);

  // Estados de productos
  const [products, setProducts] = useState([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productFilters, setProductFilters] = useState({
    search: '',
    category: 'all',
    gender: 'all',
    stockStatus: 'all',
    priceRange: 'all'
  });
  
  // Estados de pedidos (solo últimos 7 días)
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Estados de ventas con vista jerárquica
  const [sales, setSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [salesStats, setSalesStats] = useState({});
  const [salesView, setSalesView] = useState({
    level: 'year', // year, month, day, detail
    year: null,
    month: null,
    day: null
  });
  const [salesFilters, setSalesFilters] = useState({
    selectedYear: new Date().getFullYear(),
    selectedMonth: null,
    selectedDay: null,
    customerSearch: '',
    minAmount: '',
    maxAmount: '',
    sortBy: 'date',
    sortOrder: 'desc'
  });
  
  // Estados de formulario de producto
  const [productFormData, setProductFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    gender: '',
    stock: '',
    imageUrl: ''
  });

  const [imageFile, setImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Estados de estadísticas
  const [dashboardStats, setDashboardStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    outOfStock: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalSales: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const getAuthHeaders = async () => {
    try {
      const session = await fetchAuthSession();
      return {
        Authorization: `Bearer ${session.tokens.idToken.toString()}`
      };
    } catch (error) {
      console.error('Error getting auth headers:', error);
      throw error;
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchProducts(),
        fetchOrders(),
        fetchSales(),
        fetchSalesStatistics()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      if (error.response?.status === 403) {
        setAccessDenied(true);
      } else {
        setError('Error cargando datos del panel');
      }
    } finally {
      setLoading(false);
    }
  };

  // ===== FUNCIONES DE PRODUCTOS =====
  const fetchProducts = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await get({
        apiName: 'SportShopAPI',
        path: '/products',
        options: { headers }
      }).response;
      
      const data = await response.body.json();
      console.log('Products data:', data); // Debug
      setProducts(data.products || []);
      updateProductStats(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      if (error.response?.status === 403) {
        setAccessDenied(true);
      } else {
        setError('Error al cargar productos');
      }
    }
  };

  const updateProductStats = (productList) => {
    const stats = {
      totalProducts: productList.length,
      lowStock: productList.filter(p => p.stock > 0 && p.stock <= 10).length,
      outOfStock: productList.filter(p => p.stock === 0).length,
      totalValue: productList.reduce((sum, p) => sum + (p.price * p.stock), 0)
    };
    setDashboardStats(prev => ({ ...prev, ...stats }));
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let imageUrl = productFormData.imageUrl;
      
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      const headers = await getAuthHeaders();
      await post({
        apiName: 'SportShopAPI',
        path: '/admin/products',
        options: {
          headers,
          body: {
            ...productFormData,
            price: parseFloat(productFormData.price),
            stock: parseInt(productFormData.stock),
            imageUrl
          }
        }
      }).response;

      setSuccess('Producto creado exitosamente');
      resetProductForm();
      fetchProducts();
    } catch (error) {
      console.error('Error creating product:', error);
      setError('Error al crear producto');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Obtener ID de manera más robusta
      const productId = editingProduct?.id || editingProduct?.productId;
      
      if (!productId) {
        setError('Error: ID de producto no encontrado');
        return;
      }
      
      let imageUrl = productFormData.imageUrl;
      
      if (imageFile) {
        imageUrl = await uploadImage();
      }

      const headers = await getAuthHeaders();
      
      await put({
        apiName: 'SportShopAPI',
        path: `/admin/products/${productId}`,
        options: {
          headers,
          body: {
            ...productFormData,
            price: parseFloat(productFormData.price),
            stock: parseInt(productFormData.stock),
            imageUrl
          }
        }
      }).response;

      setSuccess('Producto actualizado exitosamente');
      resetProductForm();
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      setError('Error al actualizar producto');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return;

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      await del({
        apiName: 'SportShopAPI',
        path: `/admin/products/${productId}`,
        options: { headers }
      }).response;

      setSuccess('Producto eliminado exitosamente');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      setError('Error al eliminar producto');
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async () => {
    if (!imageFile) return '';

    setUploadingImage(true);
    try {
      const headers = await getAuthHeaders();
      
      // Generar presigned URL
      const response = await post({
        apiName: 'SportShopAPI',
        path: '/admin/upload-url',
        options: {
          headers,
          body: {
            fileName: imageFile.name,
            fileType: imageFile.type
          }
        }
      }).response;

      const data = await response.body.json();
      console.log('Upload URL response:', data); // Debug
      
      // Subir archivo a S3
      const uploadResponse = await fetch(data.uploadUrl, {
        method: 'PUT',
        body: imageFile,
        headers: {
          'Content-Type': imageFile.type
        }
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      console.log('Image uploaded successfully to:', data.publicUrl); // Debug
      return data.publicUrl; // Usar publicUrl en lugar de imageUrl
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  // ===== FUNCIONES DE FILTRADO SIMPLIFICADO =====
  
  // Filtrar pedidos - solo últimos 7 días
  const getFilteredOrders = () => {
    let filtered = [...orders];
    
    // Filtrar solo pedidos de los últimos 7 días
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0); // Inicio del día hace 7 días
    
    filtered = filtered.filter(order => {
      if (!order.createdAt) return false;
      const orderDate = new Date(order.createdAt);
      return orderDate >= sevenDaysAgo;
    });
    
    // Ordenar por fecha (más recientes primero)
    filtered.sort((a, b) => {
      const aDate = new Date(a.createdAt);
      const bDate = new Date(b.createdAt);
      return bDate - aDate; // Descendente (más recientes primero)
    });
    
    return filtered;
  };
  
  // Limpiar filtros de ventas
  const clearSalesFilters = () => {
    setSalesFilters({
      selectedYear: new Date().getFullYear(),
      selectedMonth: null,
      selectedDay: null,
      customerSearch: '',
      minAmount: '',
      maxAmount: '',
      sortBy: 'date',
      sortOrder: 'desc'
    });
    setSalesView('year');
  };
  const fetchOrders = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await get({
        apiName: 'SportShopAPI',
        path: '/admin/orders',
        options: { headers }
      }).response;
      
      const data = await response.body.json();
      setOrders(data.orders || []);
      updateOrderStats(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (error.response?.status === 403) {
        setAccessDenied(true);
      } else {
        setError('Error al cargar pedidos');
      }
    }
  };

  const updateOrderStats = (orderList) => {
    const stats = {
      totalOrders: orderList.length,
      pendingOrders: orderList.filter(o => o.status === 'pending').length,
      completedOrders: orderList.filter(o => o.status === 'completed').length
    };
    setDashboardStats(prev => ({ ...prev, ...stats }));
  };

  const handleCompleteOrder = async (orderId) => {
    if (!confirm('¿Completar este pedido? Esto reducirá el stock y creará una venta.')) return;

    setLoading(true);
    setError('');
    try {
      const headers = await getAuthHeaders();
      console.log('Completing order:', orderId); // Debug
      
      const response = await put({
        apiName: 'SportShopAPI',
        path: `/admin/orders/${orderId}/complete`,
        options: { headers }
      }).response;

      const result = await response.body.json();
      console.log('Complete order result:', result); // Debug
      
      setSuccess('Pedido completado exitosamente');
      await Promise.all([fetchOrders(), fetchSales(), fetchProducts()]);
    } catch (error) {
      console.error('Error completing order:', error);
      setError(`Error al completar pedido: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!confirm('¿Cancelar este pedido? Esta acción no se puede deshacer.')) return;

    setLoading(true);
    setError('');
    try {
      const headers = await getAuthHeaders();
      console.log('Canceling order:', orderId); // Debug
      
      await del({
        apiName: 'SportShopAPI',
        path: `/admin/orders/${orderId}`,
        options: { headers }
      }).response;

      setSuccess('Pedido cancelado exitosamente');
      await fetchOrders();
    } catch (error) {
      console.error('Error canceling order:', error);
      setError(`Error al cancelar pedido: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // ===== FUNCIONES DE VENTAS =====
  const fetchSales = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await get({
        apiName: 'SportShopAPI',
        path: '/admin/sales',
        options: { headers }
      }).response;
      
      const data = await response.body.json();
      console.log('Sales data:', data); // Debug
      setSales(data.sales || []);
      updateSalesStats(data.sales || []);
    } catch (error) {
      console.error('Error fetching sales:', error);
      if (error.response?.status === 403) {
        setAccessDenied(true);
      } else {
        setError('Error al cargar ventas');
      }
    }
  };

  const fetchSalesStatistics = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await get({
        apiName: 'SportShopAPI',
        path: '/admin/sales/statistics',
        options: { headers }
      }).response;
      
      const data = await response.body.json();
      console.log('Sales statistics:', data); // Debug
      setSalesStats(data);
    } catch (error) {
      console.error('Error fetching sales statistics:', error);
      // No mostrar error si las estadísticas fallan, es opcional
    }
  };

  const updateSalesStats = (salesList) => {
    const stats = {
      totalSales: salesList.length,
      totalRevenue: salesList.reduce((sum, s) => sum + s.totalAmount, 0)
    };
    setDashboardStats(prev => ({ ...prev, ...stats }));
  };

  const handleCancelSale = async (saleId) => {
    if (!confirm('¿Cancelar esta venta? Esto restaurará el stock de los productos.')) return;

    setLoading(true);
    setError('');
    try {
      const headers = await getAuthHeaders();
      console.log('Canceling sale:', saleId); // Debug
      
      await del({
        apiName: 'SportShopAPI',
        path: `/admin/sales/${saleId}`,
        options: { headers }
      }).response;

      setSuccess('Venta cancelada exitosamente');
      await Promise.all([fetchSales(), fetchProducts()]);
    } catch (error) {
      console.error('Error canceling sale:', error);
      setError(`Error al cancelar venta: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // ===== FUNCIONES AUXILIARES =====
  
  // Funciones para vista jerárquica de ventas
  const getYearlyData = () => {
    const yearlyData = {};
    
    sales.forEach(sale => {
      if (!sale.completedAt) return;
      
      const saleDate = new Date(sale.completedAt);
      const year = saleDate.getFullYear();
      
      if (!yearlyData[year]) {
        yearlyData[year] = {
          year,
          count: 0,
          total: 0
        };
      }
      
      yearlyData[year].count++;
      yearlyData[year].total += parseFloat(sale.totalAmount || 0);
    });
    
    return Object.values(yearlyData).sort((a, b) => b.year - a.year);
  };
  
  const getMonthlyData = (year) => {
    const monthlyData = {};
    
    sales.forEach(sale => {
      if (!sale.completedAt) return;
      
      const saleDate = new Date(sale.completedAt);
      if (saleDate.getFullYear() !== parseInt(year)) return;
      
      const month = saleDate.getMonth() + 1; // 1-12
      
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          count: 0,
          total: 0
        };
      }
      
      monthlyData[month].count++;
      monthlyData[month].total += parseFloat(sale.totalAmount || 0);
    });
    
    return Object.values(monthlyData).sort((a, b) => b.month - a.month);
  };
  
  const getDailyData = (year, month) => {
    const dailyData = {};
    
    sales.forEach(sale => {
      if (!sale.completedAt) return;
      
      const saleDate = new Date(sale.completedAt);
      if (saleDate.getFullYear() !== parseInt(year) || 
          saleDate.getMonth() !== parseInt(month) - 1) return;
      
      const day = saleDate.getDate();
      
      if (!dailyData[day]) {
        dailyData[day] = {
          day,
          count: 0,
          total: 0
        };
      }
      
      dailyData[day].count++;
      dailyData[day].total += parseFloat(sale.totalAmount || 0);
    });
    
    return Object.values(dailyData).sort((a, b) => b.day - a.day);
  };
  
  const getMonthName = (monthNumber) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[parseInt(monthNumber) - 1] || 'Mes desconocido';
  };
  
  const exportDayData = (year, month, day) => {
    const daySales = sales.filter(sale => {
      const saleDate = new Date(sale.completedAt);
      return saleDate.getFullYear() === parseInt(year) && 
             saleDate.getMonth() === parseInt(month) - 1 &&
             saleDate.getDate() === parseInt(day);
    });
    
    const csvContent = [
      ['ID Venta', 'Hora', 'Cliente', 'Email', 'Teléfono', 'Total', 'Productos'].join(','),
      ...daySales.map(sale => [
        sale.saleId || '',
        sale.completedAt ? new Date(sale.completedAt).toLocaleTimeString() : '',
        sale.customerName || '',
        sale.customerEmail || '',
        sale.customerPhone || '',
        sale.totalAmount || 0,
        sale.items ? sale.items.map(item => `${item.productName}(${item.quantity})`).join(';') : ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas-${day}-${getMonthName(month)}-${year}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetProductForm = () => {
    setProductFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      gender: '',
      stock: '',
      imageUrl: ''
    });
    setImageFile(null);
    setShowProductForm(false);
    setEditingProduct(null);
  };

  const startEditProduct = (product) => {
    // Asegurar que tenemos el ID correcto
    const productId = product.id || product.productId;
    
    const productToEdit = {
      ...product,
      id: productId // Asegurar que siempre tenga id
    };
    
    setEditingProduct(productToEdit);
    setProductFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category: product.category,
      gender: product.gender,
      stock: product.stock.toString(),
      imageUrl: product.imageUrl || ''
    });
    setShowProductForm(true);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(productFilters.search.toLowerCase());
    const matchesCategory = productFilters.category === 'all' || product.category === productFilters.category;
    const matchesGender = productFilters.gender === 'all' || product.gender === productFilters.gender;
    const matchesStock = productFilters.stockStatus === 'all' || 
      (productFilters.stockStatus === 'in-stock' && product.stock > 0) ||
      (productFilters.stockStatus === 'low-stock' && product.stock > 0 && product.stock <= 10) ||
      (productFilters.stockStatus === 'out-of-stock' && product.stock === 0);
    
    return matchesSearch && matchesCategory && matchesGender && matchesStock;
  });

  // Usar las funciones de filtrado avanzado
  const filteredOrders = getFilteredOrders();
  
  // Para ventas, usar diferentes datos según la vista
  const salesData = (() => {
    switch (salesView) {
      case 'year':
        return getSalesGroupedByYear();
      case 'month':
        return getSalesGroupedByMonth(salesFilters.selectedYear);
      case 'day':
        return getSalesGroupedByDay(salesFilters.selectedYear, salesFilters.selectedMonth);
      case 'detail':
        const dayData = getSalesGroupedByDay(salesFilters.selectedYear, salesFilters.selectedMonth);
        const selectedDayData = dayData.find(d => d.day === salesFilters.selectedDay);
        return selectedDayData ? selectedDayData.sales : [];
      default:
        return [];
    }
  })();

  if (accessDenied) {
    return (
      <div className="access-denied">
        <div className="access-denied-content">
          <h2>🚫 Acceso Denegado</h2>
          <p>No tienes permisos de administrador para acceder a este panel.</p>
          <p>Contacta al administrador del sistema para obtener acceso.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-content">
          <h1>🏪 Panel de Administración v3</h1>
          <div className="admin-user-info">
            <span>👤 {user?.signInDetails?.loginId || 'Admin'}</span>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="admin-nav">
        <div className="admin-nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={`nav-tab ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            📦 Productos
          </button>
          <button 
            className={`nav-tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            🛒 Pedidos
          </button>
          <button 
            className={`nav-tab ${activeTab === 'sales' ? 'active' : ''}`}
            onClick={() => setActiveTab('sales')}
          >
            💰 Ventas
          </button>
        </div>
      </nav>

      {/* Messages */}
      {error && (
        <div className="message error-message">
          ❌ {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}
      {success && (
        <div className="message success-message">
          ✅ {success}
          <button onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      {/* Main Content */}
      <main className="admin-main">
        {loading && <div className="loading-overlay">⏳ Cargando...</div>}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-content">
            <h2>📊 Resumen General</h2>
            
            <div className="stats-grid">
              <div className="stat-card products-stat">
                <div className="stat-icon">📦</div>
                <div className="stat-info">
                  <h3>Productos</h3>
                  <div className="stat-number">{dashboardStats.totalProducts}</div>
                  <div className="stat-details">
                    <span className="low-stock">⚠️ {dashboardStats.lowStock} Bajo Stock</span>
                    <span className="out-stock">❌ {dashboardStats.outOfStock} Sin Stock</span>
                  </div>
                </div>
              </div>

              <div className="stat-card orders-stat">
                <div className="stat-icon">🛒</div>
                <div className="stat-info">
                  <h3>Pedidos</h3>
                  <div className="stat-number">{dashboardStats.totalOrders}</div>
                  <div className="stat-details">
                    <span className="pending">⏳ {dashboardStats.pendingOrders} Pendientes</span>
                    <span className="completed">✅ {dashboardStats.completedOrders} Completados</span>
                  </div>
                </div>
              </div>

              <div className="stat-card sales-stat">
                <div className="stat-icon">💰</div>
                <div className="stat-info">
                  <h3>Ventas</h3>
                  <div className="stat-number">{dashboardStats.totalSales}</div>
                  <div className="stat-details">
                    <span className="revenue">💵 ${dashboardStats.totalRevenue?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="recent-activity">
              <h3>📈 Actividad Reciente</h3>
              <div className="activity-grid">
                <div className="activity-section">
                  <h4>🛒 Últimos Pedidos</h4>
                  <div className="activity-list">
                    {orders.slice(0, 5).map(order => (
                      <div key={order.orderId} className="activity-item">
                        <span className="activity-id">#{order.orderId.slice(-8)}</span>
                        <span className="activity-customer">{order.customerName}</span>
                        <span className={`activity-status status-${order.status}`}>
                          {order.status === 'pending' ? '⏳ Pendiente' : '✅ Completado'}
                        </span>
                        <span className="activity-amount">${order.totalAmount}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="activity-section">
                  <h4>💰 Últimas Ventas</h4>
                  <div className="activity-list">
                    {sales.slice(0, 5).map(sale => (
                      <div key={sale.saleId} className="activity-item">
                        <span className="activity-id">#{sale.saleId.slice(-8)}</span>
                        <span className="activity-customer">{sale.customerName}</span>
                        <span className="activity-date">{new Date(sale.saleDate).toLocaleDateString()}</span>
                        <span className="activity-amount">${sale.totalAmount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="products-content">
            <div className="products-header">
              <h2>📦 Gestión de Productos</h2>
              <button 
                className="btn btn-primary"
                onClick={() => setShowProductForm(true)}
              >
                ➕ Nuevo Producto
              </button>
            </div>

            {/* Product Filters */}
            <div className="filters-section">
              <div className="filters-row">
                <input
                  type="text"
                  placeholder="🔍 Buscar productos..."
                  value={productFilters.search}
                  onChange={(e) => setProductFilters({...productFilters, search: e.target.value})}
                  className="filter-input search-input"
                />
                
                <select
                  value={productFilters.category}
                  onChange={(e) => setProductFilters({...productFilters, category: e.target.value})}
                  className="filter-select"
                >
                  <option value="all">Todas las categorías</option>
                  <option value="camisetas">Camisetas</option>
                  <option value="pantalones">Pantalones</option>
                  <option value="shorts">Shorts</option>
                  <option value="hoodies">Hoodies</option>
                  <option value="accesorios">Accesorios</option>
                </select>

                <select
                  value={productFilters.gender}
                  onChange={(e) => setProductFilters({...productFilters, gender: e.target.value})}
                  className="filter-select"
                >
                  <option value="all">Todos los géneros</option>
                  <option value="hombre">Hombre</option>
                  <option value="mujer">Mujer</option>
                  <option value="unisex">Unisex</option>
                </select>

                <select
                  value={productFilters.stockStatus}
                  onChange={(e) => setProductFilters({...productFilters, stockStatus: e.target.value})}
                  className="filter-select"
                >
                  <option value="all">Todo el stock</option>
                  <option value="in-stock">En stock</option>
                  <option value="low-stock">Bajo stock</option>
                  <option value="out-of-stock">Sin stock</option>
                </select>
              </div>
            </div>

            {/* Products Grid */}
            <div className="products-grid">
              {filteredProducts.map(product => (
                <div key={product.id} className="product-card">
                  <div className="product-image">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} />
                    ) : (
                      <div className="no-image">📷</div>
                    )}
                    <div className={`stock-badge ${product.stock === 0 ? 'out-of-stock' : product.stock <= 10 ? 'low-stock' : 'in-stock'}`}>
                      {product.stock === 0 ? 'Sin Stock' : product.stock <= 10 ? 'Bajo Stock' : 'En Stock'}
                    </div>
                  </div>
                  
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    <p className="product-description">{product.description}</p>
                    <div className="product-details">
                      <span className="product-category">{product.category}</span>
                      <span className="product-gender">{product.gender}</span>
                    </div>
                    <div className="product-pricing">
                      <span className="product-price">${product.price}</span>
                      <span className="product-stock">Stock: {product.stock}</span>
                    </div>
                  </div>
                  
                  <div className="product-actions">
                    <button 
                      className="btn btn-secondary"
                      onClick={() => startEditProduct(product)}
                    >
                      ✏️ Editar
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="orders-content">
            <div className="orders-header">
              <h2>🛒 Gestión de Pedidos</h2>
              <div className="orders-info">
                <div className="info-text">
                  <span className="info-label">📅 Mostrando:</span>
                  <span className="info-value">Pedidos de los últimos 7 días</span>
                </div>
                <div className="orders-actions">
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={fetchOrders}
                  >
                    🔄 Actualizar
                  </button>
                </div>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="no-data">
                <div className="no-data-icon">🛒</div>
                <h3>No hay pedidos recientes</h3>
                <p>No se encontraron pedidos en los últimos 7 días</p>
              </div>
            ) : (
              <div className="orders-list">
                {filteredOrders.map(order => (
                  <div key={order.orderId} className="order-card">
                    <div className="order-header">
                      <div className="order-id">
                        <strong>Pedido #{order.orderId?.slice(-8) || 'N/A'}</strong>
                        <span className={`order-status status-${order.status || 'pending'}`}>
                          {order.status === 'pending' ? '⏳ Pendiente' : 
                           order.status === 'completed' ? '✅ Completado' : 
                           '❓ Desconocido'}
                        </span>
                      </div>
                      <div className="order-date">
                        📅 {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Fecha no disponible'}
                      </div>
                    </div>
                    
                    <div className="order-customer">
                      <strong>👤 Cliente:</strong> {order.customerInfo?.name || order.customerName || 'No especificado'}
                      <br />
                      <strong>📧 Email:</strong> {order.customerInfo?.email || order.customerEmail || 'No especificado'}
                      <br />
                      <strong>📱 Teléfono:</strong> {order.customerInfo?.phone || order.customerPhone || 'No especificado'}
                    </div>
                    
                    <div className="order-items">
                      <strong>📦 Productos:</strong>
                      {order.items && order.items.length > 0 ? (
                        order.items.map((item, index) => (
                          <div key={index} className="order-item">
                            <span>{item.productName || 'Producto'}</span>
                            <span>Cantidad: {item.quantity || 1}</span>
                            <span>${item.unitPrice || item.price || 0}</span>
                          </div>
                        ))
                      ) : (
                        <div className="order-item">
                          <span>No hay información de productos</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="order-total">
                      <strong>💰 Total: ${order.summary?.totalAmount || order.totalAmount || 0}</strong>
                    </div>
                    
                    {order.status === 'pending' && (
                      <div className="order-actions">
                        <button 
                          className="btn btn-success"
                          onClick={() => handleCompleteOrder(order.orderId)}
                          disabled={loading}
                        >
                          ✅ Completar Pedido
                        </button>
                        <button 
                          className="btn btn-danger"
                          onClick={() => handleCancelOrder(order.orderId)}
                          disabled={loading}
                        >
                          ❌ Cancelar Pedido
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sales Tab */}
        {activeTab === 'sales' && (
          <div className="sales-content">
            <div className="sales-header">
              <h2>💰 Gestión de Ventas Profesional</h2>
              <div className="sales-navigation">
                <div className="breadcrumb">
                  {salesView.level === 'year' && <span className="breadcrumb-item active">📊 Vista por Años</span>}
                  {salesView.level === 'month' && (
                    <>
                      <button className="breadcrumb-item" onClick={() => setSalesView({level: 'year', year: null, month: null, day: null})}>
                        📊 Años
                      </button>
                      <span className="breadcrumb-separator">›</span>
                      <span className="breadcrumb-item active">📅 {salesView.year}</span>
                    </>
                  )}
                  {salesView.level === 'day' && (
                    <>
                      <button className="breadcrumb-item" onClick={() => setSalesView({level: 'year', year: null, month: null, day: null})}>
                        📊 Años
                      </button>
                      <span className="breadcrumb-separator">›</span>
                      <button className="breadcrumb-item" onClick={() => setSalesView({level: 'month', year: salesView.year, month: null, day: null})}>
                        📅 {salesView.year}
                      </button>
                      <span className="breadcrumb-separator">›</span>
                      <span className="breadcrumb-item active">🗓️ {getMonthName(salesView.month)}</span>
                    </>
                  )}
                  {salesView.level === 'detail' && (
                    <>
                      <button className="breadcrumb-item" onClick={() => setSalesView({level: 'year', year: null, month: null, day: null})}>
                        📊 Años
                      </button>
                      <span className="breadcrumb-separator">›</span>
                      <button className="breadcrumb-item" onClick={() => setSalesView({level: 'month', year: salesView.year, month: null, day: null})}>
                        📅 {salesView.year}
                      </button>
                      <span className="breadcrumb-separator">›</span>
                      <button className="breadcrumb-item" onClick={() => setSalesView({level: 'day', year: salesView.year, month: salesView.month, day: null})}>
                        🗓️ {getMonthName(salesView.month)}
                      </button>
                      <span className="breadcrumb-separator">›</span>
                      <span className="breadcrumb-item active">📋 {salesView.day}</span>
                    </>
                  )}
                </div>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => Promise.all([fetchSales(), fetchSalesStatistics()])}
                >
                  🔄 Actualizar
                </button>
              </div>
            </div>

            {/* Year View */}
            {salesView.level === 'year' && (
              <div className="hierarchical-view">
                <div className="view-header">
                  <h3>📊 Ventas por Año</h3>
                  <div className="total-stats">
                    <span className="stat-item">
                      <strong>Total Ventas:</strong> {sales.length}
                    </span>
                    <span className="stat-item">
                      <strong>Ingresos Totales:</strong> ${sales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount || 0), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div className="hierarchical-grid">
                  {getYearlyData().map(yearData => (
                    <div 
                      key={yearData.year} 
                      className="hierarchical-card year-card"
                      onClick={() => setSalesView({level: 'month', year: yearData.year, month: null, day: null})}
                    >
                      <div className="card-header">
                        <h4>📅 {yearData.year}</h4>
                        <span className="card-arrow">›</span>
                      </div>
                      <div className="card-stats">
                        <div className="stat-row">
                          <span className="stat-label">Ventas:</span>
                          <span className="stat-value">{yearData.count}</span>
                        </div>
                        <div className="stat-row">
                          <span className="stat-label">Ingresos:</span>
                          <span className="stat-value">${yearData.total.toFixed(2)}</span>
                        </div>
                        <div className="stat-row">
                          <span className="stat-label">Promedio:</span>
                          <span className="stat-value">${(yearData.total / yearData.count).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Month View */}
            {salesView.level === 'month' && (
              <div className="hierarchical-view">
                <div className="view-header">
                  <h3>📅 Ventas de {salesView.year} por Mes</h3>
                  <div className="total-stats">
                    {(() => {
                      const yearSales = sales.filter(sale => {
                        const saleDate = new Date(sale.completedAt);
                        return saleDate.getFullYear() === parseInt(salesView.year);
                      });
                      return (
                        <>
                          <span className="stat-item">
                            <strong>Ventas del Año:</strong> {yearSales.length}
                          </span>
                          <span className="stat-item">
                            <strong>Ingresos del Año:</strong> ${yearSales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount || 0), 0).toFixed(2)}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>
                
                <div className="hierarchical-grid">
                  {getMonthlyData(salesView.year).map(monthData => (
                    <div 
                      key={monthData.month} 
                      className="hierarchical-card month-card"
                      onClick={() => setSalesView({level: 'day', year: salesView.year, month: monthData.month, day: null})}
                    >
                      <div className="card-header">
                        <h4>🗓️ {getMonthName(monthData.month)}</h4>
                        <span className="card-arrow">›</span>
                      </div>
                      <div className="card-stats">
                        <div className="stat-row">
                          <span className="stat-label">Ventas:</span>
                          <span className="stat-value">{monthData.count}</span>
                        </div>
                        <div className="stat-row">
                          <span className="stat-label">Ingresos:</span>
                          <span className="stat-value">${monthData.total.toFixed(2)}</span>
                        </div>
                        <div className="stat-row">
                          <span className="stat-label">Promedio:</span>
                          <span className="stat-value">${(monthData.total / monthData.count).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Day View */}
            {salesView.level === 'day' && (
              <div className="hierarchical-view">
                <div className="view-header">
                  <h3>🗓️ Ventas de {getMonthName(salesView.month)} {salesView.year} por Día</h3>
                  <div className="total-stats">
                    {(() => {
                      const monthSales = sales.filter(sale => {
                        const saleDate = new Date(sale.completedAt);
                        return saleDate.getFullYear() === parseInt(salesView.year) && 
                               saleDate.getMonth() === parseInt(salesView.month) - 1;
                      });
                      return (
                        <>
                          <span className="stat-item">
                            <strong>Ventas del Mes:</strong> {monthSales.length}
                          </span>
                          <span className="stat-item">
                            <strong>Ingresos del Mes:</strong> ${monthSales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount || 0), 0).toFixed(2)}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>
                
                <div className="hierarchical-grid">
                  {getDailyData(salesView.year, salesView.month).map(dayData => (
                    <div 
                      key={dayData.day} 
                      className="hierarchical-card day-card"
                      onClick={() => setSalesView({level: 'detail', year: salesView.year, month: salesView.month, day: dayData.day})}
                    >
                      <div className="card-header">
                        <h4>📋 Día {dayData.day}</h4>
                        <span className="card-arrow">›</span>
                      </div>
                      <div className="card-stats">
                        <div className="stat-row">
                          <span className="stat-label">Ventas:</span>
                          <span className="stat-value">{dayData.count}</span>
                        </div>
                        <div className="stat-row">
                          <span className="stat-label">Ingresos:</span>
                          <span className="stat-value">${dayData.total.toFixed(2)}</span>
                        </div>
                        <div className="stat-row">
                          <span className="stat-label">Promedio:</span>
                          <span className="stat-value">${(dayData.total / dayData.count).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detail View */}
            {salesView.level === 'detail' && (
              <div className="detail-view">
                <div className="view-header">
                  <h3>📋 Ventas del {salesView.day} de {getMonthName(salesView.month)} {salesView.year}</h3>
                  <div className="detail-actions">
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => exportDayData(salesView.year, salesView.month, salesView.day)}
                    >
                      📊 Exportar
                    </button>
                  </div>
                </div>
                
                {(() => {
                  const daySales = sales.filter(sale => {
                    const saleDate = new Date(sale.completedAt);
                    return saleDate.getFullYear() === parseInt(salesView.year) && 
                           saleDate.getMonth() === parseInt(salesView.month) - 1 &&
                           saleDate.getDate() === parseInt(salesView.day);
                  });
                  
                  return daySales.length === 0 ? (
                    <div className="no-data">
                      <div className="no-data-icon">💰</div>
                      <h3>No hay ventas este día</h3>
                      <p>No se registraron ventas para esta fecha</p>
                    </div>
                  ) : (
                    <div className="sales-detail-list">
                      {daySales.map(sale => (
                        <div key={sale.saleId} className="sale-detail-card">
                          <div className="sale-detail-header">
                            <div className="sale-id">
                              <strong>Venta #{sale.saleId?.slice(-8) || 'N/A'}</strong>
                            </div>
                            <div className="sale-time">
                              🕐 {sale.completedAt ? new Date(sale.completedAt).toLocaleTimeString() : 'Hora no disponible'}
                            </div>
                            <div className="sale-amount">
                              <strong>${sale.totalAmount || 0}</strong>
                            </div>
                          </div>
                          
                          <div className="sale-detail-customer">
                            <div className="customer-info">
                              <span><strong>👤</strong> {sale.customerName || 'No especificado'}</span>
                              <span><strong>📧</strong> {sale.customerEmail || 'No especificado'}</span>
                              <span><strong>📱</strong> {sale.customerPhone || 'No especificado'}</span>
                            </div>
                          </div>
                          
                          <div className="sale-detail-products">
                            <h5>📦 Productos:</h5>
                            {sale.items && sale.items.length > 0 ? (
                              <div className="products-grid">
                                {sale.items.map((item, index) => (
                                  <div key={index} className="product-detail-item">
                                    <div className="product-name">{item.productName || 'Producto'}</div>
                                    <div className="product-details">
                                      <span>Cantidad: {item.quantity || 1}</span>
                                      <span>Precio: ${item.unitPrice || item.price || 0}</span>
                                      <span>Subtotal: ${((item.quantity || 1) * (item.unitPrice || item.price || 0)).toFixed(2)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="no-products">
                                <span>Pedido original: {sale.originalOrderId || 'N/A'}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="sale-detail-actions">
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={() => handleCancelSale(sale.saleId)}
                              disabled={loading}
                            >
                              ❌ Cancelar Venta
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Product Form Modal */}
      {showProductForm && (
        <div className="modal-overlay">
          <div className="modal-content product-form-modal">
            <div className="modal-header">
              <h3>{editingProduct ? '✏️ Editar Producto' : '➕ Crear Producto'}</h3>
              <button className="modal-close" onClick={resetProductForm}>×</button>
            </div>
            
            <form onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct} className="product-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre del Producto</label>
                  <input
                    type="text"
                    value={productFormData.name}
                    onChange={(e) => setProductFormData({...productFormData, name: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Precio</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productFormData.price}
                    onChange={(e) => setProductFormData({...productFormData, price: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={productFormData.description}
                  onChange={(e) => setProductFormData({...productFormData, description: e.target.value})}
                  rows="3"
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Categoría</label>
                  <select
                    value={productFormData.category}
                    onChange={(e) => setProductFormData({...productFormData, category: e.target.value})}
                    required
                  >
                    <option value="">Seleccionar categoría</option>
                    <option value="camisetas">Camisetas</option>
                    <option value="pantalones">Pantalones</option>
                    <option value="shorts">Shorts</option>
                    <option value="hoodies">Hoodies</option>
                    <option value="accesorios">Accesorios</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Género</label>
                  <select
                    value={productFormData.gender}
                    onChange={(e) => setProductFormData({...productFormData, gender: e.target.value})}
                    required
                  >
                    <option value="">Seleccionar género</option>
                    <option value="hombre">Hombre</option>
                    <option value="mujer">Mujer</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Stock</label>
                  <input
                    type="number"
                    value={productFormData.stock}
                    onChange={(e) => setProductFormData({...productFormData, stock: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Imagen del Producto</label>
                <div className="image-upload-section">
                  <input
                    id="product-image-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files[0])}
                    className="file-input"
                  />
                  <label htmlFor="product-image-input" className="file-input-label">
                    📷 {imageFile ? imageFile.name : 'Seleccionar imagen'}
                  </label>
                </div>
                <small>O ingresa una URL de imagen:</small>
                <input
                  type="url"
                  placeholder="https://ejemplo.com/imagen.jpg"
                  value={productFormData.imageUrl}
                  onChange={(e) => setProductFormData({...productFormData, imageUrl: e.target.value})}
                />
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={resetProductForm}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading || uploadingImage}>
                  {uploadingImage ? '📤 Subiendo imagen...' : editingProduct ? '💾 Actualizar' : '➕ Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;