import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Search, 
  RefreshCw, 
  FileText, 
  Printer, 
  X, 
  ShoppingBag, 
  DollarSign, 
  CheckCircle2, 
  User, 
  Calendar, 
  ArrowRight, 
  Download, 
  Building2, 
  QrCode,
  LogIn,
  ShieldAlert,
  Shield,
  Sparkles,
  Package,
  Info,
  Truck,
  Clock,
  MapPin,
  ExternalLink,
  Check
} from 'lucide-react';
import { guestOrdersStorage } from '../services/firebase';
import { shippingApi } from '../services/api';

export default function OrdersDashboardView({ 
  orders = [], 
  isLoading, 
  onRefresh, 
  onNavigateToCatalog, 
  onNavigateToAdmin,
  showToast,
  currentUser,
  onOpenAuthModal
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderModal, setSelectedOrderModal] = useState(null);
  const [shippingsMap, setShippingsMap] = useState({});
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState(null);
  const [activeTrackingData, setActiveTrackingData] = useState(null);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);

  useEffect(() => {
    onRefresh();
    // Cargar despachos de Shipping-Service
    shippingApi.listarEnvios().then((res) => {
      if (Array.isArray(res.data)) {
        const map = {};
        res.data.forEach((s) => {
          if (s.orderId) map[s.orderId] = s;
        });
        setShippingsMap(map);
      }
    }).catch((err) => {
      console.warn('Shipping-Service no disponible o inicializando:', err.message);
    });
  }, []);

  const handleOpenTracking = async (ord) => {
    setSelectedTrackingOrder(ord);
    setIsLoadingTracking(true);
    try {
      const res = await shippingApi.obtenerPorOrden(ord.id);
      setActiveTrackingData(res.data);
    } catch {
      setActiveTrackingData(shippingsMap[ord.id] || {
        orderId: ord.id,
        estadoEnvio: 'ALISTANDO_PEDIDO',
        courier: 'Olva Courier',
        numeroGuia: `OLV-${String(ord.id).padStart(6, '0')}`,
        direccionDestino: ord.direccionCliente || 'Dirección registrada en la compra'
      });
    } finally {
      setIsLoadingTracking(false);
    }
  };

  const getShippingBadge = (estado) => {
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

  const isGuest = !currentUser;
  const isAdmin = currentUser?.role === 'ROLE_ADMIN';

  // 1. Obtener órdenes de sesión de invitado
  const guestSessionOrders = guestOrdersStorage.getOrders();

  // 2. Obtener órdenes persistidas del usuario logueado
  const userStoredOrders = currentUser 
    ? guestOrdersStorage.getUserOrders(currentUser.email || currentUser.username) 
    : [];

  // 3. Determinar qué órdenes mostrar según el modo y rol
  let baseOrders = [];

  if (isAdmin) {
    // Administrador: puede auditar todas las órdenes registradas en Order-Service
    baseOrders = orders;
  } else if (currentUser) {
    // Cliente logueado: fusionar sus compras locales y coincidencias en la BD
    const matchedBackend = orders.filter(o => {
      const uName = (currentUser.username || '').toLowerCase();
      const emailPrefix = (currentUser.email || '').split('@')[0].toLowerCase();
      const fullName = (currentUser.fullName || '').toLowerCase();
      const clientName = (o.nombreCliente || '').toLowerCase();
      return (
        (fullName && clientName && (clientName.includes(fullName) || fullName.includes(clientName))) ||
        (uName && clientName && clientName.includes(uName)) ||
        (emailPrefix && clientName && clientName.includes(emailPrefix))
      );
    });

    const combined = [...userStoredOrders, ...matchedBackend];
    baseOrders = Array.from(new Map(combined.map(item => [item.id, item])).values());
  } else {
    // MODO INVITADO: Privacidad total.
    // Si ha escrito un N° de pedido o DNI/RUC en el buscador de rastreo, busca en la BD de órdenes
    const searchClean = searchTerm.trim().toLowerCase();
    if (searchClean.length >= 1) {
      baseOrders = orders.filter(o => 
        String(o.id).toLowerCase() === searchClean || 
        (o.numeroDocumentoCliente && o.numeroDocumentoCliente.toLowerCase() === searchClean)
      );
    } else {
      // Por defecto solo ve sus compras de esta sesión
      baseOrders = guestSessionOrders;
    }
  }

  // Filtrado adicional si el usuario logueado o admin escribe en la barra
  const displayOrders = (currentUser || isAdmin) && searchTerm.trim()
    ? baseOrders.filter((order) => {
        const term = searchTerm.toLowerCase();
        return (
          (order.id && String(order.id).toLowerCase().includes(term)) ||
          (order.numeroDocumentoCliente && order.numeroDocumentoCliente.toLowerCase().includes(term)) ||
          (order.nombreCliente && order.nombreCliente.toLowerCase().includes(term)) ||
          (order.producto && order.producto.toLowerCase().includes(term))
        );
      })
    : baseOrders;

  const totalGastado = displayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(displayOrders, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `mis_pedidos_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Historial descargado exitosamente', 'success');
  };

  return (
    <div className="orders-dashboard-view animate-fade-in">
      {/* Top Header */}
      <div className="view-header-row">
        <div>
          <h2>
            {isAdmin 
              ? 'Auditoría General de Pedidos (Backoffice)' 
              : isGuest 
                ? 'Rastreo de Pedidos • Modo Invitado' 
                : 'Mis Pedidos & Comprobantes Oficiales'}
          </h2>
          <p className="view-subtitle">
            {isAdmin 
              ? 'Vista de control administrativo de todas las órdenes persistidas en Order-Service' 
              : isGuest 
                ? 'Consulta las compras de esta sesión o rastrea cualquier pedido ingresando tu N° de orden o DNI' 
                : `Compras registradas a nombre de ${currentUser.fullName || currentUser.username}`}
          </p>
        </div>

        <div className="header-actions-flex">
          <button 
            className="btn-secondary" 
            onClick={onRefresh} 
            disabled={isLoading}
            title="Refrescar órdenes desde el backend"
          >
            <RefreshCw size={15} className={isLoading ? 'spin-icon' : ''} />
            <span>Refrescar</span>
          </button>
          {displayOrders.length > 0 && (
            <button className="btn-secondary" onClick={handleExportJson}>
              <Download size={15} />
              <span>Exportar Data</span>
            </button>
          )}
          <button className="btn-primary" onClick={onNavigateToCatalog}>
            <ShoppingBag size={15} />
            <span>Seguir Comprando</span>
          </button>
        </div>
      </div>

      {/* BANNER DE ACCESO DIRECTO PARA ADMINISTRADOR */}
      {isAdmin && (
        <div className="admin-shortcut-alert glass-card animate-fade-in" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
          padding: '1.2rem 1.5rem',
          marginBottom: '1.75rem',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(99, 102, 241, 0.12))',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 10px 30px -10px rgba(245, 158, 11, 0.2)',
          flexWrap: 'wrap'
        }}>
          <div className="flex items-center gap-3">
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(245, 158, 11, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fbbf24',
              flexShrink: 0
            }}>
              <Shield size={22} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', color: '#fef3c7', fontSize: '1rem', fontWeight: 700 }}>
                Estás visualizando el módulo de pedidos como Administrador
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1' }}>
                Para gestionar productos (crear/editar stock), cambiar estados logísticos a Olva Courier o administrar roles de usuarios, abre la consola central.
              </p>
            </div>
          </div>
          <button 
            className="btn-primary" 
            onClick={onNavigateToAdmin}
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#0f172a',
              fontWeight: 700,
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap'
            }}
          >
            <Shield size={16} />
            <span>Ir al Panel de Control Administrador</span>
          </button>
        </div>
      )}

      {/* BANNER INFORMATIVO PARA MODO INVITADO */}
      {isGuest && (
        <div className="guest-mode-banner glass-card animate-fade-in">
          <div className="guest-banner-icon">
            <Info size={24} className="text-cyan-400" />
          </div>
          <div className="guest-banner-text">
            <h4>Estás navegando en Modo Invitado</h4>
            <p>
              Por seguridad y privacidad comercial, no se muestra el historial de otros clientes. 
              Inicia sesión con tu cuenta de <strong>Google</strong> para vincular tus compras automáticamente y acceder a tus comprobantes en cualquier dispositivo.
            </p>
          </div>
          <button 
            className="btn-google-pill" 
            onClick={onOpenAuthModal}
            title="Iniciar sesión con Google para sincronizar compras"
          >
            <svg className="google-icon-svg" viewBox="0 0 24 24" width="16" height="16">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Conectar con Google</span>
          </button>
        </div>
      )}

      {/* KPI METRICS (PERSONALIZADAS) */}
      <div className="kpi-metrics-grid">
        <div className="metric-card glass-card">
          <div className="metric-icon-box bg-emerald-glow">
            <DollarSign size={20} className="text-emerald-400" />
          </div>
          <div>
            <div className="metric-label">{isAdmin ? 'Facturación Global' : 'Monto de Compras'}</div>
            <div className="metric-value font-mono">
              S/ {totalGastado.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="metric-subtext">Comprobantes válidos SUNAT</div>
          </div>
        </div>

        <div className="metric-card glass-card">
          <div className="metric-icon-box bg-indigo-glow">
            <ClipboardList size={20} className="text-indigo-400" />
          </div>
          <div>
            <div className="metric-label">{isAdmin ? 'Órdenes Globales' : 'Mis Pedidos'}</div>
            <div className="metric-value font-mono">{displayOrders.length}</div>
            <div className="metric-subtext">
              {isAdmin ? 'En base de datos' : isGuest ? 'En sesión de invitado' : 'En tu cuenta'}
            </div>
          </div>
        </div>

        <div className="metric-card glass-card">
          <div className="metric-icon-box bg-cyan-glow">
            <User size={20} className="text-cyan-400" />
          </div>
          <div>
            <div className="metric-label">Estado de Sesión</div>
            <div className="metric-value font-mono" style={{ fontSize: '1.25rem' }}>
              {isAdmin ? 'ADMINISTRADOR' : isGuest ? 'MODO INVITADO' : 'CLIENTE VERIFICADO'}
            </div>
            <div className="metric-subtext">
              {isAdmin ? 'Acceso total a auditoría' : isGuest ? 'Sin cuenta vinculada' : `@${currentUser.username}`}
            </div>
          </div>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y TABLA DE PEDIDOS */}
      <div className="orders-table-card glass-card">
        <div className="orders-toolbar">
          <div className="search-box-input">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder={isGuest 
                ? "🔍 Rastrear pedido: Ingresa tu N° de orden (ej. 1) o tu DNI/RUC..." 
                : "Buscar en mis pedidos por N° de orden, producto o documento..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="table-search-input"
            />
            {searchTerm && (
              <button className="clear-btn" onClick={() => setSearchTerm('')}>✕</button>
            )}
          </div>
          <div className="orders-count-label">
            {displayOrders.length} {displayOrders.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'}
          </div>
        </div>

        {displayOrders.length === 0 ? (
          <div className="no-orders-box">
            <Package size={52} className="text-secondary opacity-30 mb-3" />
            {isGuest ? (
              <>
                <h4>No tienes pedidos registrados en esta sesión de invitado</h4>
                <p>
                  Si compraste anteriormente, escribe arriba tu <strong>N° de Pedido</strong> o tu <strong>DNI</strong> para localizarlo en tiempo real.
                </p>
                <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
                  <button className="btn-primary" onClick={onNavigateToCatalog}>
                    <ShoppingBag size={15} />
                    <span>Explorar Catálogo</span>
                  </button>
                  <button className="btn-secondary" onClick={onOpenAuthModal}>
                    <LogIn size={15} />
                    <span>Iniciar Sesión / Google</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <h4>Aún no registras pedidos en tu cuenta</h4>
                <p>Realiza tu primera compra para ver tus boletas o facturas electrónicas de la SUNAT aquí.</p>
                <button className="btn-primary mt-4" onClick={onNavigateToCatalog}>
                  Ir a la Tienda
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="orders-data-table">
              <thead>
                <tr>
                  <th>N° Pedido</th>
                  <th>Cliente / Razón Social</th>
                  <th>Documento</th>
                  <th>Detalle de Productos</th>
                  <th className="text-right">Total (PEN)</th>
                  <th className="text-center">Estado Pago</th>
                  <th className="text-center">Seguimiento Logístico</th>
                  <th className="text-center">Comprobante SUNAT</th>
                </tr>
              </thead>
              <tbody>
                {displayOrders.map((ord) => {
                  const isRuc = ord.numeroDocumentoCliente?.length === 11;
                  const ship = shippingsMap[ord.id];
                  const badgeInfo = getShippingBadge(ship?.estadoEnvio);
                  return (
                    <tr key={ord.id} className="order-row-hover">
                      <td className="font-mono font-bold text-indigo-400">
                        #{ord.id}
                      </td>
                      <td>
                        <div className="client-name font-semibold">{ord.nombreCliente || 'Cliente'}</div>
                        <div className="client-address text-xs text-secondary">{ord.direccionCliente || 'Lima, Perú'}</div>
                      </td>
                      <td>
                        <span className={`doc-tag ${isRuc ? 'doc-ruc' : 'doc-dni'}`}>
                          {isRuc ? 'RUC: ' : 'DNI: '} {ord.numeroDocumentoCliente}
                        </span>
                      </td>
                      <td>
                        <div className="product-summary-cell" title={ord.producto}>
                          {ord.producto}
                        </div>
                      </td>
                      <td className="text-right font-mono font-bold">
                        S/ {Number(ord.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="text-center">
                        <span className="badge badge-emerald">
                          <CheckCircle2 size={12} /> Aprobado
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className={`shipping-badge ${badgeInfo.className}`}>
                            {badgeInfo.icon}
                            <span>{badgeInfo.label}</span>
                          </span>
                          <button
                            className="btn-tracking-action"
                            onClick={() => handleOpenTracking(ord)}
                            title="Ver línea de tiempo y estado en Olva Courier"
                          >
                            <Truck size={13} />
                            <span>Rastrear</span>
                          </button>
                        </div>
                      </td>
                      <td className="text-center">
                        <button
                          className="btn-view-voucher"
                          onClick={() => setSelectedOrderModal(ord)}
                          title="Ver Comprobante Electrónico SUNAT"
                        >
                          <FileText size={15} />
                          <span>Ver {isRuc ? 'Factura' : 'Boleta'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE COMPROBANTE OFICIAL ELECTRÓNICO */}
      {selectedOrderModal && (
        <div className="modal-backdrop" onClick={() => setSelectedOrderModal(null)}>
          <div className="invoice-modal-card glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-indigo-400" />
                <h3>Comprobante Electrónico Oficial SUNAT</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedOrderModal(null)}>✕</button>
            </div>

            <div className="modal-body-scrollable">
              <div className="sunat-invoice-document compact">
                <div className="invoice-sunat-header">
                  <div className="invoice-company-info">
                    <div className="company-logo-text">NEXUS<span>TECH</span> PERÚ</div>
                    <div className="company-legal-name">NEXUSTECH SOLUTIONS S.A.C.</div>
                    <div className="company-address">Av. Canaval y Moreyra 450, Piso 8, San Isidro, Lima</div>
                  </div>

                  <div className="invoice-box-ruc">
                    <div className="box-ruc-title">R.U.C. 20608934521</div>
                    <div className="box-invoice-type">
                      {selectedOrderModal.numeroDocumentoCliente?.length === 11 
                        ? 'FACTURA ELECTRÓNICA' 
                        : 'BOLETA DE VENTA ELECTRÓNICA'}
                    </div>
                    <div className="box-correlativo font-mono">
                      {(selectedOrderModal.numeroDocumentoCliente?.length === 11 ? 'F001-0000' : 'B001-0000') + selectedOrderModal.id}
                    </div>
                  </div>
                </div>

                <div className="invoice-client-section">
                  <div className="client-data-row">
                    <span className="client-label">Cliente / Razón Social:</span>
                    <span className="client-val font-semibold">{selectedOrderModal.nombreCliente}</span>
                  </div>
                  <div className="client-data-row">
                    <span className="client-label">RUC / DNI:</span>
                    <span className="client-val font-mono">{selectedOrderModal.numeroDocumentoCliente}</span>
                  </div>
                  <div className="client-data-row">
                    <span className="client-label">Dirección Fiscal:</span>
                    <span className="client-val">{selectedOrderModal.direccionCliente || 'Lima, Perú'}</span>
                  </div>
                  <div className="client-data-row">
                    <span className="client-label">Concepto Facturado:</span>
                    <span className="client-val">{selectedOrderModal.producto}</span>
                  </div>
                </div>

                <div className="invoice-totals-footer">
                  <div className="invoice-qr-box">
                    <QrCode size={50} />
                    <span className="text-xs text-secondary">Autorizado mediante Resolución SUNAT</span>
                  </div>
                  <div className="invoice-numbers-box">
                    <div className="invoice-sum-line">
                      <span>Op. Gravada:</span>
                      <span className="font-mono">S/ {(selectedOrderModal.total / 1.18).toFixed(2)}</span>
                    </div>
                    <div className="invoice-sum-line">
                      <span>I.G.V. (18%):</span>
                      <span className="font-mono">S/ {(selectedOrderModal.total - (selectedOrderModal.total / 1.18)).toFixed(2)}</span>
                    </div>
                    <div className="invoice-total-line">
                      <span>IMPORTE TOTAL:</span>
                      <span className="font-mono">S/ {Number(selectedOrderModal.total).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions-bar">
              <button className="btn-secondary" onClick={() => window.print()}>
                <Printer size={16} /> Imprimir Comprobante
              </button>
              <button className="btn-primary" onClick={() => setSelectedOrderModal(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SEGUIMIENTO LOGÍSTICO Y TRACKING (SHIPPING-SERVICE) */}
      {selectedTrackingOrder && (
        <div className="modal-backdrop" onClick={() => setSelectedTrackingOrder(null)}>
          <div className="invoice-modal-card glass-card animate-scale-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <Truck size={22} className="text-indigo-400" />
                <div>
                  <h3 style={{ margin: 0 }}>Seguimiento de Despacho • Pedido #{selectedTrackingOrder.id}</h3>
                  <div className="text-xs text-muted">Sincronizado en tiempo real vía Shipping-Service</div>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedTrackingOrder(null)}>✕</button>
            </div>

            <div className="p-4">
              {isLoadingTracking ? (
                <div className="text-center py-8">
                  <RefreshCw size={24} className="spin-icon text-indigo-400 mx-auto mb-2" />
                  <p className="text-sm text-muted">Consultando estado en Shipping-Service...</p>
                </div>
              ) : (
                <>
                  {/* Stepper Visual */}
                  <div className="tracking-stepper-wrapper">
                    <div className="tracking-stepper">
                      <div className="stepper-connector-line">
                        <div 
                          className="stepper-connector-progress"
                          style={{
                            width: (() => {
                              const st = activeTrackingData?.estadoEnvio;
                              if (st === 'ENTREGADO') return '100%';
                              if (st === 'EN_OLVA_COURIER') return '66%';
                              if (st === 'ALISTANDO_PEDIDO') return '33%';
                              return '0%';
                            })()
                          }}
                        />
                      </div>

                      {[
                        { id: 'EN_VERIFICACION', label: 'Verificación', sublabel: 'Pago y DNI/RUC', icon: <Clock size={16} />, order: 0 },
                        { id: 'ALISTANDO_PEDIDO', label: 'En Almacén', sublabel: 'Picking & Packing', icon: <Package size={16} />, order: 1 },
                        { id: 'EN_OLVA_COURIER', label: 'Olva Courier', sublabel: 'En Ruta', icon: <Truck size={16} />, order: 2 },
                        { id: 'ENTREGADO', label: 'Entregado', sublabel: 'En Domicilio', icon: <Check size={16} />, order: 3 }
                      ].map((step) => {
                        const currentStatus = activeTrackingData?.estadoEnvio || 'ALISTANDO_PEDIDO';
                        const statusOrderMap = { 'EN_VERIFICACION': 0, 'ALISTANDO_PEDIDO': 1, 'EN_OLVA_COURIER': 2, 'ENTREGADO': 3 };
                        const currentOrder = statusOrderMap[currentStatus] ?? 1;
                        const isCompleted = step.order < currentOrder;
                        const isCurrent = step.order === currentOrder;

                        return (
                          <div 
                            key={step.id} 
                            className={`stepper-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                          >
                            <div className="stepper-icon-circle">
                              {isCompleted ? <Check size={18} /> : step.icon}
                            </div>
                            <span className="stepper-label">{step.label}</span>
                            <span className="stepper-sublabel">{step.sublabel}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Informacion de la Guía y Courier */}
                  <div className="tracking-info-grid">
                    <div className="tracking-info-box">
                      <div className="info-label">Empresa Transportista</div>
                      <div className="info-val flex items-center gap-2">
                        <span className="olva-brand-tag">
                          <Truck size={13} /> {activeTrackingData?.courier || 'Olva Courier'}
                        </span>
                      </div>
                    </div>

                    <div className="tracking-info-box">
                      <div className="info-label">N° de Guía / Tracking</div>
                      <div className="info-val font-mono text-indigo-400 font-bold">
                        {activeTrackingData?.numeroGuia || `OLV-${String(selectedTrackingOrder.id).padStart(6, '0')}`}
                      </div>
                    </div>

                    <div className="tracking-info-box" style={{ gridColumn: 'span 2' }}>
                      <div className="info-label flex items-center gap-1">
                        <MapPin size={12} /> Dirección de Entrega Registrada
                      </div>
                      <div className="info-val text-sm font-normal text-slate-300">
                        {activeTrackingData?.direccionDestino || selectedTrackingOrder.direccionCliente || 'Dirección registrada durante la compra'}
                      </div>
                    </div>

                    {activeTrackingData?.notas && (
                      <div className="tracking-info-box" style={{ gridColumn: 'span 2' }}>
                        <div className="info-label">Notas del Operador Logístico</div>
                        <div className="info-val text-xs text-amber-300 font-normal italic">
                          "{activeTrackingData.notas}"
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Alerta de tiempo real */}
                  <div className="mt-4 p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-xs text-slate-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>Seguimiento sincronizado con Olva Courier Express Perú</span>
                    </div>
                    <a 
                      href={activeTrackingData?.trackingUrl || `https://www.olvacourier.com/tracking?guia=${activeTrackingData?.numeroGuia || 'OLV-000001'}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                    >
                      <span>Web Olva</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </>
              )}
            </div>

            <div className="modal-actions-bar">
              <button className="btn-primary w-full" onClick={() => setSelectedTrackingOrder(null)}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
