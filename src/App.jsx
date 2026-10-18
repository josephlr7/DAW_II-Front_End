import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import CatalogView from './components/CatalogView';
import CheckoutView from './components/CheckoutView';
import CartDrawer from './components/CartDrawer';
import IdentityLookupView from './components/IdentityLookupView';
import OrdersDashboardView from './components/OrdersDashboardView';
import ArchitectureView from './components/ArchitectureView';
import AdminDashboardView from './components/AdminDashboardView';
import AuthModal from './components/AuthModal';
import Toast from './components/Toast';
import { orderApi, systemApi, authApi } from './services/api';
import { guestOrdersStorage, signOutFirebase } from './services/firebase';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'checkout' | 'orders' | 'identity' | 'architecture' | 'admin'
  const [currentUser, setCurrentUser] = useState(() => authApi.getStoredUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [toast, setToast] = useState(null);

  // Toast notification helper
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToast({ message, type, id });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 4500);
  }, []);

  // Check Gateway Connectivity
  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      const res = await systemApi.verificarConexion();
      setIsConnected(res.ok);
    } catch {
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Fetch Orders from Gateway / Order-Service
  const fetchOrders = useCallback(async () => {
    setIsOrdersLoading(true);
    try {
      const res = await orderApi.listarOrdenes();
      if (Array.isArray(res.data)) {
        setOrders(res.data);
      }
    } catch (err) {
      console.warn('Order-Service en espera o sin conexión:', err.message);
    } finally {
      setIsOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    if (activeTab === 'orders' || activeTab === 'admin') {
      fetchOrders();
    }
  }, [checkStatus, fetchOrders, activeTab]);

  // Cart operations
  const handleAddToCart = (product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: Math.min(product.stock, item.quantity + quantity) }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const handleUpdateCartQty = (productId, newQty) => {
    if (newQty <= 0) {
      handleRemoveCartItem(productId);
      return;
    }
    setCart((prev) => 
      prev.map(item => 
        item.product.id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const handleRemoveCartItem = (productId) => {
    setCart((prev) => prev.filter(item => item.product.id !== productId));
  };

  const handleOrderCreated = (newOrder) => {
    setOrders((prev) => [newOrder, ...prev]);
    setCart([]); // Clear cart after successful checkout
  };

  // Auth operations
  const handleAuthSuccess = (user, token) => {
    setCurrentUser(user);
    // If admin logged in, navigate straight to admin view
    if (user.role === 'ROLE_ADMIN') {
      setActiveTab('admin');
    }
  };

  const handleLogout = async () => {
    await signOutFirebase();
    authApi.clearSession();
    setCurrentUser(null);
    showToast('Sesión cerrada correctamente. Ahora estás en Modo Invitado.', 'info');
    if (activeTab === 'admin') {
      setActiveTab('catalog');
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Cantidad de pedidos visibles en el Navbar según el rol
  const getOrdersCountForNav = () => {
    if (currentUser?.role === 'ROLE_ADMIN') {
      return orders.length;
    }
    if (currentUser) {
      const userOrders = guestOrdersStorage.getUserOrders(currentUser.email || currentUser.username);
      return userOrders.length;
    }
    return guestOrdersStorage.getOrders().length;
  };

  return (
    <div className="app-wrapper">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
        isChecking={isChecking}
        onRefreshStatus={checkStatus}
        ordersCount={getOrdersCountForNav()}
        cartCount={cartCount}
        cartTotal={cartTotal}
        onOpenCart={() => setIsCartOpen(true)}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Cart Slide-Over Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onProceedToCheckout={() => setActiveTab('checkout')}
      />

      {/* Main View Area */}
      <main className="main-content">
        {activeTab === 'catalog' && (
          <CatalogView
            onAddToCart={handleAddToCart}
            onNavigateToCheckout={() => setActiveTab('checkout')}
            onNavigateToAdmin={() => setActiveTab('admin')}
            showToast={showToast}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'checkout' && (
          <CheckoutView
            cart={cart}
            onOrderCreated={handleOrderCreated}
            onNavigateToCatalog={() => setActiveTab('catalog')}
            onNavigateToOrders={() => setActiveTab('orders')}
            showToast={showToast}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersDashboardView
            orders={orders}
            isLoading={isOrdersLoading}
            onRefresh={fetchOrders}
            onNavigateToCatalog={() => setActiveTab('catalog')}
            showToast={showToast}
            currentUser={currentUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboardView 
            showToast={showToast} 
            currentUser={currentUser}
            onCurrentUserRoleChange={(updatedUser) => setCurrentUser(updatedUser)}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onAuthSuccess={handleAuthSuccess}
            onNavigateToCatalog={() => setActiveTab('catalog')}
          />
        )}
      </main>

      {/* Commercial Authentic Footer */}
      <footer className="store-footer">
        <div className="footer-container">
          <div className="footer-columns-grid">
            <div className="footer-brand-col">
              <div className="footer-brand-title">
                NEXUS<span>TECH</span>
                <span className="brand-country-tag">PERÚ</span>
              </div>
              <p className="footer-brand-desc">
                Líder en venta de hardware de alta gama, laptops para gaming y soluciones de arquitectura tecnológica empresarial en el Perú.
              </p>
              <div className="footer-legal-tag">
                R.U.C. 20608934521 • NEXUSTECH SOLUTIONS S.A.C.
              </div>
            </div>

            <div className="footer-col">
              <h4>Atención al Cliente</h4>
              <ul>
                <li><span>Preguntas Frecuentes</span></li>
                <li><span>Políticas de Garantía</span></li>
                <li><span>Envíos y Despacho a Nivel Nacional</span></li>
                <li><span>Términos y Condiciones</span></li>
                <li><span>Libro de Reclamaciones Virtual</span></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Comprobantes & Pagos</h4>
              <ul>
                <li><span>Facturación Electrónica SUNAT</span></li>
                <li><span>Consulta de Validez de Comprobantes</span></li>
                <li><span>Tarjetas de Crédito / Débito (VISA, MC)</span></li>
                <li><span>Pagos con Yape & Plin</span></li>
                <li><span>Transferencias BCP, BBVA, Interbank</span></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Portal Corporativo</h4>
              <ul>
                <li>
                  <button className="footer-link-btn" onClick={() => setActiveTab('admin')}>
                    🔒 Acceso Administradores (Backoffice)
                  </button>
                </li>
                <li><span>Plataforma Distribuida de Alta Disponibilidad</span></li>
                <li><span>Seguridad Cifrada JWT & Roles RBAC</span></li>
                <li><span>Auditoría RENIEC & SUNAT Integrada</span></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom-bar">
            <div>
              © 2026 NEXUSTECH PERÚ S.A.C. Todos los derechos reservados.
            </div>
            <div className="footer-badges-list">
              <span>🔒 Transacciones Cifradas SSL</span>
              <span>✓ Homologado con SUNAT</span>
              <span>🚀 Microservicios Distribuidos</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal (Login & Register with Roles) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        showToast={showToast}
      />

      {/* Global Toast Message */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
