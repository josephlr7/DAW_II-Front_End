import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Star, 
  Check, 
  Filter, 
  Sparkles, 
  ShieldCheck, 
  Truck, 
  CreditCard, 
  Flame,
  ArrowRight,
  RefreshCw,
  Plus,
  Shield,
  Database,
  Package
} from 'lucide-react';
import { CATEGORIES } from '../data/products';
import { productApi } from '../services/api';

export default function CatalogView({ onAddToCart, onNavigateToCheckout, onNavigateToAdmin, showToast, currentUser }) {
  const [productsList, setProductsList] = useState([]);
  const [isSyncedWithBackend, setIsSyncedWithBackend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [addedProductId, setAddedProductId] = useState(null);

  // Cargar catálogo desde MySQL (Product-Service) en tiempo real
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await productApi.listarProductos();
      const list = Array.isArray(res.data) ? res.data : [];
      setProductsList(list);
      setIsSyncedWithBackend(true);
    } catch (err) {
      console.warn('Error al conectar con Product-Service:', err);
      setIsSyncedWithBackend(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Filter & Sort
  const filteredProducts = useMemo(() => {
    let list = productsList.filter((item) => {
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const specsText = Array.isArray(item.specs) ? item.specs.join(' ') : (item.description || '');
      const matchQuery = !q || 
        item.name?.toLowerCase().includes(q) || 
        item.categoryLabel?.toLowerCase().includes(q) ||
        specsText.toLowerCase().includes(q);
      return matchCategory && matchQuery;
    });

    if (sortBy === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    }

    return list;
  }, [productsList, selectedCategory, searchQuery, sortBy]);

  const handleAdd = (product) => {
    onAddToCart(product);
    setAddedProductId(product.id);
    showToast(`"${product.shortName || product.name}" agregado a tu bolsa`, 'success');
    setTimeout(() => {
      setAddedProductId((curr) => (curr === product.id ? null : curr));
    }, 1500);
  };

  return (
    <div className="catalog-view animate-fade-in">
      {/* Hero Commercial Banner */}
      <section className="hero-banner">
        <div className="hero-content">
          <div className="hero-badge">
            <Flame size={14} className="text-amber-400" />
            <span>CyberTech Days • Hardware de Alto Rendimiento 2026</span>
          </div>
          <h1 className="hero-title">
            Potencia tu Setup con Tecnología de <span>Nueva Generación</span>
          </h1>
          <p className="hero-description">
            Equipos gamers, componentes tope de gama y periféricos de grado profesional con garantía oficial, 
            despacho inmediato a todo el Perú y facturación electrónica válida ante la SUNAT.
          </p>
          <div className="hero-actions">
            <button 
              className="btn-hero-primary" 
              onClick={() => {
                const el = document.getElementById('catalog-products-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span>Explorar Catálogo</span>
              <ArrowRight size={18} />
            </button>
            <div className="hero-guarantees">
              <div className="guarantee-item">
                <Truck size={16} className="text-emerald-400" />
                <span>Envío 24h Lima</span>
              </div>
              <div className="guarantee-item">
                <ShieldCheck size={16} className="text-indigo-400" />
                <span>Garantía Oficial 2 Años</span>
              </div>
              <div className="guarantee-item">
                <CreditCard size={16} className="text-cyan-400" />
                <span>Hasta 12 cuotas sin interés</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Section */}
      <div id="catalog-products-section" className="catalog-main-content">
        {/* Controls: Categories & Search */}
        <div className="catalog-toolbar">
          <div className="categories-pill-list">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="catalog-filters-row">
            <div className="catalog-search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Buscar por procesador, modelo, tarjeta gráfica..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="catalog-search-input"
              />
              {searchQuery && (
                <button 
                  className="clear-input-btn" 
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="catalog-sort-wrapper">
              <label htmlFor="sort-select" className="sort-label">Ordenar:</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="catalog-sort-select"
              >
                <option value="featured">Destacados & Novedades</option>
                <option value="price-asc">Precio: de menor a mayor</option>
                <option value="price-desc">Precio: de mayor a menor</option>
                <option value="rating">Mejor Calificados ★</option>
              </select>
            </div>
          </div>
        </div>

        {/* Live MySQL Sync & CRUD Admin Shortcut Bar */}
        <div className="catalog-status-bar glass-card">
          <div className="status-sync-indicator">
            <span className={`sync-dot ${isSyncedWithBackend ? 'online' : 'fallback'}`}></span>
            <span className="font-mono text-sm">
              {isSyncedWithBackend 
                ? `● Catálogo en Vivo: ${productsList.length} productos conectados a MySQL (Product-Service:8096)` 
                : '● Conectando con Product-Service...'}
            </span>
          </div>
          <div className="catalog-bar-actions">
            <button 
              className="btn-sync-action btn-secondary" 
              onClick={loadProducts} 
              disabled={isLoading}
              title="Refrescar catálogo desde MySQL"
            >
              <RefreshCw size={13} className={isLoading ? 'spin-icon' : ''} />
              <span>Sincronizar</span>
            </button>
            {currentUser?.role === 'ROLE_ADMIN' && onNavigateToAdmin && (
              <button 
                className="btn-crud-shortcut btn-primary" 
                onClick={onNavigateToAdmin}
                title="Administrar, Crear, Editar o Eliminar productos en el Panel Admin"
              >
                <Plus size={14} />
                <span>Administrar Productos (CRUD)</span>
              </button>
            )}
          </div>
        </div>

        {/* Results Counter */}
        <div className="catalog-meta-info">
          <span>Mostrando <strong>{filteredProducts.length}</strong> productos disponibles</span>
        </div>

        {/* Product Cards Grid */}
        <div className="products-showcase-grid">
          {filteredProducts.map((prod) => {
            const isAdded = addedProductId === prod.id;
            const discountPct = prod.originalPrice 
              ? Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100) 
              : 0;

            return (
              <div key={prod.id} className="store-product-card glass-card">
                {/* Image and Badges */}
                <div className="product-image-box">
                  {prod.image ? (
                    <img 
                      src={prod.image} 
                      alt={prod.name} 
                      loading="lazy"
                      className="product-main-img" 
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const ph = e.target.parentElement.querySelector('.product-no-image-placeholder');
                        if (ph) ph.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="product-no-image-placeholder"
                    style={{ display: prod.image ? 'none' : 'flex' }}
                  >
                    <Package size={36} className="placeholder-box-icon" />
                    <span className="placeholder-box-title">Sin imagen asignada</span>
                    <span className="placeholder-box-sub">Sube una foto desde Admin</span>
                  </div>

                  <div className="product-card-badges">
                    {prod.tag && (
                      <span className={`tag-badge tag-${prod.tagColor || 'indigo'}`}>
                        {prod.tag}
                      </span>
                    )}
                    {discountPct > 0 && (
                      <span className="tag-discount">-{discountPct}%</span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="product-card-body">
                  <div className="product-sku-row">
                    <span className="product-category-name">{prod.categoryLabel}</span>
                    <span className="product-sku font-mono">{prod.sku}</span>
                  </div>

                  <h3 className="product-title" title={prod.name}>
                    {prod.name}
                  </h3>

                  {/* Specs List */}
                  <ul className="product-specs-list">
                    {(Array.isArray(prod.specs) 
                      ? prod.specs.slice(0, 3) 
                      : (prod.description ? prod.description.split('•').slice(0, 3).map(s => s.trim()).filter(Boolean) : [])
                    ).map((spec, i) => (
                      <li key={i} className="spec-item">
                        <span className="spec-bullet">✓</span>
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Rating */}
                  <div className="product-rating-row">
                    <div className="stars-wrapper">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={13} 
                          className={i < Math.floor(prod.rating) ? 'star-filled' : 'star-empty'} 
                        />
                      ))}
                    </div>
                    <span className="rating-num font-mono">{prod.rating}</span>
                    <span className="reviews-count">({prod.reviewsCount})</span>
                    <span className="stock-indicator">
                      ● Stock: {prod.stock} un.
                    </span>
                  </div>

                  {/* Price & Action */}
                  <div className="product-pricing-footer">
                    <div className="price-box">
                      {prod.originalPrice && (
                        <span className="original-price font-mono">
                          S/ {prod.originalPrice.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      <div className="current-price font-mono">
                        S/ {prod.price.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <span className="tax-included-label">Inc. I.G.V. 18%</span>
                    </div>

                    <button
                      className={`btn-add-to-cart ${isAdded ? 'btn-added' : ''}`}
                      onClick={() => handleAdd(prod)}
                    >
                      {isAdded ? (
                        <>
                          <Check size={16} />
                          <span>¡Agregado!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={16} />
                          <span>Agregar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Loading State */}
        {isLoading && productsList.length === 0 && (
          <div className="no-products-found glass-card animate-pulse">
            <RefreshCw size={36} className="spin-icon text-indigo-400 mb-3" />
            <h3>Consultando Product-Service (MySQL)...</h3>
            <p className="text-secondary">Obteniendo catálogo de productos en tiempo real.</p>
          </div>
        )}

        {/* Empty Database State */}
        {!isLoading && productsList.length === 0 && (
          <div className="no-products-found glass-card">
            <Database size={40} className="text-secondary opacity-50 mb-3" />
            <h3>No hay productos registrados en MySQL</h3>
            <p>La base de datos de <strong>Product-Service</strong> no tiene productos activos en este momento.</p>
            <button className="btn-primary mt-4" onClick={loadProducts}>
              <RefreshCw size={14} />
              <span>Volver a intentar</span>
            </button>
          </div>
        )}

        {/* Filtered 0 Results */}
        {!isLoading && productsList.length > 0 && filteredProducts.length === 0 && (
          <div className="no-products-found glass-card">
            <Search size={40} className="text-secondary opacity-40 mb-3" />
            <h3>No se encontraron productos coincidentes</h3>
            <p>Intenta con otros términos o cambia la categoría seleccionada.</p>
            <button 
              className="btn-secondary mt-4" 
              onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
            >
              Restablecer Filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
