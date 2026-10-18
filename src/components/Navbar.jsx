import React, { useState } from 'react';
import { 
  Layers, 
  ShoppingBag, 
  UserCheck, 
  ClipboardList, 
  Network, 
  Server, 
  RefreshCw, 
  Sparkles, 
  Settings, 
  Check, 
  Truck, 
  ShieldCheck, 
  Cpu,
  LogIn,
  LogOut,
  User,
  Shield
} from 'lucide-react';
import { getGatewayUrl, setGatewayUrl } from '../services/api';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  isConnected, 
  isChecking, 
  onRefreshStatus, 
  ordersCount = 0,
  cartCount = 0,
  cartTotal = 0,
  onOpenCart,
  currentUser,
  onOpenAuthModal,
  onLogout
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [gatewayUrl, setLocalGatewayUrl] = useState(getGatewayUrl() || 'http://18.220.173.242:8080');

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setGatewayUrl(gatewayUrl);
    setShowSettings(false);
    onRefreshStatus();
  };

  const isAdmin = currentUser?.role === 'ROLE_ADMIN';
  const isInAdminMode = activeTab === 'admin';

  // Navegación condicional por roles: Clientes (Tienda y Pedidos) vs Administrador (+ Panel Admin)
  const navItems = isAdmin ? [
    { 
      id: 'admin', 
      label: '🛡️ Panel Admin', 
      icon: <Shield size={17} className="text-amber-400" />,
      isSpecial: true
    },
    { id: 'catalog', label: 'Tienda & Catálogo', icon: <Cpu size={17} /> },
    { 
      id: 'orders', 
      label: 'Mis Pedidos', 
      icon: <ClipboardList size={17} />, 
      badge: ordersCount > 0 ? ordersCount : null 
    }
  ] : [
    { id: 'catalog', label: 'Tienda & Catálogo', icon: <Cpu size={17} /> },
    { 
      id: 'orders', 
      label: 'Mis Pedidos', 
      icon: <ClipboardList size={17} />, 
      badge: ordersCount > 0 ? ordersCount : null 
    }
  ];

  return (
    <header className="navbar-wrapper">
      {/* Top Announcement Bar */}
      <div className="top-announcement-bar">
        <div className="announcement-content">
          <div className="announcement-item">
            <Truck size={13} className="text-emerald-400" />
            <span>Envíos gratis a todo el Perú en compras mayores a S/ 200</span>
          </div>
          <div className="announcement-divider">•</div>
          <div className="announcement-item">
            <ShieldCheck size={13} className="text-indigo-400" />
            <span>Garantía Oficial de Marca & Soporte Técnico Especializado</span>
          </div>
          <div className="announcement-divider">•</div>
          <div className="announcement-item">
            <span>📄 Facturación Electrónica SUNAT (Boleta & Factura)</span>
          </div>
        </div>
      </div>

      {/* Main Navbar: Condicional para Modo Backoffice o Modo Tienda */}
      {isInAdminMode ? (
        <div className="main-navbar-bar navbar-admin-mode">
          <div className="navbar-inner-content">
            {/* Admin Brand Logo */}
            <div className="brand-logo" onClick={() => setActiveTab('admin')}>
              <div className="brand-logo-icon admin-icon-box">
                <Shield size={22} className="text-amber-400" />
              </div>
              <div className="brand-text-block">
                <div className="brand-main-title">
                  NEXUS<span>ADMIN</span>
                  <span className="brand-admin-tag">BACKOFFICE</span>
                </div>
                <div className="brand-subtitle">Panel Central de Gestión & Microservicios</div>
              </div>
            </div>

            {/* Admin Center Indicator */}
            <div className="admin-center-indicator">
              <span className="admin-indicator-dot"></span>
              <span className="admin-indicator-text">Consola de Control del Sistema</span>
            </div>

            {/* Admin Right Actions */}
            <div className="navbar-right-actions">
              <button 
                className="btn-back-to-store" 
                onClick={() => setActiveTab('catalog')}
                title="Regresar a la experiencia de compra de clientes"
              >
                <ShoppingBag size={15} />
                <span>Volver a la Tienda</span>
              </button>

              {currentUser && (
                <div className="navbar-user-pill">
                  <div className="user-pill-avatar avatar-admin">
                    <Shield size={14} />
                  </div>
                  <div className="user-pill-info">
                    <span className="user-pill-name font-mono">@{currentUser.username}</span>
                    <span className="user-pill-role-badge role-admin">ADMINISTRADOR</span>
                  </div>
                  <button 
                    className="user-pill-logout-btn" 
                    onClick={onLogout}
                    title="Cerrar Sesión"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              )}

              {/* Gateway Status Badge */}
              <div 
                className={`gateway-status-pill ${isConnected ? 'pill-online' : 'pill-offline'}`}
                title={isConnected ? 'Gateway conectado en ' + gatewayUrl : 'Gateway desconectado'}
              >
                <span className="status-indicator-dot"></span>
                <span className="status-text-label">
                  {isConnected ? 'Gateway 8080' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="main-navbar-bar">
          <div className="navbar-inner-content">
            {/* Brand Logo */}
            <div className="brand-logo" onClick={() => setActiveTab('catalog')}>
              <div className="brand-logo-icon">
                <Cpu size={22} />
              </div>
              <div className="brand-text-block">
                <div className="brand-main-title">
                  NEXUS<span>TECH</span>
                  <span className="brand-country-tag">PERÚ</span>
                </div>
                <div className="brand-subtitle">Hardware & Soluciones Tecnológicas</div>
              </div>
            </div>

            {/* Navigation Links según el Rol (Clientes vs Administradores) */}
            <nav className="navbar-nav-links">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    className={`nav-link-btn ${isActive ? 'active' : ''} ${item.isSpecial ? 'nav-link-admin-highlight' : ''}`}
                    onClick={() => setActiveTab(item.id)}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-text">{item.label}</span>
                    {item.badge && <span className="nav-badge-count">{item.badge}</span>}
                  </button>
                );
              })}
            </nav>

            {/* Actions & Cart */}
            <div className="navbar-right-actions">
              {/* Botón directo a Panel Admin si el usuario actual es ROLE_ADMIN */}
              {isAdmin && (
                <button 
                  className="btn-admin-shortcut-nav"
                  onClick={() => setActiveTab('admin')}
                  title="Abrir Panel de Control Administrador"
                >
                  <Shield size={15} className="text-amber-400" />
                  <span>Panel Admin</span>
                </button>
              )}

              {/* User Profile / Login Button */}
              {currentUser ? (
                <div className="navbar-user-pill">
                  <div className={`user-pill-avatar ${isAdmin ? 'avatar-admin' : 'avatar-user'}`}>
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt="Avatar" className="user-avatar-img" />
                    ) : isAdmin ? (
                      <Shield size={14} />
                    ) : (
                      <User size={14} />
                    )}
                  </div>
                  <div className="user-pill-info">
                    <span className="user-pill-name font-mono" title={currentUser.fullName || currentUser.username}>
                      {currentUser.fullName ? currentUser.fullName.split(' ')[0] : `@${currentUser.username}`}
                    </span>
                    <span className={`user-pill-role-badge ${isAdmin ? 'role-admin' : currentUser.authProvider === 'google' ? 'role-google' : 'role-user'}`}>
                      {isAdmin ? 'ADMIN' : currentUser.authProvider === 'google' ? 'GOOGLE' : 'CLIENTE'}
                    </span>
                  </div>
                  <button 
                    className="user-pill-logout-btn" 
                    onClick={onLogout}
                    title="Cerrar Sesión"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              ) : (
                <div className="navbar-guest-wrapper">
                  <div className="navbar-guest-tag" title="Navegando de forma anónima y segura">
                    <span className="guest-dot"></span>
                    <span>Modo Invitado</span>
                  </div>
                  <button 
                    className="navbar-auth-btn btn-secondary" 
                    onClick={onOpenAuthModal}
                    title="Iniciar Sesión o Registrarse"
                  >
                    <LogIn size={15} />
                    <span>Ingresar</span>
                  </button>
                </div>
              )}

            {/* Gateway Status Badge */}
            <div 
              className={`gateway-status-pill ${isConnected ? 'pill-online' : 'pill-offline'}`}
              title={isConnected ? 'Gateway conectado en ' + gatewayUrl : 'Gateway desconectado'}
            >
              <span className="status-indicator-dot"></span>
              <span className="status-text-label">
                {isConnected ? 'Gateway 8080' : 'Desconectado'}
              </span>
              <button 
                className="status-refresh-icon-btn" 
                onClick={onRefreshStatus}
                disabled={isChecking}
                title="Comprobar conexión con Gateway"
              >
                <RefreshCw size={12} className={isChecking ? 'spin-icon' : ''} />
              </button>
            </div>

            {/* Shopping Cart Button */}
            <button 
              className="navbar-cart-btn" 
              onClick={onOpenCart}
              title="Abrir Bolsa de Compras"
            >
              <div className="cart-btn-icon-wrapper">
                <ShoppingBag size={19} />
                {cartCount > 0 && (
                  <span className="cart-badge-number">{cartCount}</span>
                )}
              </div>
              <div className="cart-btn-text">
                <span className="cart-btn-label">Bolsa</span>
                <span className="cart-btn-price font-mono">
                  S/ {cartTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </button>

            {/* Config Gateway Gear */}
            <button 
              className="navbar-settings-btn"
              onClick={() => setShowSettings(!showSettings)}
              title="Configurar URL del Gateway o Modo Local"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </div>
    )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="settings-backdrop" onClick={() => setShowSettings(false)}>
          <div className="settings-modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <div className="flex items-center gap-2">
                <Server size={20} className="text-indigo-400" />
                <h3>Configuración de Conexión al Backend</h3>
              </div>
              <button className="close-btn" onClick={() => setShowSettings(false)}>×</button>
            </div>
            <form onSubmit={handleSaveSettings} className="settings-body">
              <div className="settings-group">
                <label>URL Base de Spring Cloud Gateway</label>
                <input
                  type="text"
                  className="form-input font-mono"
                  value={gatewayUrl}
                  onChange={(e) => setLocalGatewayUrl(e.target.value)}
                  placeholder="http://localhost:8080"
                />
                <p className="settings-hint">
                  Puerto del microservicio <code>GATEWAY-Service</code>: <code>http://localhost:8080</code>
                </p>
              </div>


              <div className="settings-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowSettings(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  <Check size={16} /> Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
