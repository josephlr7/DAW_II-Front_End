import React, { useState, useEffect } from 'react';
import { 
  X, 
  LogIn, 
  UserPlus, 
  Shield, 
  User, 
  Mail, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { authApi } from '../services/api';
import { 
  signInWithGoogle, 
  guestOrdersStorage 
} from '../services/firebase';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, showToast }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Limpieza total de credenciales y campos del formulario
  const resetFormFields = () => {
    setLoginUsername('');
    setLoginPassword('');
    setRegFullName('');
    setRegUsername('');
    setRegEmail('');
    setRegPassword('');
    setErrorMsg('');
  };

  // Cada vez que se abre el modal, garantizar que los campos estén completamente vacíos
  useEffect(() => {
    if (isOpen) {
      resetFormFields();
    }
  }, [isOpen]);

  const handleClose = () => {
    resetFormFields();
    onClose();
  };

  if (!isOpen) return null;

  // GOOGLE SIGN-IN HANDLER (Oficial directo)
  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setIsGoogleLoading(true);

    try {
      const googleUser = await signInWithGoogle();
      completeLoginWithUser(googleUser, `¡Bienvenido, ${googleUser.fullName}!`);
    } catch (err) {
      setErrorMsg(err.message || 'Error al autenticar con Google');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const completeLoginWithUser = (userObj, successMsg) => {
    resetFormFields();
    const dummyToken = 'token-' + (userObj.uid || Date.now());
    authApi.saveSession(dummyToken, userObj);

    // Vincular pedidos de la sesión de invitado al usuario
    const linked = guestOrdersStorage.linkOrdersToUser(userObj.email || userObj.username);
    if (linked.length > 0) {
      showToast(`¡Se han vinculado ${linked.length} pedido(s) de tu sesión de invitado a tu cuenta!`, 'success');
    }

    showToast(successMsg, 'success');
    onAuthSuccess(userObj, dummyToken);
    handleClose();
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!loginUsername.trim() || !loginPassword) {
      setErrorMsg('Por favor completa todos los campos.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.login(loginUsername.trim(), loginPassword);
      const data = res.data;

      const userObj = {
        username: data.username,
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        authProvider: 'local'
      };

      authApi.saveSession(data.token, userObj);

      // Vincular órdenes si realizó compras previas como invitado
      const linked = guestOrdersStorage.linkOrdersToUser(userObj.email || userObj.username);
      if (linked.length > 0) {
        showToast(`¡Se han vinculado ${linked.length} pedido(s) de tu sesión de invitado a tu cuenta!`, 'success');
      }

      showToast(
        data.role === 'ROLE_ADMIN'
          ? `¡Bienvenido Administrador, ${data.fullName || data.username}!`
          : `¡Bienvenido, ${data.fullName || data.username}!`, 
        'success'
      );
      resetFormFields();
      onAuthSuccess(userObj, data.token);
      handleClose();
    } catch (err) {
      setErrorMsg(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!regUsername.trim() || !regEmail.trim() || !regPassword || !regFullName.trim()) {
      setErrorMsg('Por favor completa todos los campos obligatorios.');
      return;
    }

    if (regPassword.length < 4) {
      setErrorMsg('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.register({
        fullName: regFullName.trim(),
        username: regUsername.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: 'ROLE_USER'
      });

      const data = res.data;
      const userObj = {
        username: data.username,
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        authProvider: 'local'
      };

      authApi.saveSession(data.token, userObj);
      guestOrdersStorage.linkOrdersToUser(userObj.email || userObj.username);
      showToast('¡Cuenta registrada con éxito! Bienvenido a NEXUS TECH.', 'success');
      resetFormFields();
      onAuthSuccess(userObj, data.token);
      handleClose();
    } catch (err) {
      setErrorMsg(err.message || 'Error al registrar el usuario.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-modal-backdrop" onClick={handleClose}>
      <div className="auth-modal-box glass-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="auth-modal-header">
          <div className="auth-header-title">
            <div className="auth-brand-badge">
              <Shield size={16} className="text-indigo-400" />
              <span>NEXUS TECH ID</span>
            </div>
            <h2>{tab === 'login' ? 'Identifícate en la Tienda' : 'Crear Cuenta de Usuario'}</h2>
            <p className="auth-header-subtitle">
              {tab === 'login' 
                ? 'Accede con Google o con tu cuenta para conservar tu historial de pedidos' 
                : 'Regístrate para comprar y sincronizar tus comprobantes electrónicos'}
            </p>
          </div>
          <button className="auth-close-btn" onClick={handleClose} title="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs-bar">
          <button
            type="button"
            className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setErrorMsg(''); }}
          >
            <LogIn size={15} />
            <span>Ingresar / Google</span>
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setErrorMsg(''); }}
          >
            <UserPlus size={15} />
            <span>Crear Cuenta</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="auth-alert-error">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* LOGIN TAB */}
        {tab === 'login' && (
          <div className="auth-tab-content">
            {/* GOOGLE SIGN-IN PRIMARY BUTTON (Limpio para el cliente) */}
            <div className="auth-google-section">
              <button 
                type="button" 
                className="btn-google-auth"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading}
                title="Iniciar sesión con tu cuenta de Google"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 size={18} className="spin-icon text-indigo-400" />
                    <span>Conectando con Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="google-icon-svg" viewBox="0 0 24 24" width="20" height="20">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span className="google-auth-text">Continuar con Google</span>
                  </>
                )}
              </button>
            </div>

            {/* SEPARADOR ELEGANTE */}
            <div className="auth-divider">
              <span>o ingresa con tu cuenta</span>
            </div>

            {/* LOGIN FORM TRADICIONAL */}
            <form onSubmit={handleLoginSubmit} className="auth-form-body" autoComplete="off">
              <div className="auth-form-group">
                <label>Usuario o Correo Electrónico</label>
                <div className="auth-input-wrapper">
                  <User size={16} className="auth-input-icon" />
                  <input
                    type="text"
                    placeholder="ej. admin o usuario"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="auth-input"
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              <div className="auth-form-group">
                <label>Contraseña</label>
                <div className="auth-input-wrapper">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="auth-input"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <div className="auth-quick-fill-box glass-card">
                <span className="text-xs text-muted block mb-1.5 font-medium">💡 Cuentas de demostración registradas en MySQL:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    type="button" 
                    className="btn-quick-fill admin"
                    onClick={() => {
                      setLoginUsername('admin');
                      setLoginPassword('admin123');
                      setErrorMsg('');
                    }}
                    title="Autocompletar como Administrador"
                  >
                    <Shield size={13} className="text-amber-400" />
                    <span>Admin: <strong>admin</strong> / <strong>admin123</strong></span>
                  </button>
                  <button 
                    type="button" 
                    className="btn-quick-fill user"
                    onClick={() => {
                      setLoginUsername('usuario');
                      setLoginPassword('user123');
                      setErrorMsg('');
                    }}
                    title="Autocompletar como Cliente"
                  >
                    <User size={13} className="text-indigo-400" />
                    <span>Cliente: <strong>usuario</strong> / <strong>user123</strong></span>
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="auth-submit-btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="spin-icon" />
                    <span>Autenticando en Auth-Service...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    <span>Ingresar con Cuenta</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* REGISTER FORM */}
        {tab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="auth-form-body" autoComplete="off">
            <div className="auth-form-group">
              <label>Nombre y Apellidos</label>
              <div className="auth-input-wrapper">
                <User size={16} className="auth-input-icon" />
                <input
                  type="text"
                  placeholder="ej. Juan Carlos Pérez"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="auth-input"
                  autoComplete="off"
                  required
                />
              </div>
            </div>

            <div className="auth-form-row">
              <div className="auth-form-group">
                <label>Nombre de Usuario</label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-prefix">@</span>
                  <input
                    type="text"
                    placeholder="usuario123"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="auth-input"
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              <div className="auth-form-group">
                <label>Correo Electrónico</label>
                <div className="auth-input-wrapper">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="auth-input"
                    autoComplete="off"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="auth-form-group">
              <label>Contraseña</label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type="password"
                  placeholder="Mínimo 4 caracteres"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="auth-input"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            {/* Security Note on Roles */}
            <div className="auth-role-info-banner">
              <div className="flex items-start gap-2">
                <Shield size={16} className="text-amber-400 mt-0.5" />
                <div className="auth-role-info-text">
                  <span className="font-semibold text-slate-200">Rol asignado: Cliente / Usuario (ROLE_USER)</span>
                  <p className="text-xs text-muted mt-0.5">
                    Las cuentas públicas se crean con acceso de comprador. Los roles y privilegios de <strong>Administrador</strong> son asignados por un administrador desde el Panel de Control.
                  </p>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              className="auth-submit-btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="spin-icon" />
                  <span>Registrando en base de datos...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Registrar Cuenta de Usuario</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
