import React from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowRight, 
  ShieldCheck, 
  Truck 
} from 'lucide-react';

export default function CartDrawer({ 
  isOpen, 
  onClose, 
  cart, 
  onUpdateQty, 
  onRemoveItem, 
  onProceedToCheckout 
}) {
  if (!isOpen) return null;

  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const baseImponible = total / 1.18;
  const igv = total - baseImponible;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="cart-backdrop" onClick={onClose}>
      <div className="cart-drawer glass-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cart-header">
          <div className="flex items-center gap-2">
            <ShoppingBag size={22} className="text-indigo-400" />
            <div>
              <h3 className="cart-title">Bolsa de Compras</h3>
              <p className="cart-subtitle">{totalItems} {totalItems === 1 ? 'producto' : 'productos'} seleccionados</p>
            </div>
          </div>
          <button className="cart-close-btn" onClick={onClose} aria-label="Cerrar carrito">
            <X size={20} />
          </button>
        </div>

        {/* Free Shipping Progress */}
        <div className="cart-shipping-banner">
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <Truck size={14} />
            <span>
              {total >= 200 
                ? '¡Felicidades! Tienes Envío Gratis a todo el Perú' 
                : `Agrega S/ ${(200 - total).toFixed(2)} más para Envío Gratis`}
            </span>
          </div>
          <div className="shipping-progress-bar">
            <div 
              className="shipping-progress-fill" 
              style={{ width: `${Math.min(100, (total / 200) * 100)}%` }}
            />
          </div>
        </div>

        {/* Item List */}
        <div className="cart-items-container">
          {cart.length === 0 ? (
            <div className="cart-empty-state">
              <div className="empty-cart-icon">
                <ShoppingBag size={48} strokeWidth={1.5} />
              </div>
              <h4>Tu bolsa está vacía</h4>
              <p>Explora nuestro catálogo de hardware y tecnología de última generación.</p>
              <button className="btn-primary mt-4" onClick={onClose}>
                Ver Catálogo de Productos
              </button>
            </div>
          ) : (
            <div className="cart-items-list">
              {cart.map(({ product, quantity }) => (
                <div key={product.id} className="cart-item-card">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="cart-item-img" 
                  />
                  <div className="cart-item-details">
                    <div className="cart-item-category">{product.categoryLabel}</div>
                    <div className="cart-item-title" title={product.name}>{product.shortName || product.name}</div>
                    <div className="cart-item-price">
                      S/ {product.price.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </div>

                    <div className="cart-item-actions">
                      <div className="qty-control">
                        <button 
                          className="qty-btn" 
                          onClick={() => onUpdateQty(product.id, quantity - 1)}
                          disabled={quantity <= 1}
                        >
                          <Minus size={13} />
                        </button>
                        <span className="qty-number font-mono">{quantity}</span>
                        <button 
                          className="qty-btn" 
                          onClick={() => onUpdateQty(product.id, quantity + 1)}
                          disabled={quantity >= product.stock}
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <button 
                        className="remove-item-btn" 
                        onClick={() => onRemoveItem(product.id)}
                        title="Eliminar producto"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer / Summary */}
        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-summary-breakdown">
              <div className="summary-line">
                <span>Op. Gravada (Base):</span>
                <span className="font-mono">S/ {baseImponible.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="summary-line">
                <span>I.G.V. (18% Oficial):</span>
                <span className="font-mono">S/ {igv.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="summary-line">
                <span>Costo de Despacho:</span>
                <span className="text-emerald-400 font-semibold">
                  {total >= 200 ? 'GRATIS' : 'S/ 15.00'}
                </span>
              </div>
              <div className="summary-total-line">
                <span className="total-label">Total a Pagar:</span>
                <span className="total-val font-mono">
                  S/ {total.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <button 
              className="btn-checkout-primary"
              onClick={() => {
                onProceedToCheckout();
                onClose();
              }}
            >
              <span>Continuar con la Compra</span>
              <ArrowRight size={18} />
            </button>

            <div className="cart-security-badge">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Transacción cifrada • Facturación oficial electrónica SUNAT</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
