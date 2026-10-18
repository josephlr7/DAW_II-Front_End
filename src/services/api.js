/**
 * API Service Layer para conexión con Spring Cloud Gateway (puerto 8080)
 * Comunicación 100% REAL con los microservicios:
 * - Identity-Service: /api/identity/dni/{dni} y /api/identity/ruc/{ruc} (RENIEC / SUNAT en vivo)
 * - Order-Service: /api/orders (Creación en base de datos y listado real)
 * - Payment-Service: /api/payments
 * - Billing-Service: /api/billing
 */

const DEFAULT_GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://18.220.173.242:8080';

export const getGatewayUrl = () => {
  // En despliegues HTTPS (ej. Vercel https://*.vercel.app):
  // Si no hay una URL personalizada con HTTPS explícito, usamos '' (rutas relativas /api/*)
  // para que el proxy reverso de vercel.json reenvíe las peticiones a AWS EC2 (puerto 8080)
  // evitando que el navegador bloquee las solicitudes por 'Mixed Content' (HTTPS a HTTP).
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    const saved = localStorage.getItem('GATEWAY_URL');
    if (saved && saved.startsWith('https://')) {
      return saved;
    }
    return '';
  }
  return localStorage.getItem('GATEWAY_URL') || DEFAULT_GATEWAY_URL;
};

export const setGatewayUrl = (url) => {
  localStorage.setItem('GATEWAY_URL', url.trim());
};

