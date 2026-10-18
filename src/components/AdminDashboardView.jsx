import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Package, 
  Users, 
  ShoppingBag, 
  Plus, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  DollarSign, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Search,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  Save,
  Check,
  FileText,
  UserCheck,
  Eye,
  EyeOff,
  Sparkles,
  User,
  LogIn,
  Lock,
  KeyRound,
  ArrowLeft,
  Network,
  Upload,
  Image as ImageIcon,
  Truck,
  Clock,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { productApi, authApi, orderApi, shippingApi } from '../services/api';
import IdentityLookupView from './IdentityLookupView';
import ArchitectureView from './ArchitectureView';

export default function AdminDashboardView({ 
  showToast, 
  currentUser, 
  onCurrentUserRoleChange, 
  onOpenAuthModal,
  onAuthSuccess,
  onNavigateToCatalog
}) {
  const [activeAdminTab, setActiveAdminTab] = useState('products'); // 'products' | 'users' | 'orders' | 'identity' | 'architecture'
  const isAdmin = currentUser?.role === 'ROLE_ADMIN';
  
  // Admin Login States (para cuando no está autenticado como Admin)
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminLoggingIn, setIsAdminLoggingIn] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState('');
  
  // Data States
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [shippings, setShippings] = useState([]);
  const [selectedShippingOrder, setSelectedShippingOrder] = useState(null);
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [isSavingShipping, setIsSavingShipping] = useState(false);
  const [shippingForm, setShippingForm] = useState({
    estadoEnvio: 'ALISTANDO_PEDIDO',
    courier: 'Olva Courier',
    numeroGuia: '',
    notas: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Product Modal & Form States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    shortName: '',
    category: 'laptops',
    categoryLabel: 'Laptops Gamer',
    price: '',
    originalPrice: '',
    stock: 10,
    sku: '',
    image: '',
    tag: '',
    tagColor: 'indigo',
    description: '',
    rating: 5.0,
    reviewsCount: 0
  });

  // Map rápido de envíos por orderId
  const shippingsMap = React.useMemo(() => {
    const map = {};
    shippings.forEach((s) => {
      if (s.orderId) map[s.orderId] = s;
    });
    return map;
  }, [shippings]);

  // Load Initial Data with Promise.allSettled (Resilient to offline services)
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, userRes, ordRes, shipRes] = await Promise.allSettled([
        productApi.listarProductos('all', true), // Traer activos e inactivos para el Admin
        authApi.listarUsuarios(),
        orderApi.listarOrdenes(),
        shippingApi.listarEnvios()
      ]);

      // 1. Load Products from Product-Service
      if (prodRes.status === 'fulfilled' && Array.isArray(prodRes.value?.data)) {
        setProducts(prodRes.value.data);
      }

      // 2. Load Users from Auth-Service
      if (userRes.status === 'fulfilled' && Array.isArray(userRes.value?.data)) {
        setUsers(userRes.value.data);
      }

      // 3. Load Orders from Order-Service
      if (ordRes.status === 'fulfilled' && Array.isArray(ordRes.value?.data)) {
        setOrders(ordRes.value.data);
      }

      // 4. Load Shippings from Shipping-Service
      if (shipRes.status === 'fulfilled' && Array.isArray(shipRes.value?.data)) {
        setShippings(shipRes.value.data);
      }
    } catch (err) {
      console.warn('Error cargando datos de administración:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenShippingModal = (order) => {
    const currentShip = shippingsMap[order.id];
    setSelectedShippingOrder(order);
    setShippingForm({
      estadoEnvio: currentShip?.estadoEnvio || 'ALISTANDO_PEDIDO',
      courier: currentShip?.courier || 'Olva Courier',
      numeroGuia: currentShip?.numeroGuia || `OLV-${String(order.id).padStart(6, '0')}`,
      notas: currentShip?.notas || ''
    });
    setIsShippingModalOpen(true);
  };

  const handleSaveShippingStatus = async (e) => {
    e.preventDefault();
    if (!selectedShippingOrder) return;
    setIsSavingShipping(true);
    try {
      await shippingApi.actualizarEstado(selectedShippingOrder.id, shippingForm);
      showToast(`Despacho de la Orden #${selectedShippingOrder.id} actualizado a "${shippingForm.estadoEnvio}"`, 'success');
      setIsShippingModalOpen(false);
      // Refrescar lista de despachos
      const shipRes = await shippingApi.listarEnvios();
      if (Array.isArray(shipRes.data)) {
        setShippings(shipRes.data);
      }
    } catch (err) {
      showToast(`Error al actualizar estado en Shipping-Service: ${err.message}`, 'error');
    } finally {
      setIsSavingShipping(false);
    }
  };

  const getShippingBadgeInfo = (estado) => {
    switch (estado) {
      case 'EN_VERIFICACION':
        return { label: 'En Verificación', className: 'shipping-badge-verificacion', icon: <Clock size={12} /> };
      case 'ALISTANDO_PEDIDO':
        return { label: 'Alistando Pedido', className: 'shipping-badge-almacen', icon: <Package size={12} /> };
      case 'EN_OLVA_COURIER':
        return { label: 'En Olva Courier', className: 'shipping-badge-courier', icon: <Truck size={12} /> };
      case 'ENTREGADO':
        return { label: 'Entregado', className: 'shipping-badge-entregado', icon: <CheckCircle2 size={12} /> };
      default:
        return { label: 'Alistando Pedido', className: 'shipping-badge-almacen', icon: <Package size={12} /> };
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      shortName: '',
      category: 'laptops',
      categoryLabel: 'Laptops Gamer',
      price: '',
      originalPrice: '',
      stock: 10,
      sku: `PROD-${Math.floor(1000 + Math.random() * 9000)}`,
      image: '',
      tag: '',
      tagColor: 'indigo',
      description: '',
      rating: 5.0,
      reviewsCount: 0
    });
    setIsProductModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (prod) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name || '',
      shortName: prod.shortName || '',
      category: prod.category || 'laptops',
      categoryLabel: prod.categoryLabel || 'Laptops Gamer',
      price: prod.price || '',
      originalPrice: prod.originalPrice || '',
      stock: prod.stock || 0,
      sku: prod.sku || '',
      image: prod.image || '',
      tag: prod.tag || '',
      tagColor: prod.tagColor || 'indigo',
      description: prod.description || '',
      rating: prod.rating || 5.0,
      reviewsCount: prod.reviewsCount || 0
    });
    setIsProductModalOpen(true);
  };

  // Save Product (POST or PUT to Product-Service)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name.trim() || !productForm.price) {
      showToast('Nombre y precio son obligatorios', 'error');
      return;
    }

    const payload = {
      ...productForm,
      price: parseFloat(productForm.price),
      originalPrice: productForm.originalPrice ? parseFloat(productForm.originalPrice) : parseFloat(productForm.price),
      stock: parseInt(productForm.stock, 10) || 0
    };

    try {
      if (editingProduct) {
        // Actualizar en Product-Service
        await productApi.actualizarProducto(editingProduct.id, payload);
        showToast(`Producto "${payload.name}" actualizado con éxito`, 'success');
      } else {
        // Crear en Product-Service
        await productApi.crearProducto(payload);
        showToast(`Producto "${payload.name}" creado en Product-Service`, 'success');
      }
      setIsProductModalOpen(false);
      loadAllData();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  // Delete Product (DELETE to Product-Service)
  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de que deseas dar de baja el producto "${name}"?`)) {
      return;
    }

    try {
      await productApi.eliminarProducto(id);
      showToast(`Producto "${name}" eliminado del catálogo`, 'success');
      loadAllData();
    } catch (err) {
      showToast(`Error al eliminar: ${err.message}`, 'error');
    }
  };

  // Toggle Product Active / Inactive Status
  const handleToggleProductStatus = async (product) => {
    try {
      const newStatus = product.active === false;
      await productApi.actualizarProducto(product.id, { active: newStatus });
      showToast(`Producto "${product.name}" marcado como ${newStatus ? 'Activo' : 'Inactivo'}`, 'success');
      loadAllData();
    } catch (err) {
      showToast(`Error al cambiar estado: ${err.message}`, 'error');
    }
  };

  // Upload Image to Cloudinary via Product-Service (/api/products/upload)
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const res = await productApi.subirImagen(file);
      if (res && res.url) {
        setProductForm(prev => ({ ...prev, image: res.url }));
        showToast('¡Imagen subida a Cloudinary correctamente!', 'success');
      } else {
        throw new Error('Respuesta no válida del servidor.');
      }
    } catch (err) {
      showToast(`Error al subir imagen a Cloudinary: ${err.message}`, 'error');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  // Change User Role (Admin Operation)
  const handleChangeUserRole = async (userId, username, newRole) => {
    if (!isAdmin) {
      showToast('Debes iniciar sesión con rol ROLE_ADMIN para modificar roles de usuario.', 'error');
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

    const roleLabel = newRole === 'ROLE_ADMIN' ? 'ADMINISTRADOR' : 'CLIENTE';
    if (!window.confirm(`¿Estás seguro de que deseas cambiar el rol de @${username} a ${roleLabel}?`)) {
      return;
    }

    setUpdatingUserId(userId);
    try {
      await authApi.cambiarRolUsuario(userId, newRole);
      showToast(`¡Rol de @${username} actualizado a ${roleLabel} con éxito!`, 'success');

      // Si el usuario modificado es el usuario actualmente en sesión, sincronizar estado local
      if (currentUser && currentUser.username === username) {
        const updatedUser = { ...currentUser, role: newRole };
        authApi.saveSession(authApi.getStoredToken(), updatedUser);
        if (onCurrentUserRoleChange) {
          onCurrentUserRoleChange(updatedUser);
        }
      }

      await loadAllData();
    } catch (err) {
      showToast(`Error al cambiar rol: ${err.message}`, 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Metrics Calculations
  const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
  const totalStockUnits = products.reduce((sum, p) => sum + (parseInt(p.stock, 10) || 0), 0);
  const adminUsersCount = users.filter(u => u.role === 'ROLE_ADMIN').length;

  // Filtered Products for Table
  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q)
    );
  });

  const handleAdminLoginSubmit = async (e) => {
    e.preventDefault();
    setAdminLoginError('');

    if (!adminUsername.trim() || !adminPassword) {
      setAdminLoginError('Por favor ingresa usuario y contraseña.');
      return;
    }

    setIsAdminLoggingIn(true);
    try {
      const res = await authApi.login(adminUsername.trim(), adminPassword);
      const data = res.data;

      if (data.role !== 'ROLE_ADMIN') {
        setAdminLoginError(`La cuenta @${data.username} tiene rol de CLIENTE (${data.role}). Se requiere una cuenta con rol ROLE_ADMIN para acceder al Backoffice.`);
        return;
      }

      const userObj = {
        username: data.username,
        email: data.email,
        fullName: data.fullName,
        role: data.role
      };

      authApi.saveSession(data.token, userObj);
      showToast(`¡Bienvenido al Panel Administrador, ${data.fullName || data.username}!`, 'success');
      if (onAuthSuccess) {
        onAuthSuccess(userObj, data.token);
      }
      loadAllData();
    } catch (err) {
      setAdminLoginError(err.message || 'Credenciales inválidas o servicio Auth-Service no disponible.');
    } finally {
      setIsAdminLoggingIn(false);
    }
  };

  // Si el usuario NO tiene rol de Administrador, mostramos la pantalla de login dedicada al Backoffice
  if (!isAdmin) {
    return (
      <div className="admin-login-screen animate-fade-in">
        <div className="admin-login-card glass-card">
          <div className="admin-login-badge">
            <Shield size={20} className="text-amber-400" />
            <span>ACCESO EXCLUSIVO ADMINISTRADOR</span>
          </div>

          <h2>Portal Backoffice NEXUSTECH</h2>
          <p className="admin-login-subtitle">
            Esta área está restringida a personal autorizado. Inicia sesión con tus credenciales de <strong>Administrador (ROLE_ADMIN)</strong> para gestionar productos, pedidos, auditoría y monitoreo.
          </p>

          {currentUser && (
            <div className="current-user-notice">
              <User size={15} />
              <span>
                Sesión actual: <strong>@{currentUser.username}</strong> ({currentUser.role}). Debes ingresar con una cuenta de Administrador.
              </span>
            </div>
          )}

          {adminLoginError && (
            <div className="admin-login-error animate-shake">
              <AlertCircle size={17} />
              <span>{adminLoginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLoginSubmit} className="admin-login-form">
            <div className="form-group">
              <label>Usuario Administrador</label>
              <div className="input-with-icon">
                <User size={16} />
                <input
                  type="text"
                  placeholder="ej. admin"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Contraseña</label>
              <div className="input-with-icon">
                <Lock size={16} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary w-full btn-admin-submit"
              disabled={isAdminLoggingIn}
            >
              {isAdminLoggingIn ? (
                <>
                  <RefreshCw size={16} className="spin-icon" />
                  <span>Verificando en Auth-Service...</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>Ingresar al Backoffice</span>
                </>
              )}
            </button>
          </form>

          <div className="admin-login-helper-box">
            <div className="helper-title">
              <KeyRound size={14} className="text-amber-400" />
              <span>Control de Acceso Seguro (RBAC)</span>
            </div>
            <p className="text-xs text-muted">
              Solo las cuentas con rol <code>ROLE_ADMIN</code> emitidas por Auth-Service tienen autorización para operar este módulo.
            </p>
          </div>

          <div className="admin-login-actions">
            <button 
              type="button" 
              className="btn-secondary w-full"
              onClick={onNavigateToCatalog}
            >
              <ArrowLeft size={16} />
              <span>Volver a la Tienda (Modo Cliente)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container animate-fade-in">

      {/* Top Banner */}
      <div className="admin-header-banner glass-card">
        <div className="admin-header-content">
          <div className="admin-title-badge">
            <Shield size={16} className="text-amber-400" />
            <span>MÓDULO DE CONTROL PRIVADO</span>
          </div>
          <h1>Panel de Control Administrador</h1>
          <p className="admin-header-subtitle">
            Gestión en tiempo real de catálogo (Product-Service), usuarios (Auth-Service) y órdenes consolidadas.
          </p>
        </div>
        <button 
          className="admin-refresh-btn btn-secondary" 
          onClick={loadAllData} 
          disabled={isLoading}
        >
          <RefreshCw size={15} className={isLoading ? 'spin-icon' : ''} />
          <span>Sincronizar Backend</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="admin-kpis-grid">
        <div className="admin-kpi-card glass-card">
          <div className="kpi-icon-box bg-indigo-500/10 text-indigo-400">
            <Package size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Productos en Catálogo</span>
            <div className="kpi-value font-mono">{products.length}</div>
            <span className="kpi-extra">{totalStockUnits} unidades en inventario</span>
          </div>
        </div>

        <div className="admin-kpi-card glass-card">
          <div className="kpi-icon-box bg-amber-500/10 text-amber-400">
            <Users size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Usuarios Registrados</span>
            <div className="kpi-value font-mono">{users.length}</div>
            <span className="kpi-extra">{adminUsersCount} con privilegios de Administrador</span>
          </div>
        </div>

        <div className="admin-kpi-card glass-card">
          <div className="kpi-icon-box bg-emerald-500/10 text-emerald-400">
            <ShoppingBag size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Ventas Registradas</span>
            <div className="kpi-value font-mono">{orders.length}</div>
            <span className="kpi-extra">Procesadas vía Order-Service</span>
          </div>
        </div>

        <div className="admin-kpi-card glass-card">
          <div className="kpi-icon-box bg-purple-500/10 text-purple-400">
            <TrendingUp size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Ingresos Totales</span>
            <div className="kpi-value font-mono">
              S/ {totalRevenue.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="kpi-extra text-emerald-400">100% transacciones reales</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="admin-tabs-nav-bar glass-card">
        <button
          className={`admin-nav-tab ${activeAdminTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveAdminTab('products')}
        >
          <Package size={17} />
          <span>Gestión de Catálogo (Product-Service)</span>
          <span className="tab-pill-count">{products.length}</span>
        </button>

        <button
          className={`admin-nav-tab ${activeAdminTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveAdminTab('orders')}
        >
          <FileText size={17} />
          <span>Órdenes & Facturación (Order-Service)</span>
          <span className="tab-pill-count">{orders.length}</span>
        </button>

        <button
          className={`admin-nav-tab ${activeAdminTab === 'identity' ? 'active' : ''}`}
          onClick={() => setActiveAdminTab('identity')}
        >
          <UserCheck size={17} />
          <span>Auditoría RENIEC / SUNAT</span>
        </button>

        <button
          className={`admin-nav-tab ${activeAdminTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveAdminTab('users')}
        >
          <Users size={17} />
          <span>Usuarios & Roles (Auth-Service)</span>
          <span className="tab-pill-count">{users.length}</span>
        </button>

        <button
          className={`admin-nav-tab ${activeAdminTab === 'architecture' ? 'active' : ''}`}
          onClick={() => setActiveAdminTab('architecture')}
        >
          <Network size={17} />
          <span>Monitor de Microservicios</span>
        </button>
      </div>

      {/* TAB 1: PRODUCT MANAGEMENT */}
      {activeAdminTab === 'products' && (
        <div className="admin-section-wrapper animate-fade-in">
          <div className="admin-toolbar glass-card">
            <div className="admin-search-box">
              <Search size={16} className="text-muted" />
              <input
                type="text"
                placeholder="Buscar por nombre, SKU o categoría..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="admin-toolbar-actions flex items-center gap-2">
              <button 
                className="btn-primary create-prod-btn" 
                onClick={handleOpenCreateModal}
              >
                <Plus size={16} />
                <span>Nuevo Producto</span>
              </button>
            </div>
          </div>

          <div className="admin-table-container glass-card">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="admin-product-cell">
                        {p.image ? (
                          <img 
                            src={p.image} 
                            alt={p.name} 
                            className="admin-thumb-img"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="admin-thumb-placeholder">
                            <Package size={16} className="text-secondary" />
                          </div>
                        )}
                        <div>
                          <div className="admin-prod-name">{p.name}</div>
                          <div className="admin-prod-sub">{p.shortName || p.tag || p.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-muted text-sm">{p.sku || '-'}</span>
                    </td>
                    <td>
                      <span className="category-pill">{p.categoryLabel || p.category}</span>
                    </td>
                    <td>
                      <div className="font-mono font-bold text-emerald-400">
                        S/ {Number(p.price).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </div>
                      {p.originalPrice && p.originalPrice > p.price && (
                        <div className="font-mono text-xs text-muted line-through">
                          S/ {Number(p.originalPrice).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`stock-badge ${p.stock > 5 ? 'stock-ok' : 'stock-low'}`}>
                        {p.stock} un.
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge-pill ${p.active !== false ? 'status-active' : 'status-inactive'}`}>
                        {p.active !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="admin-row-actions">
                        <button 
                          className={`action-icon-btn status ${p.active !== false ? 'text-amber-400' : 'text-emerald-400'}`} 
                          onClick={() => handleToggleProductStatus(p)}
                          title={p.active !== false ? 'Desactivar producto' : 'Activar producto'}
                        >
                          {p.active !== false ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button 
                          className="action-icon-btn edit" 
                          onClick={() => handleOpenEditModal(p)}
                          title="Editar producto"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button 
                          className="action-icon-btn delete" 
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          title="Eliminar producto"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-muted">
                      No se encontraron productos registrados en MySQL.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: USERS MANAGEMENT (Auth-Service) */}
      {activeAdminTab === 'users' && (
        <div className="admin-section-wrapper animate-fade-in">
          <div className="admin-users-header-bar glass-card">
            <div>
              <h3>Directorio Oficial de Usuarios (db_auth)</h3>
              <p className="text-muted text-sm">
                Cuentas registradas con autenticación JWT y roles en Spring Security.
              </p>
            </div>
            <button className="btn-secondary" onClick={loadAllData}>
              <RefreshCw size={14} className={isLoading ? 'spin-icon' : ''} />
              <span>Actualizar Usuarios</span>
            </button>
          </div>

          <div className="admin-table-container glass-card">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Usuario</th>
                  <th>Nombre Completo</th>
                  <th>Correo Electrónico</th>
                  <th>Rol en el Sistema</th>
                  <th>Seguridad</th>
                  <th className="text-right">Cambiar Rol</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isUserAdmin = u.role === 'ROLE_ADMIN';
                  const isProcessing = updatingUserId === u.id;

                  return (
                    <tr key={u.id}>
                      <td className="font-mono text-muted text-sm">#{u.id}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className={`user-avatar-circle ${isUserAdmin ? 'avatar-admin' : 'avatar-user'}`}>
                            {isUserAdmin ? <Shield size={14} /> : <UserCheck size={14} />}
                          </div>
                          <span className="font-mono font-medium">@{u.username}</span>
                        </div>
                      </td>
                      <td>{u.fullName || '-'}</td>
                      <td>
                        <span className="text-muted">{u.email}</span>
                      </td>
                      <td>
                        <span className={`role-badge-pill ${isUserAdmin ? 'badge-role-admin' : 'badge-role-user'}`}>
                          {isUserAdmin ? '🛡️ ADMINISTRADOR' : '👤 USUARIO CLIENTE'}
                        </span>
                      </td>
                      <td>
                        <span className="text-emerald-400 text-xs flex items-center gap-1 font-mono">
                          <CheckCircle2 size={13} /> BCrypt Encrypted
                        </span>
                      </td>
                      <td className="text-right">
                        {isUserAdmin ? (
                          <button 
                            className="btn-change-role btn-demote"
                            onClick={() => handleChangeUserRole(u.id, u.username, 'ROLE_USER')}
                            disabled={isProcessing}
                            title="Degradar a Cliente / Usuario"
                          >
                            <User size={13} />
                            <span>{isProcessing ? 'Cambiando...' : 'Cambiar a Usuario'}</span>
                          </button>
                        ) : (
                          <button 
                            className="btn-change-role btn-promote"
                            onClick={() => handleChangeUserRole(u.id, u.username, 'ROLE_ADMIN')}
                            disabled={isProcessing}
                            title="Promover a Administrador del Sistema"
                          >
                            <Shield size={13} />
                            <span>{isProcessing ? 'Cambiando...' : 'Promover a Admin'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-muted">
                      No hay usuarios registrados en la base de datos de Auth-Service.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ORDERS AUDIT (Order-Service) */}
      {activeAdminTab === 'orders' && (
        <div className="admin-section-wrapper animate-fade-in">
          <div className="admin-users-header-bar glass-card">
            <div>
              <h3>Auditoría de Compras & Despachos (Order-Service)</h3>
              <p className="text-muted text-sm">
                Registro transaccional de órdenes emitidas por clientes, facturación y stock.
              </p>
            </div>
            <button className="btn-secondary" onClick={loadAllData}>
              <RefreshCw size={14} className={isLoading ? 'spin-icon' : ''} />
              <span>Actualizar Órdenes</span>
            </button>
          </div>

          <div className="admin-table-container glass-card">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>N° Orden</th>
                  <th>Cliente</th>
                  <th>DNI / RUC</th>
                  <th>Productos Despachados</th>
                  <th>Total</th>
                  <th>Estado de Envío (Shipping-Service)</th>
                  <th>Courier / Guía</th>
                  <th className="text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const ship = shippingsMap[o.id];
                  const badgeInfo = getShippingBadgeInfo(ship?.estadoEnvio);
                  return (
                    <tr key={o.id}>
                      <td className="font-mono font-bold text-indigo-400">
                        ORD-{String(o.id).padStart(5, '0')}
                      </td>
                      <td>
                        <div className="font-semibold">{o.nombreCliente || 'Cliente'}</div>
                        <div className="text-xs text-muted font-mono">{o.direccionCliente || '-'}</div>
                      </td>
                      <td className="font-mono text-muted">{o.numeroDocumentoCliente || '-'}</td>
                      <td>
                        <span className="order-product-tag" title={o.producto}>
                          {o.producto || 'Hardware variado'}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono font-bold text-emerald-400">
                          S/ {Number(o.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td>
                        <span className={`shipping-badge ${badgeInfo.className}`}>
                          {badgeInfo.icon}
                          <span>{badgeInfo.label}</span>
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-col gap-0.5">
                          <span className="olva-brand-tag" style={{ width: 'fit-content' }}>
                            <Truck size={11} /> {ship?.courier || 'Olva Courier'}
                          </span>
                          <span className="text-xs font-mono text-muted">
                            {ship?.numeroGuia || `OLV-${String(o.id).padStart(6, '0')}`}
                          </span>
                        </div>
                      </td>
                      <td className="text-right">
                        <button 
                          className="btn-tracking-action"
                          onClick={() => handleOpenShippingModal(o)}
                          title="Gestionar estado y despacho logístico"
                        >
                          <Truck size={13} />
                          <span>Gestionar Envío</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-muted">
                      No hay órdenes generadas aún en Order-Service.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: IDENTITY AUDIT (RENIEC / SUNAT) */}
      {activeAdminTab === 'identity' && (
        <div className="admin-section-wrapper animate-fade-in">
          <div className="admin-subview-card glass-card">
            <div className="admin-subview-header">
              <div className="flex items-center gap-2">
                <UserCheck size={20} className="text-cyan-400" />
                <h3>Auditoría de Identidad: RENIEC & SUNAT (Identity-Service)</h3>
              </div>
              <p className="text-xs text-muted">
                Herramienta administrativa para validar en tiempo real el DNI o RUC de clientes, contrastando nombres y direcciones fiscales con la base de datos nacional.
              </p>
            </div>
            <IdentityLookupView showToast={showToast} />
          </div>
        </div>
      )}

      {/* TAB 5: ARCHITECTURE & INFRASTRUCTURE MONITOR */}
      {activeAdminTab === 'architecture' && (
        <div className="admin-section-wrapper animate-fade-in">
          <div className="admin-subview-card glass-card">
            <div className="admin-subview-header">
              <div className="flex items-center gap-2">
                <Network size={20} className="text-indigo-400" />
                <h3>Monitor de Salud del Ecosistema de Microservicios</h3>
              </div>
              <p className="text-xs text-muted">
                Supervisa el estado del registro en Eureka, enrutamiento en Spring Cloud Gateway y latencia de conexión.
              </p>
            </div>
            <ArchitectureView showToast={showToast} />
          </div>
        </div>
      )}

      {/* CREATE / EDIT PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsProductModalOpen(false)}>
          <div className="admin-modal-box glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div className="flex items-center gap-2">
                <Package size={20} className="text-indigo-400" />
                <h3>{editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto en Catálogo'}</h3>
              </div>
              <button className="close-btn" onClick={() => setIsProductModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="admin-modal-body">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Nombre del Producto *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Laptop ASUS ROG Strix SCAR 16"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Nombre Corto</label>
                  <input
                    type="text"
                    placeholder="ej. ASUS ROG SCAR 16"
                    value={productForm.shortName}
                    onChange={(e) => setProductForm({ ...productForm, shortName: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label>Categoría</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => {
                      const cat = e.target.value;
                      const labels = {
                        laptops: 'Laptops Gamer',
                        monitores: 'Monitores',
                        componentes: 'Componentes',
                        perifericos: 'Periféricos',
                        audio: 'Audio'
                      };
                      setProductForm({ 
                        ...productForm, 
                        category: cat,
                        categoryLabel: labels[cat] || cat
                      });
                    }}
                  >
                    <option value="laptops">Laptops Gamer & Pro</option>
                    <option value="monitores">Monitores & Displays</option>
                    <option value="componentes">Tarjetas de Video & CPUs</option>
                    <option value="perifericos">Teclados & Mouse</option>
                    <option value="audio">Audio & Streaming</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Precio (S/ PEN) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="ej. 5499.00"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Precio de Lista / Tachado</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="ej. 5999.00"
                    value={productForm.originalPrice}
                    onChange={(e) => setProductForm({ ...productForm, originalPrice: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label>Stock Disponible</label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Código SKU</label>
                  <input
                    type="text"
                    placeholder="ASUS-ROG-01"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Etiqueta / Badge</label>
                  <input
                    type="text"
                    placeholder="Gama Alta / Más Vendido"
                    value={productForm.tag}
                    onChange={(e) => setProductForm({ ...productForm, tag: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="flex items-center justify-between">
                  <span>Imagen del Producto</span>
                  {isUploadingImage && (
                    <span className="text-xs text-indigo-400 flex items-center gap-1 font-normal">
                      <RefreshCw size={12} className="spin-icon" /> Subiendo a Cloudinary...
                    </span>
                  )}
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="url"
                    placeholder="https://res.cloudinary.com/... o sube una imagen"
                    value={productForm.image}
                    onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <label className="btn-secondary flex items-center gap-1.5 cursor-pointer" style={{ padding: '0.55rem 0.9rem', whiteSpace: 'nowrap' }}>
                    <Upload size={14} className={isUploadingImage ? 'spin-icon' : 'text-indigo-400'} />
                    <span>{isUploadingImage ? 'Subiendo...' : 'Subir Foto'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }}
                      disabled={isUploadingImage}
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
                {productForm.image && (
                  <div className="mt-2 flex items-center gap-2 p-1.5 glass-card rounded-lg" style={{ width: 'fit-content' }}>
                    <img 
                      src={productForm.image} 
                      alt="Vista previa" 
                      style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6 }} 
                    />
                    <span className="text-xs text-muted pr-2">Vista previa de imagen asignada</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Descripción / Especificaciones</label>
                <textarea
                  rows="3"
                  placeholder="Detalles técnicos del producto..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                />
              </div>

              <div className="admin-modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setIsProductModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  <Save size={16} />
                  <span>{editingProduct ? 'Guardar Cambios' : 'Registrar Producto'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE GESTIÓN DE DESPACHO LOGÍSTICO (SHIPPING-SERVICE) */}
      {isShippingModalOpen && selectedShippingOrder && (
        <div className="modal-backdrop" onClick={() => setIsShippingModalOpen(false)}>
          <div className="admin-product-modal glass-card animate-scale-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="admin-modal-header">
              <div className="flex items-center gap-2">
                <Truck size={20} className="text-indigo-400" />
                <h3>Gestión de Despacho • Orden #{selectedShippingOrder.id}</h3>
              </div>
              <button className="close-btn" onClick={() => setIsShippingModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveShippingStatus} className="admin-modal-form">
              <div className="p-3 mb-3 rounded-lg bg-slate-900/60 border border-slate-700/60 flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Cliente:</span>
                  <strong className="text-slate-200">{selectedShippingOrder.nombreCliente} ({selectedShippingOrder.numeroDocumentoCliente})</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Destino:</span>
                  <span className="text-slate-300 font-mono">{selectedShippingOrder.direccionCliente || 'Dirección fiscal registrada'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Productos:</span>
                  <span className="text-slate-300 truncate max-w-xs">{selectedShippingOrder.producto}</span>
                </div>
              </div>

              <div className="form-group">
                <label>Estado del Envío (Shipping-Service)</label>
                <select
                  className="form-select font-semibold"
                  value={shippingForm.estadoEnvio}
                  onChange={(e) => setShippingForm({ ...shippingForm, estadoEnvio: e.target.value })}
                  required
                >
                  <option value="EN_VERIFICACION">🟡 1. En Verificación (Pago y DNI validados)</option>
                  <option value="ALISTANDO_PEDIDO">📦 2. Alistando Pedido (Picking & Packing en Almacén)</option>
                  <option value="EN_OLVA_COURIER">🚚 3. Pedido dejado en Olva Courier (En Ruta)</option>
                  <option value="ENTREGADO">🟢 4. Entregado al Cliente (Conforme en Domicilio)</option>
                </select>
                <p className="text-xs text-muted mt-1">
                  Al cambiar el estado, se sincroniza en vivo en <code>Shipping-Service</code> y el cliente lo verá en su rastreo.
                </p>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Empresa Courier</label>
                  <input
                    type="text"
                    placeholder="Olva Courier / Shalom"
                    value={shippingForm.courier}
                    onChange={(e) => setShippingForm({ ...shippingForm, courier: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>N° Guía de Remisión / Tracking</label>
                  <input
                    type="text"
                    className="font-mono font-bold"
                    placeholder="OLV-000001"
                    value={shippingForm.numeroGuia}
                    onChange={(e) => setShippingForm({ ...shippingForm, numeroGuia: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notas de Seguimiento (Opcional)</label>
                <textarea
                  rows="2"
                  placeholder="Ej. Paquete recepcionado en agencia Olva Los Olivos a las 11:30 AM..."
                  value={shippingForm.notas}
                  onChange={(e) => setShippingForm({ ...shippingForm, notas: e.target.value })}
                />
              </div>

              <div className="admin-modal-actions mt-4">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setIsShippingModalOpen(false)}
                  disabled={isSavingShipping}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={isSavingShipping}>
                  {isSavingShipping ? (
                    <>
                      <RefreshCw size={15} className="spin-icon" />
                      <span>Actualizando Shipping-Service...</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>Guardar Estado de Envío</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
