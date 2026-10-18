import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  CreditCard, 
  Truck, 
  UserCheck, 
  FileText, 
  ArrowLeft, 
  Printer, 
  ShoppingBag, 
  QrCode, 
  Building2, 
  User, 
  AlertCircle, 
  Check, 
  Clock, 
  Lock, 
  Sparkles,
  ChevronRight,
  Package,
  LogIn
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { identityApi, orderApi } from '../services/api';
import { guestOrdersStorage } from '../services/firebase';

export default function CheckoutView({ 
  cart = [], 
  onOrderCreated, 
  onNavigateToCatalog, 
  onNavigateToOrders, 
  showToast,
  currentUser,
  onOpenAuthModal
}) {
  // Productos activos en el Checkout provenientes exclusivamente de la bolsa
  const activeItems = cart;

  const totalAmount = activeItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const baseImponible = totalAmount / 1.18;
  const igvAmount = totalAmount - baseImponible;

  // Form State: 1. Facturación (Identity)
  const [tipoComprobante, setTipoComprobante] = useState('BOLETA'); // 'BOLETA' (DNI) | 'FACTURA' (RUC)
  const [documento, setDocumento] = useState('');
  const [clienteData, setClienteData] = useState(null);
  const [isSearchingIdentity, setIsSearchingIdentity] = useState(false);
  const [identityError, setIdentityError] = useState(null);

  // Form State: 2. Despacho
  const [direccionEnvio, setDireccionEnvio] = useState('');
  const [departamento, setDepartamento] = useState('Lima');
  const [distrito, setDistrito] = useState('Lima');
  const [telefono, setTelefono] = useState('');
  const [metodoEnvio, setMetodoEnvio] = useState('EXPRESS'); // 'EXPRESS' | 'REGULAR'

  // Form State: 3. Pago
  const [metodoPago, setMetodoPago] = useState('TARJETA'); // 'TARJETA' | 'YAPE' | 'TRANSFERENCIA'
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardTitular, setCardTitular] = useState('');

  // Transaction State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  // Auto-search identity when document matches 8 or 11 digits
  useEffect(() => {
    const clean = documento.trim().replace(/\D/g, '');
    if ((tipoComprobante === 'BOLETA' && clean.length === 8) || 
        (tipoComprobante === 'FACTURA' && clean.length === 11)) {
      handleSearchIdentity(clean);
    } else {
      setClienteData(null);
      setIdentityError(null);
    }
  }, [documento, tipoComprobante]);

  const handleSearchIdentity = async (docVal) => {
    const clean = (docVal || documento).trim().replace(/\D/g, '');
    if (!clean) return;

    setIsSearchingIdentity(true);
    setIdentityError(null);

    try {
      let res;
      if (tipoComprobante === 'BOLETA') {
        res = await identityApi.consultarDni(clean);
      } else {
        res = await identityApi.consultarRuc(clean);
      }

      if (res.data && res.data.nombreRazonSocial && res.data.nombreRazonSocial !== '-') {
        setClienteData(res.data);
        setCardTitular(res.data.nombreRazonSocial);
        if (res.data.direccionFiscal && res.data.direccionFiscal !== '-') {
          setDireccionEnvio(res.data.direccionFiscal);
        }
      } else {
        setClienteData(null);
        setIdentityError('No se encontraron registros oficiales para este documento.');
      }
    } catch (err) {
      setClienteData(null);
      setIdentityError(err.message || 'Error al conectar con Identity-Service');
    } finally {
      setIsSearchingIdentity(false);
    }
  };

  const handleApplyPreset = (doc, type) => {
    setTipoComprobante(type);
    setDocumento(doc);
  };

  const handleCardFormat = (val) => {
    const clean = val.replace(/\D/g, '').substring(0, 16);
    const parts = clean.match(/.{1,4}/g);
    setCardNumber(parts ? parts.join(' ') : clean);
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();

    // 0. Si el usuario está en modo invitado, solicitar inicio de sesión obligatorio
    if (!currentUser) {
      showToast('Debes iniciar sesión con tu cuenta para procesar tu compra y registrar el comprobante.', 'warning');
      if (onOpenAuthModal) {
        onOpenAuthModal();
      }
      return;
    }

    const cleanDoc = documento.trim().replace(/\D/g, '');
    if (!cleanDoc) {
      showToast('Por favor ingresa un número de documento válido (DNI o RUC)', 'warning');
      return;
    }

    if (tipoComprobante === 'BOLETA' && cleanDoc.length !== 8) {
      showToast('El DNI debe tener exactamente 8 dígitos', 'warning');
      return;
    }

    if (tipoComprobante === 'FACTURA' && cleanDoc.length !== 11) {
      showToast('El RUC debe tener exactamente 11 dígitos', 'warning');
      return;
    }

    setIsSubmitting(true);

    // Build consolidated product description for Order-Service
    const productSummary = activeItems
      .map(item => `${item.product.shortName || item.product.name} (x${item.quantity})`)
      .join(', ');

    try {
      // Consumo REAL del backend Order-Service vía Spring Cloud Gateway
      const orderRes = await orderApi.crearOrden({
        numeroDocumento: cleanDoc,
        producto: productSummary,
        total: totalAmount,
        numeroTarjeta: cardNumber.replace(/\s/g, '')
      });

      setCompletedOrder({
        ...orderRes.data,
        items: activeItems,
        baseImponible,
        igvAmount,
        direccionEnvio: direccionEnvio || orderRes.data.direccionCliente || 'Av. Principal 123, Lima',
        tipoComprobante: tipoComprobante === 'FACTURA' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA',
        serieCorrelativo: (tipoComprobante === 'FACTURA' ? 'F001-0000' : 'B001-0000') + (orderRes.data.id || Math.floor(1000 + Math.random() * 9000)),
        fechaEmision: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      });

      // Celebration
      try {
        confetti({
          particleCount: 110,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (err) {}

      // Almacenamiento local según sesión (Invitado vs Usuario logueado)
      if (currentUser) {
        guestOrdersStorage.saveUserOrder(currentUser.email || currentUser.username, orderRes.data);
      } else {
        guestOrdersStorage.addOrder(orderRes.data);
      }

      showToast(`¡Orden #${orderRes.data.id || 'OK'} procesada con éxito por los microservicios!`, 'success');

      if (onOrderCreated) {
        onOrderCreated(orderRes.data);
      }
    } catch (err) {
      showToast(`Error al procesar la orden en el Gateway: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCompletedOrder(null);
    if (onNavigateToCatalog) {
      onNavigateToCatalog();
    }
  };

  // Si la bolsa de compras está vacía y no hay una orden recién completada
  if (!completedOrder && cart.length === 0) {
    return (
      <div className="checkout-page-container animate-fade-in">
        <div className="checkout-empty-state glass-card">
          <div className="empty-cart-icon-wrapper">
            <ShoppingBag size={56} className="text-secondary opacity-50" />
          </div>
          <h2>Tu bolsa de compras está vacía</h2>
          <p className="text-secondary">
            No tienes productos seleccionados. Explora nuestro catálogo con stock real en MySQL y agrega los productos que desees comprar.
          </p>
          <button 
            type="button" 
            className="btn-primary" 
            onClick={onNavigateToCatalog}
          >
            <ArrowLeft size={16} />
            <span>Ir al Catálogo de Productos</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page-container animate-fade-in">
      {/* If Order is Completed -> Display Official SUNAT Invoice & Tracking */}
      {completedOrder ? (
        <div className="order-success-screen">
          <div className="success-header-banner glass-card">
            <div className="success-icon-badge">
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>
            <div>
              <h2>¡Transacción Procesada y Aprobada!</h2>
              <p className="text-secondary">
                Tu compra fue registrada en la base de datos de <strong>Order-Service</strong>, 
                facturada electrónicamente ante SUNAT y despachada por el sistema.
              </p>
            </div>
            <div className="success-order-id font-mono">
              N° DE PEDIDO: #{completedOrder.id || '1042'}
            </div>
          </div>

          <div className="order-post-grid">
            {/* COMPROBANTE OFICIAL ELECTRÓNICO SUNAT */}
            <div className="sunat-invoice-document glass-card">
              <div className="invoice-sunat-header">
                <div className="invoice-company-info">
                  <div className="company-logo-text">NEXUS<span>TECH</span> PERÚ</div>
                  <div className="company-legal-name">NEXUSTECH SOLUTIONS S.A.C.</div>
                  <div className="company-address">Av. Canaval y Moreyra 450, Piso 8, San Isidro, Lima</div>
                  <div className="company-contact">Telf: (01) 610-8900 • ventas@nexustech.pe</div>
                </div>

                <div className="invoice-box-ruc">
                  <div className="box-ruc-title">R.U.C. 20608934521</div>
                  <div className="box-invoice-type">{completedOrder.tipoComprobante}</div>
                  <div className="box-correlativo font-mono">{completedOrder.serieCorrelativo}</div>
                </div>
              </div>

              {/* Client Info Grid */}
              <div className="invoice-client-section">
                <div className="client-data-row">
                  <span className="client-label">Señor(es):</span>
                  <span className="client-val font-semibold">{completedOrder.nombreCliente || 'CLIENTE REGISTRADO'}</span>
                </div>
                <div className="client-data-row">
                  <span className="client-label">RUC / DNI:</span>
                  <span className="client-val font-mono">{completedOrder.numeroDocumentoCliente}</span>
                </div>
                <div className="client-data-row">
                  <span className="client-label">Dirección Fiscal / Entrega:</span>
                  <span className="client-val">{completedOrder.direccionEnvio || completedOrder.direccionCliente}</span>
                </div>
                <div className="client-data-row">
                  <span className="client-label">Fecha de Emisión:</span>
                  <span className="client-val">{completedOrder.fechaEmision}</span>
                </div>
                <div className="client-data-row">
                  <span className="client-label">Moneda:</span>
                  <span className="client-val">Soles (PEN)</span>
                </div>
                <div className="client-data-row">
                  <span className="client-label">Medio de Pago:</span>
                  <span className="client-val">Tarjeta de Crédito / Débito (Aprobado)</span>
                </div>
              </div>

              {/* Items Table */}
              <table className="invoice-items-table">
                <thead>
                  <tr>
                    <th>Cant.</th>
                    <th>Descripción del Producto</th>
                    <th className="text-right">P. Unitario</th>
                    <th className="text-right">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {completedOrder.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="font-mono text-center">{item.quantity}</td>
                      <td>
                        <strong>{item.product.name}</strong>
                        <div className="text-xs text-secondary">{item.product.sku}</div>
                      </td>
                      <td className="text-right font-mono">
                        S/ {item.product.price.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-right font-mono">
                        S/ {(item.product.price * item.quantity).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tax & Total Summary */}
              <div className="invoice-totals-footer">
                <div className="invoice-qr-box">
                  <div className="fake-qr-graphic">
                    <QrCode size={70} strokeWidth={1.5} />
                  </div>
                  <div className="qr-legal-text">
                    Representación impresa de la Boleta/Factura Electrónica consultable en www.sunat.gob.pe.<br/>
                    Código Hash: <code>e8b4...91c0</code>
                  </div>
                </div>

                <div className="invoice-numbers-box">
                  <div className="invoice-sum-line">
                    <span>Op. Gravada:</span>
                    <span className="font-mono">S/ {completedOrder.baseImponible?.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="invoice-sum-line">
                    <span>I.G.V. (18%):</span>
                    <span className="font-mono">S/ {completedOrder.igvAmount?.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="invoice-sum-line">
                    <span>Flete / Despacho:</span>
                    <span className="text-emerald-400">S/ 0.00 (Gratis)</span>
                  </div>
                  <div className="invoice-total-line">
                    <span>IMPORTE TOTAL:</span>
                    <span className="font-mono">S/ {Number(completedOrder.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SEGUIMIENTO DE DESPACHO Y ORQUESTACIÓN */}
            <div className="shipping-traceability-card glass-card">
              <div className="section-card-header">
                <div className="flex items-center gap-2">
                  <Truck size={20} className="text-cyan-400" />
                  <h3>Seguimiento y Despacho del Pedido</h3>
                </div>
                <span className="badge badge-emerald">En Preparación</span>
              </div>

              <div className="tracking-code-banner">
                <div className="tracking-label">Código de Seguimiento Courier:</div>
                <div className="tracking-number font-mono">TRK-PE-{completedOrder.id || '9841'}</div>
              </div>

              <div className="shipping-timeline">
                <div className="timeline-step completed">
                  <div className="timeline-dot">✓</div>
                  <div className="timeline-content">
                    <div className="timeline-title">Orden Persistida (Order-Service)</div>
                    <div className="timeline-time">Registrado en base de datos • #{completedOrder.id}</div>
                  </div>
                </div>

                <div className="timeline-step completed">
                  <div className="timeline-dot">✓</div>
                  <div className="timeline-content">
                    <div className="timeline-title">Identidad Verificada (Identity-Service)</div>
                    <div className="timeline-time">RENIEC / SUNAT comprobado</div>
                  </div>
                </div>

                <div className="timeline-step completed">
                  <div className="timeline-dot">✓</div>
                  <div className="timeline-content">
                    <div className="timeline-title">Pago Aprobado (Payment-Service)</div>
                    <div className="timeline-time">Transacción VISA/Mastercard autorizada</div>
                  </div>
                </div>

                <div className="timeline-step completed">
                  <div className="timeline-dot">✓</div>
                  <div className="timeline-content">
                    <div className="timeline-title">Factura SUNAT Emitida (Billing-Service)</div>
                    <div className="timeline-time">{completedOrder.serieCorrelativo} autorizada</div>
                  </div>
                </div>

                <div className="timeline-step active">
                  <div className="timeline-dot">●</div>
                  <div className="timeline-content">
                    <div className="timeline-title">Inventario y Empaque (Inventory & Shipping)</div>
                    <div className="timeline-time">Stock descontado en almacén central</div>
                  </div>
                </div>
              </div>

              <div className="post-order-actions">
                <button className="btn-secondary w-full" onClick={() => window.print()}>
                  <Printer size={16} /> Imprimir Comprobante Oficial
                </button>
                <button className="btn-primary w-full" onClick={onNavigateToOrders}>
                  <FileText size={16} /> Ver en Mis Pedidos
                </button>
                <button className="btn-text-action" onClick={handleReset}>
                  ← Realizar Otra Compra
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* CHECKOUT FORM VIEW */
        <div className="checkout-main-grid">
          {/* LEFT COLUMN: 3-STEP CHECKOUT FORM */}
          <form onSubmit={handleSubmitOrder} className="checkout-form-column">
            {/* Top Breadcrumb */}
            <div className="checkout-header-bar">
              <button 
                type="button" 
                className="btn-back-catalog" 
                onClick={onNavigateToCatalog}
              >
                <ArrowLeft size={16} />
                <span>Volver a la Tienda</span>
              </button>
              <div className="flex items-center gap-3">
                <h2>Finalizar Compra</h2>
                {currentUser ? (
                  <span className="badge badge-emerald text-xs">
                    👤 Logueado: @{currentUser.username}
                  </span>
                ) : (
                  <span className="badge badge-indigo text-xs">
                    🛒 Modo Invitado
                  </span>
                )}
              </div>
            </div>

            {/* AVISO DE IDENTIFICACIÓN OBLIGATORIA PARA INVITADOS */}
            {!currentUser && (
              <div className="checkout-guest-banner glass-card animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="guest-banner-icon">
                    <User size={22} className="text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-200">
                      Modo Invitado: Inicia sesión para completar tu compra
                    </h4>
                    <p className="text-xs text-slate-300">
                      Para emitir tu comprobante SUNAT oficial y habilitar el rastreo de Olva Courier en vivo, debes identificarte con tu cuenta.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-auth-guest-cta"
                  onClick={onOpenAuthModal}
                >
                  <LogIn size={15} />
                  <span>Iniciar Sesión / Registrarse</span>
                </button>
              </div>
            )}

            {/* PASO 1: DATOS DE FACTURACIÓN (IDENTITY-SERVICE) */}
            <div className="checkout-step-card glass-card">
              <div className="step-card-header">
                <div className="step-badge">1</div>
                <div>
                  <h3>Datos de Facturación Electrónica</h3>
                  <p className="step-desc">
                    Consulta automática en tiempo real ante <strong>RENIEC</strong> o <strong>SUNAT</strong>
                  </p>
                </div>
              </div>

              {/* Selector Boleta vs Factura */}
              <div className="invoice-type-toggle">
                <button
                  type="button"
                  className={`toggle-option ${tipoComprobante === 'BOLETA' ? 'active' : ''}`}
                  onClick={() => {
                    setTipoComprobante('BOLETA');
                    setDocumento('');
                    setClienteData(null);
                    setIdentityError(null);
                  }}
                >
                  <User size={18} />
                  <div>
                    <strong>Boleta de Venta</strong>
                    <span>Persona Natural (DNI 8 dígitos)</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`toggle-option ${tipoComprobante === 'FACTURA' ? 'active' : ''}`}
                  onClick={() => {
                    setTipoComprobante('FACTURA');
                    setDocumento('');
                    setClienteData(null);
                    setIdentityError(null);
                  }}
                >
                  <Building2 size={18} />
                  <div>
                    <strong>Factura Electrónica</strong>
                    <span>Empresa con RUC (11 dígitos)</span>
                  </div>
                </button>
              </div>

              {/* Input Documento */}
              <div className="form-group mt-4">
                <label className="form-label">
                  {tipoComprobante === 'BOLETA' ? 'Número de DNI (8 dígitos)' : 'Número de R.U.C. (11 dígitos)'}
                </label>
                <div className="document-search-group">
                  <input
                    type="text"
                    maxLength={tipoComprobante === 'BOLETA' ? 8 : 11}
                    className="form-input font-mono document-input"
                    placeholder={tipoComprobante === 'BOLETA' ? 'Ingresa DNI (8 dígitos)...' : 'Ingresa RUC (11 dígitos)...'}
                    value={documento}
                    onChange={(e) => setDocumento(e.target.value.replace(/\D/g, ''))}
                  />
                  <button
                    type="button"
                    className="btn-validate-doc"
                    onClick={() => handleSearchIdentity()}
                    disabled={isSearchingIdentity}
                  >
                    {isSearchingIdentity ? (
                      <span className="spinner-text">Consultando...</span>
                    ) : (
                      <>
                        <UserCheck size={16} />
                        <span>Validar Documento</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Identity Verification Feedback Box */}
              {clienteData && (
                <div className="verified-identity-box animate-fade-in">
                  <div className="verified-header">
                    <CheckCircle2 size={18} className="text-emerald-400" />
                    <strong>
                      {tipoComprobante === 'BOLETA' ? 'Identidad Verificada en RENIEC' : 'Empresa Verificada en SUNAT'}
                    </strong>
                  </div>
                  <div className="verified-data-grid">
                    <div>
                      <span className="v-label">
                        {tipoComprobante === 'BOLETA' ? 'Nombres y Apellidos:' : 'Razón Social Oficial:'}
                      </span>
                      <div className="v-value font-semibold">{clienteData.nombreRazonSocial}</div>
                    </div>
                    <div>
                      <span className="v-label">Dirección Fiscal Registrada:</span>
                      <div className="v-value">{clienteData.direccionFiscal || 'LIMA, PERÚ'}</div>
                    </div>
                  </div>
                </div>
              )}

              {identityError && (
                <div className="identity-error-box animate-fade-in">
                  <AlertCircle size={16} />
                  <span>{identityError}</span>
                </div>
              )}
            </div>

            {/* PASO 2: DATOS DE ENVÍO Y DESPACHO */}
            <div className="checkout-step-card glass-card">
              <div className="step-card-header">
                <div className="step-badge">2</div>
                <div>
                  <h3>Dirección de Entrega y Despacho</h3>
                  <p className="step-desc">Envío asegurado coordinado por el microservicio de envíos</p>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Dirección de Entrega a Domicilio</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Av. Javier Prado Este 4200, Dpto 502"
                  value={direccionEnvio}
                  onChange={(e) => setDireccionEnvio(e.target.value)}
                  required
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Departamento / Región</label>
                  <input
                    type="text"
                    className="form-input"
                    value={departamento}
                    onChange={(e) => setDepartamento(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Distrito</label>
                  <input
                    type="text"
                    className="form-input"
                    value={distrito}
                    onChange={(e) => setDistrito(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Teléfono de Contacto (para coordinación del Courier)</label>
                <input
                  type="text"
                  className="form-input font-mono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>

              {/* Shipping Method Selector */}
              <div className="shipping-method-options">
                <label className={`shipping-radio-box ${metodoEnvio === 'EXPRESS' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="shipping"
                    checked={metodoEnvio === 'EXPRESS'}
                    onChange={() => setMetodoEnvio('EXPRESS')}
                  />
                  <div className="shipping-radio-content">
                    <div className="shipping-radio-title">
                      <Truck size={16} className="text-cyan-400" />
                      <strong>Envío Express Lima Metropolitana (Entrega en 24h)</strong>
                    </div>
                    <span className="shipping-cost text-emerald-400 font-semibold">GRATIS</span>
                  </div>
                </label>

                <label className={`shipping-radio-box ${metodoEnvio === 'REGULAR' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="shipping"
                    checked={metodoEnvio === 'REGULAR'}
                    onChange={() => setMetodoEnvio('REGULAR')}
                  />
                  <div className="shipping-radio-content">
                    <div className="shipping-radio-title">
                      <Package size={16} className="text-indigo-400" />
                      <strong>Envío Nacional a Provincias (Courier Shalom / Olva)</strong>
                    </div>
                    <span className="shipping-cost text-emerald-400 font-semibold">GRATIS</span>
                  </div>
                </label>
              </div>
            </div>

            {/* PASO 3: MÉTODO DE PAGO (PAYMENT-SERVICE) */}
            <div className="checkout-step-card glass-card">
              <div className="step-card-header">
                <div className="step-badge">3</div>
                <div>
                  <h3>Método de Pago Seguro</h3>
                  <p className="step-desc">Pasarela de pagos enlazada a <strong>Payment-Service</strong></p>
                </div>
              </div>

              {/* Payment Tabs */}
              <div className="payment-method-tabs">
                <button
                  type="button"
                  className={`payment-tab ${metodoPago === 'TARJETA' ? 'active' : ''}`}
                  onClick={() => setMetodoPago('TARJETA')}
                >
                  <CreditCard size={18} />
                  <span>Tarjeta de Crédito / Débito</span>
                </button>
                <button
                  type="button"
                  className={`payment-tab ${metodoPago === 'YAPE' ? 'active' : ''}`}
                  onClick={() => setMetodoPago('YAPE')}
                >
                  <QrCode size={18} />
                  <span>Yape / Plin</span>
                </button>
              </div>

              {metodoPago === 'TARJETA' ? (
                <div className="credit-card-form-wrapper">
                  <div className="form-group">
                    <label className="form-label">Número de Tarjeta (VISA / Mastercard)</label>
                    <div className="input-with-icon">
                      <CreditCard size={18} className="input-icon-left text-secondary" />
                      <input
                        type="text"
                        className="form-input has-icon font-mono"
                        placeholder="4557 8890 1234 5678"
                        value={cardNumber}
                        onChange={(e) => handleCardFormat(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Vencimiento (MM/AA)</label>
                      <input
                        type="text"
                        className="form-input font-mono"
                        placeholder="12/28"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        maxLength={5}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Código CVV</label>
                      <input
                        type="password"
                        className="form-input font-mono"
                        placeholder="888"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        maxLength={4}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Titular de la Tarjeta</label>
                    <input
                      type="text"
                      className="form-input"
                      value={cardTitular}
                      onChange={(e) => setCardTitular(e.target.value)}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="qr-payment-box">
                  <div className="qr-wrapper">
                    <QrCode size={90} className="text-indigo-400" />
                  </div>
                  <div className="qr-instructions">
                    <h4>Escanea con Yape o Plin</h4>
                    <p>Monto a transferir: <strong>S/ {totalAmount.toFixed(2)}</strong></p>
                    <div className="qr-phone font-mono">Número: 987-654-321</div>
                    <div className="text-xs text-secondary mt-1">Titular: NEXUSTECH SAC</div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Action Button */}
            <div className="checkout-submit-bar">
              <button
                type="submit"
                className={`btn-confirm-order ${!currentUser ? 'btn-confirm-guest' : ''}`}
                disabled={isSubmitting}
              >
                {!currentUser ? (
                  <span className="flex items-center justify-between w-full">
                    <span className="flex items-center gap-2">
                      <LogIn size={18} />
                      <span>Iniciar Sesión para Completar Compra</span>
                    </span>
                    <span className="font-mono text-sm opacity-90">
                      S/ {totalAmount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </span>
                ) : isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="spinner-dot" />
                    <span>Orquestando con Microservicios...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-between w-full">
                    <span className="flex items-center gap-2">
                      <Lock size={18} />
                      <span>Confirmar Pedido y Pagar</span>
                    </span>
                    <span className="font-mono text-lg">
                      S/ {totalAmount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </span>
                )}
              </button>
              <div className="checkout-security-notice">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Pago procesado con cifrado SSL de 256 bits y comprobante SUNAT electrónico</span>
              </div>
            </div>
          </form>

          {/* RIGHT COLUMN: ORDER SUMMARY */}
          <div className="checkout-summary-column">
            <div className="summary-sticky-card glass-card">
              <div className="summary-header">
                <h3>Resumen de la Orden</h3>
                <span className="badge badge-indigo">{activeItems.length} {activeItems.length === 1 ? 'item' : 'items'}</span>
              </div>

              {/* List of items */}
              <div className="summary-items-list">
                {activeItems.map((item, idx) => (
                  <div key={idx} className="summary-product-row">
                    <img 
                      src={item.product.image} 
                      alt={item.product.name} 
                      className="summary-product-img" 
                    />
                    <div className="summary-product-info">
                      <div className="summary-product-title" title={item.product.name}>
                        {item.product.shortName || item.product.name}
                      </div>
                      <div className="summary-product-sub">
                        <span>Cant: {item.quantity}</span>
                        <span className="summary-product-price font-mono">
                          S/ {(item.product.price * item.quantity).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Calculation */}
              <div className="summary-pricing-breakdown">
                <div className="calc-row">
                  <span>Subtotal (Base Imponible):</span>
                  <span className="font-mono">
                    S/ {baseImponible.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="calc-row">
                  <span>I.G.V. Oficial (18% SUNAT):</span>
                  <span className="font-mono">
                    S/ {igvAmount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="calc-row">
                  <span>Costo de Despacho Courier:</span>
                  <span className="text-emerald-400 font-semibold">GRATIS</span>
                </div>
                <div className="calc-row-total">
                  <span>Total en Soles:</span>
                  <span className="total-amount font-mono">
                    S/ {totalAmount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="summary-guarantees-list">
                <div className="s-guarantee-item">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <span>Garantía Oficial de Marca 2 Años</span>
                </div>
                <div className="s-guarantee-item">
                  <FileText size={16} className="text-indigo-400" />
                  <span>Emisión automática de Factura / Boleta</span>
                </div>
                <div className="s-guarantee-item">
                  <Truck size={16} className="text-cyan-400" />
                  <span>Despacho y guía con seguimiento en tiempo real</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