// Base HTTP Fetcher con timeout y métricas de latencia
async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {})
      }
    });

    const endTime = performance.now();
    const durationMs = Math.round(endTime - startTime);

    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMsg = typeof data === 'string' ? data : (data.error || data.message || `Error HTTP ${response.status}`);
      throw new Error(errorMsg);
    }

    return { data, durationMs, status: response.status, ok: true };
  } catch (error) {
    const endTime = performance.now();
    const durationMs = Math.round(endTime - startTime);

    if (error.name === 'AbortError') {
      throw new Error(`Tiempo de espera agotado (${timeoutMs / 1000}s) al conectar con el backend (${url}).`);
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}

// ----------------------------------------------------
// SERVICIOS EXPORTADOS (DATOS 100% REALES)
// ----------------------------------------------------

export const identityApi = {
  // Consulta directa a RENIEC a través del Gateway
  async consultarDni(dni) {
    const cleanDni = (dni || '').trim().replace(/\D/g, '');
    if (!cleanDni || cleanDni.length !== 8) {
      throw new Error('El DNI debe tener exactamente 8 dígitos numéricos.');
    }

    const gateway = getGatewayUrl();
    const res = await fetchWithTimeout(`${gateway}/api/identity/dni/${encodeURIComponent(cleanDni)}`);
    
    if (!res.data || !res.data.nombreRazonSocial || res.data.nombreRazonSocial === '-') {
      throw new Error(`No se encontró registro para el DNI ${cleanDni} en la base de datos de RENIEC.`);
    }

    return res;
  },

  // Consulta directa a SUNAT a través del Gateway
  async consultarRuc(ruc) {
    const cleanRuc = (ruc || '').trim().replace(/\D/g, '');
    if (!cleanRuc || cleanRuc.length !== 11) {
      throw new Error('El RUC debe tener exactamente 11 dígitos numéricos.');
    }

    const gateway = getGatewayUrl();
    const res = await fetchWithTimeout(`${gateway}/api/identity/ruc/${encodeURIComponent(cleanRuc)}`);
    
    if (!res.data || !res.data.nombreRazonSocial || res.data.nombreRazonSocial === '-') {
      throw new Error(`No se encontró registro para el RUC ${cleanRuc} en la base de datos de SUNAT.`);
    }

    return res;
  },

  // Detección automática por longitud
  async consultarAutomatico(doc) {
    const clean = (doc || '').trim().replace(/\D/g, '');
    if (clean.length === 8) {
      return this.consultarDni(clean);
    } else if (clean.length === 11) {
      return this.consultarRuc(clean);
    } else {
      throw new Error('El documento debe contener 8 dígitos (DNI) o 11 dígitos (RUC)');
    }
  }
};

export const orderApi = {
  // Crear una nueva orden consumiendo Spring Cloud Gateway -> Order-Service
  async crearOrden({ numeroDocumento, producto, total, numeroTarjeta }) {
    const cleanDoc = (numeroDocumento || '').trim();
    const parsedTotal = parseFloat(total);

    if (!cleanDoc) {
      throw new Error('Debe ingresar un número de documento válido (DNI o RUC).');
    }

    const gateway = getGatewayUrl();
    const res = await fetchWithTimeout(`${gateway}/api/orders`, {
      method: 'POST',
      body: JSON.stringify({
        numeroDocumento: cleanDoc,
        producto,
        total: parsedTotal,
        numeroTarjeta: numeroTarjeta || '4557-XXXX-XXXX-1234'
      })
    }, 15000);

    return res;
  },

  // Listar todas las órdenes registradas en Order-Service (desde MySQL en tiempo real)
  async listarOrdenes() {
    const gateway = getGatewayUrl();
    const res = await fetchWithTimeout(`${gateway}/api/orders`, {
      method: 'GET'
    });
    
    return {
      data: Array.isArray(res.data) ? res.data : [],
      durationMs: res.durationMs,
      status: res.status,
      ok: true
    };
  }
};

export const productApi = {
  // Listar productos desde MySQL (db_products) a través del Gateway
  async listarProductos(category = '', includeInactive = false) {
    const gateway = getGatewayUrl();
    const params = new URLSearchParams();
    if (category && category !== 'all') {
      params.append('category', category);
    }
    if (includeInactive) {
      params.append('includeInactive', 'true');
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetchWithTimeout(`${gateway}/api/products${query}`);
    return {
      data: Array.isArray(res.data) ? res.data : [],
      durationMs: res.durationMs,
      status: res.status,
      ok: true
    };
  },

  async obtenerProducto(id) {
    const gateway = getGatewayUrl();
    return await fetchWithTimeout(`${gateway}/api/products/${id}`);
  },

  async crearProducto(producto) {
    const gateway = getGatewayUrl();
    return await fetchWithTimeout(`${gateway}/api/products`, {
      method: 'POST',
      body: JSON.stringify(producto)
    });
  },

  async actualizarProducto(id, producto) {
    const gateway = getGatewayUrl();
    return await fetchWithTimeout(`${gateway}/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(producto)
    });
  },

  async eliminarProducto(id) {
    const gateway = getGatewayUrl();
    return await fetchWithTimeout(`${gateway}/api/products/${id}`, {
      method: 'DELETE'
    });
  },

  async subirImagen(file) {
    const gateway = getGatewayUrl();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${gateway}/api/products/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || 'Error al subir imagen a Cloudinary');
    }
    return await res.json();
  }
};

export const systemApi = {
  // Comprobación de estado en vivo de Spring Cloud Gateway
  async verificarConexion() {
    const gateway = getGatewayUrl();
    try {
      let res;
      try {
        // Consultar Product-Service (puerto 8096 vía Gateway 8080)
        res = await fetch(`${gateway}/api/products`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(3000)
        });
      } catch {
        // Fallback a identity
        res = await fetch(`${gateway}/api/identity/dni/ping`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(3000)
        });
      }

      return {
        ok: res.ok || res.status === 200 || res.status === 404,
        status: res.status,
        url: gateway
      };
    } catch (err) {
      return {
        ok: false,
        error: err.message,
        url: gateway
      };
    }
  }
};

export const authApi = {
  // Iniciar sesión
  async login(username, password) {
    const gateway = getGatewayUrl();
    const res = await fetchWithTimeout(`${gateway}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    return res;
  },

  // Registrar nuevo usuario (con rol opcional: ROLE_USER o ROLE_ADMIN)
  async register({ username, email, password, fullName, role = 'ROLE_USER' }) {
    const gateway = getGatewayUrl();
    const res = await fetchWithTimeout(`${gateway}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ username, email, password, fullName, role })
    });
    return res;
  },

  // Listar todos los usuarios registrados (para panel de administración)
  async listarUsuarios() {
    const gateway = getGatewayUrl();
    const res = await fetchWithTimeout(`${gateway}/api/auth/users`, {
      method: 'GET'
    });
    return {
      data: Array.isArray(res.data) ? res.data : [],
      durationMs: res.durationMs,
      status: res.status,
      ok: true
    };
  },

  // Validar token JWT
  async validateToken(token) {
    const gateway = getGatewayUrl();
    const res = await fetchWithTimeout(`${gateway}/api/auth/validate?token=${encodeURIComponent(token)}`);
    return res;
  },

  // Cambiar rol de un usuario (Solo Administrador)
  async cambiarRolUsuario(userId, role) {
    const gateway = getGatewayUrl();
    const res = await fetchWithTimeout(`${gateway}/api/auth/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    });
    return res;
  },

  // Helpers de sesión en LocalStorage
  getStoredUser() {
    try {
      const u = localStorage.getItem('NEXUS_AUTH_USER');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  getStoredToken() {
    return localStorage.getItem('NEXUS_AUTH_TOKEN') || null;
  },

  saveSession(token, user) {
    if (token) localStorage.setItem('NEXUS_AUTH_TOKEN', token);
    if (user) localStorage.setItem('NEXUS_AUTH_USER', JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem('NEXUS_AUTH_TOKEN');
    localStorage.removeItem('NEXUS_AUTH_USER');
  }
};
