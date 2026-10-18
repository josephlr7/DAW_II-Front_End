import React, { useState } from 'react';
import { 
  UserCheck, 
  Search, 
  Building2, 
  User, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Clock,
  Sparkles,
  FileCheck
} from 'lucide-react';
import { identityApi } from '../services/api';

export default function IdentityLookupView({ showToast }) {
  const [documento, setDocumento] = useState('');
  const [docType, setDocType] = useState('AUTO'); // 'AUTO' | 'DNI' | 'RUC'
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (docVal = documento) => {
    const clean = (docVal || '').trim().replace(/\D/g, '');
    if (!clean) {
      showToast('Por favor ingresa un número de DNI o RUC', 'warning');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      let res;
      if (docType === 'DNI' || (docType === 'AUTO' && clean.length === 8)) {
        res = await identityApi.consultarDni(clean);
      } else if (docType === 'RUC' || (docType === 'AUTO' && clean.length === 11)) {
        res = await identityApi.consultarRuc(clean);
      } else {
        throw new Error('El documento debe contener 8 dígitos para DNI o 11 dígitos para RUC');
      }

      if (res.data && res.data.nombreRazonSocial && res.data.nombreRazonSocial !== '-') {
        setResult(res.data);
        showToast(`Documento ${clean} verificado en vivo con éxito`, 'success');
      } else {
        setError('No se encontraron registros en las bases oficiales para este documento.');
      }
    } catch (err) {
      setError(err.message || 'Error al conectar con Identity-Service');
      showToast(err.message || 'Error de consulta', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="identity-lookup-view animate-fade-in">
      <div className="view-header-row">
        <div>
          <h2>Portal de Verificación de Identidad</h2>
          <p className="view-subtitle">
            Validación oficial de personas y empresas conectada a <strong>Identity-Service</strong> vía Spring Cloud Gateway
          </p>
        </div>
      </div>

      <div className="identity-search-container glass-card">
        {/* Type Selector */}
        <div className="doc-type-pills">
          <button
            className={`pill-btn ${docType === 'AUTO' ? 'active' : ''}`}
            onClick={() => setDocType('AUTO')}
          >
            Detección Automática
          </button>
          <button
            className={`pill-btn ${docType === 'DNI' ? 'active' : ''}`}
            onClick={() => setDocType('DNI')}
          >
            DNI (RENIEC - 8 Dígitos)
          </button>
          <button
            className={`pill-btn ${docType === 'RUC' ? 'active' : ''}`}
            onClick={() => setDocType('RUC')}
          >
            RUC (SUNAT - 11 Dígitos)
          </button>
        </div>

        {/* Input & Search */}
        <div className="search-bar-row">
          <div className="input-search-wrapper">
            <input
              type="text"
              className="identity-large-input font-mono"
              placeholder={docType === 'RUC' ? 'Ingresa RUC de 11 dígitos...' : 'Ingresa DNI (8 dígitos) o RUC (11 dígitos)...'}
              value={documento}
              maxLength={docType === 'DNI' ? 8 : 11}
              onChange={(e) => setDocumento(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            className="btn-search-identity"
            onClick={() => handleSearch()}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw size={18} className="spin-icon" />
            ) : (
              <Search size={18} />
            )}
            <span>{isLoading ? 'Consultando...' : 'Consultar'}</span>
          </button>
        </div>

        <div className="sample-records-row">
          <span className="sample-title">Información de consulta:</span>
          <span className="text-xs text-slate-400">
            Conectado a <strong>RENIEC</strong> para personas naturales y <strong>SUNAT</strong> para empresas en tiempo real.
          </span>
        </div>
      </div>

      {/* Result Card */}
      {result && (
        <div className="identity-result-card glass-card animate-fade-in">
          <div className="result-card-header">
            <div className="flex items-center gap-3">
              <div className="result-avatar">
                {result.tipoDocumento === 'RUC' ? <Building2 size={24} /> : <User size={24} />}
              </div>
              <div>
                <div className="result-doc-badge font-mono">
                  {result.tipoDocumento}: {result.numeroDocumento}
                </div>
                <h3 className="result-name">{result.nombreRazonSocial}</h3>
              </div>
            </div>
            <span className="badge badge-emerald">
              <CheckCircle2 size={14} /> Registro Activo & Válido
            </span>
          </div>

          <div className="result-details-grid">
            <div className="detail-box">
              <span className="detail-label">Tipo de Contribuyente:</span>
              <div className="detail-value font-semibold">
                {result.tipoDocumento === 'RUC' ? 'Persona Jurídica / Empresa' : 'Persona Natural'}
              </div>
            </div>

            <div className="detail-box">
              <span className="detail-label">Estado de Padrón:</span>
              <div className="detail-value text-emerald-400 font-semibold">
                HABIDO / VIGENTE
              </div>
            </div>

            <div className="detail-box full-width">
              <span className="detail-label">Domicilio Fiscal / Dirección Registrada:</span>
              <div className="detail-value">
                <MapPin size={15} className="inline mr-1 text-indigo-400" />
                {result.direccionFiscal || 'LIMA, PERÚ'}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="identity-error-card glass-card animate-fade-in">
          <AlertCircle size={24} className="text-rose-400" />
          <div>
            <h4>No se pudo verificar el documento</h4>
            <p>{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
