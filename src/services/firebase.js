/**
 * Firebase Authentication Service (100% Gratuito - Plan Spark de Google)
 * Credenciales oficiales del proyecto proyecto-cibertec configuradas a nivel de código.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut
} from 'firebase/auth';

// Configuración oficial de Firebase del proyecto
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBjsAFQFQj4-nonOI36em6A564j0LXwCGo",
  authDomain: "proyecto-cibertec-36cc6.firebaseapp.com",
  projectId: "proyecto-cibertec-36cc6",
  storageBucket: "proyecto-cibertec-36cc6.firebasestorage.app",
  messagingSenderId: "464080368716",
  appId: "1:464080368716:web:6d3c012437722ef62530e9",
  measurementId: "G-0981JRSJ7Z"
};

export const getFirebaseConfig = () => FIREBASE_CONFIG;
export const isFirebaseConfigured = () => true;
export const saveFirebaseConfig = () => {};

// Inicialización de la App de Firebase
let app;
let auth;
let googleProvider;

try {
  app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApp();
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
} catch (e) {
  console.error('[Firebase] Error al inicializar Firebase:', e);
}

/**
 * Iniciar sesión con Google (Popup oficial de Firebase)
 */
export const signInWithGoogle = async () => {
  if (!auth) {
    throw new Error('El servicio de autenticación de Google no está disponible.');
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const email = user.email || 'usuario@gmail.com';
    const cleanUsername = (user.displayName || email.split('@')[0])
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .substring(0, 25);

    return {
      uid: user.uid,
      username: cleanUsername,
      fullName: user.displayName || 'Usuario Google',
      email: email,
      photoURL: user.photoURL || null,
      role: 'ROLE_USER',
      authProvider: 'google',
      isAnonymous: false
    };
  } catch (error) {
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Inicio de sesión cancelado en la ventana de Google.');
    }
    if (error.code === 'auth/unauthorized-domain') {
      throw new Error('El dominio localhost no está en la lista de dominios autorizados de Firebase Console.');
    }
    throw error;
  }
};

/**
 * Cerrar sesión en Firebase
 */
export const signOutFirebase = async () => {
  try {
    if (auth) {
      await signOut(auth);
    }
  } catch (e) {
    console.warn('[Firebase] Error al cerrar sesión:', e);
  }
};

/**
 * Gestor de Órdenes:
 * - Modo Invitado: Guarda pedidos temporales en el navegador.
 * - Sincronización: Al autenticarse con Google o usuario, transfiere los pedidos a la cuenta permanente.
 */
export const guestOrdersStorage = {
  getOrders() {
    try {
      const data = localStorage.getItem('NEXUSTECH_GUEST_ORDERS');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addOrder(order) {
    try {
      const current = this.getOrders();
      const orderWithMeta = {
        ...order,
        isGuestOrder: true,
        savedAt: new Date().toISOString()
      };
      const updated = [orderWithMeta, ...current.filter(o => o.id !== order.id)];
      localStorage.setItem('NEXUSTECH_GUEST_ORDERS', JSON.stringify(updated));
    } catch (e) {
      console.warn('Error guardando orden de invitado:', e);
    }
  },

  linkOrdersToUser(userIdentifier) {
    if (!userIdentifier) return [];
    try {
      const guestOrders = this.getOrders();
      const userKey = `NEXUSTECH_USER_ORDERS_${userIdentifier}`;
      const existingUserOrders = JSON.parse(localStorage.getItem(userKey) || '[]');

      const merged = [...guestOrders.map(o => ({ ...o, isGuestOrder: false })), ...existingUserOrders];
      const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
      
      localStorage.setItem(userKey, JSON.stringify(unique));
      this.clear();
      return unique;
    } catch (e) {
      console.warn('Error vinculando órdenes al usuario:', e);
      return [];
    }
  },

  getUserOrders(userIdentifier) {
    if (!userIdentifier) return [];
    try {
      const userKey = `NEXUSTECH_USER_ORDERS_${userIdentifier}`;
      const data = localStorage.getItem(userKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveUserOrder(userIdentifier, order) {
    if (!userIdentifier) return;
    try {
      const userKey = `NEXUSTECH_USER_ORDERS_${userIdentifier}`;
      const current = this.getUserOrders(userIdentifier);
      const updated = [order, ...current.filter(o => o.id !== order.id)];
      localStorage.setItem(userKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Error guardando orden del usuario:', e);
    }
  },

  clear() {
    localStorage.removeItem('NEXUSTECH_GUEST_ORDERS');
  }
};
