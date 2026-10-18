import React, { useState } from 'react';
import { 
  Network, 
  Server, 
  Radio, 
  ShieldCheck, 
  CreditCard, 
  FileText, 
  ShoppingCart, 
  Package, 
  Truck, 
  Bell, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Activity,
  Layers,
  ExternalLink
} from 'lucide-react';
import { getGatewayUrl, systemApi } from '../services/api';

const SERVICES_CATALOG = [
  {
    id: 'eureka',
    name: 'EUREKA-SERVER',
    port: '8761',
    role: 'Discovery & Service Registry',
    url: 'http://localhost:8761',
    route: 'N/A',
    icon: <Radio size={18} />,
    color: '#a855f7',
    desc: 'Registro automático de instancias de microservicios con auto-discovery.'
  },
  {
    id: 'gateway',
    name: 'GATEWAY-Service',
    port: '8080',
    role: 'API Gateway & Reverse Proxy',
    url: 'http://localhost:8080',
    route: '/**',
    icon: <Network size={18} />,
    color: '#6366f1',
    desc: 'Punto único de entrada, enrutamiento dinámico, balanceo de carga y control CORS.'
  },
  {
    id: 'identity',
    name: 'Identity-Service',
    port: '8081 / Dinámico',
    role: 'Validación RENIEC & SUNAT',
    url: 'http://localhost:8080/api/identity',
    route: '/api/identity/**',
    icon: <ShieldCheck size={18} />,
    color: '#06b6d4',
    desc: 'Consulta en vivo a las APIs peruanas de DNI (RENIEC) y RUC (SUNAT) con apiperu.dev.'
  },
  {
    id: 'order',
    name: 'Order-Service',
    port: '8082 / Dinámico',
    role: 'Orquestador de Compras',
    url: 'http://localhost:8080/api/orders',
    route: '/api/orders/**',
    icon: <ShoppingCart size={18} />,
    color: '#10b981',
    desc: 'Orquesta el flujo transaccional distribuido llamando a los demás servicios vía Feign Clients.'
  },
  {
    id: 'payment',
    name: 'Payment-Service',
    port: '8083 / Dinámico',
    role: 'Pasarela de Pagos',
    url: 'http://localhost:8080/api/payments',
    route: '/api/payments/**',
    icon: <CreditCard size={18} />,
    color: '#f59e0b',
    desc: 'Procesamiento y autorización de pagos para cada orden registrada.'
  },
  {
    id: 'billing',
    name: 'Billing-Service',
    port: '8084 / Dinámico',
    role: 'Facturación Electrónica',
    url: 'http://localhost:8080/api/billing',
    route: '/api/billing/**',
    icon: <FileText size={18} />,
    color: '#ec4899',
    desc: 'Emisión y generación legal de Boletas y Facturas electrónicas formato SUNAT.'
  },
  {
    id: 'inventory',
    name: 'Inventory-Service',
    port: '8085 / Dinámico',
    role: 'Control de Stock',
    url: 'http://localhost:8080/api/inventory',
    route: '/api/inventory/**',
    icon: <Package size={18} />,
    color: '#3b82f6',
    desc: 'Validación en tiempo real y descuento automático de stock por producto.'
  },
  {
    id: 'shipping',
    name: 'Shipping-Service',
    port: '8086 / Dinámico',
    role: 'Logística & Despacho',
    url: 'http://localhost:8080/api/shipping',
    route: '/api/shipping/**',
    icon: <Truck size={18} />,
    color: '#14b8a6',
    desc: 'Asignación de número de guía, tracking y programación de entrega del paquete.'
  },
  {
    id: 'notification',
    name: 'Notification-Service',
    port: '8087 / Dinámico',
    role: 'Alertas & Notificaciones',
    url: 'http://localhost:8080/api/notifications',
    route: '/api/notifications/**',
    icon: <Bell size={18} />,
    color: '#8b5cf6',
    desc: 'Envío de correos y confirmaciones push del estado de la orden al cliente.'
  }
];

export default function ArchitectureView({ showToast }) {
  const [gatewayStatus, setGatewayStatus] = useState(null);
  const [isPinging, setIsPinging] = useState(false);

  const checkGatewayPing = async () => {
    setIsPinging(true);
    try {
      const res = await systemApi.verificarConexion();
      setGatewayStatus(res);
      if (res.ok) {
        showToast('Spring Cloud Gateway respondiendo correctamente', 'success');
      } else {
        showToast('No se detectó respuesta en ' + res.url, 'warning');
      }
    } catch (e) {
      setGatewayStatus({ ok: false, error: e.message });
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className="architecture-view animate-fade-in">
      <div className="view-header-row">
        <div>
          <h2>Monitor de Microservicios & Infraestructura</h2>
          <p className="view-subtitle">
            Observabilidad de la arquitectura Spring Boot + Spring Cloud Gateway + Eureka Server
          </p>
        </div>
        <div className="header-actions-flex">
          <button 
            className="btn-primary" 
            onClick={checkGatewayPing}
            disabled={isPinging}
          >
            <RefreshCw size={15} className={isPinging ? 'spin-icon' : ''} />
            <span>Probar Conectividad Gateway (8080)</span>
          </button>
        </div>
      </div>

      {/* Gateway Status Health Box */}
      {gatewayStatus && (
        <div className={`gateway-status-banner glass-card ${gatewayStatus.ok ? 'online' : 'offline'}`}>
          <div className="flex items-center gap-3">
            <Activity size={22} className={gatewayStatus.ok ? 'text-emerald-400' : 'text-amber-400'} />
            <div>
              <strong>
                {gatewayStatus.ok ? 'Gateway Activo y Enlazado' : 'Gateway Desconectado / Sin Respuesta'}
              </strong>
              <div className="text-xs opacity-80 font-mono">
                URL configurada: {getGatewayUrl() || 'Proxy Vercel (/api -> AWS EC2:8080)'} • {gatewayStatus.isDemo ? 'Modo Local / Demo' : 'HTTP Status: ' + (gatewayStatus.status || 'Offline')}
              </div>
            </div>
          </div>
          <span className={`badge ${gatewayStatus.ok ? 'badge-emerald' : 'badge-amber'}`}>
            {gatewayStatus.ok ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
      )}

      {/* Services Grid */}
      <div className="services-status-grid">
        {SERVICES_CATALOG.map((svc) => (
          <div key={svc.id} className="service-node-card glass-card">
            <div className="service-card-top">
              <div className="service-icon-box" style={{ background: `${svc.color}20`, color: svc.color }}>
                {svc.icon}
              </div>
              <div className="service-card-meta">
                <span className="service-port font-mono">{svc.port}</span>
                <span className="badge badge-emerald">Configurado</span>
              </div>
            </div>

            <h3 className="service-title">{svc.name}</h3>
            <div className="service-role text-indigo-400">{svc.role}</div>
            <p className="service-desc">{svc.desc}</p>

            <div className="service-route-box">
              <span className="route-label">Ruta Gateway:</span>
              <code className="route-code font-mono">{svc.route}</code>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
