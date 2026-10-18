import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 size={20} className="text-emerald-400" style={{ color: '#34d399' }} />,
    error: <AlertCircle size={20} className="text-rose-400" style={{ color: '#fb7185' }} />,
    warning: <AlertTriangle size={20} className="text-amber-400" style={{ color: '#fbbf24' }} />,
    info: <Info size={20} className="text-cyan-400" style={{ color: '#22d3ee' }} />
  };

  const borders = {
    success: 'rgba(16, 185, 129, 0.4)',
    error: 'rgba(244, 63, 94, 0.4)',
    warning: 'rgba(245, 158, 11, 0.4)',
    info: 'rgba(6, 182, 212, 0.4)'
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        background: '#0f172a',
        border: `1px solid ${borders[toast.type] || borders.info}`,
        borderRadius: '12px',
        padding: '14px 18px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6), 0 0 20px rgba(99,102,241,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '420px',
        animation: 'slideUpFade 0.25s ease-out'
      }}
    >
      <div style={{ flexShrink: 0 }}>{icons[toast.type] || icons.info}</div>
      <div style={{ flex: 1, fontSize: '0.9rem', color: '#f8fafc', lineHeight: 1.4 }}>
        {toast.message}
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
