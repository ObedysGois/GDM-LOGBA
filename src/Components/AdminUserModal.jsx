import React from 'react';

const modalStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(0,0,0,0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
};

const contentStyle = {
  background: '#fff',
  borderRadius: 12,
  padding: 32,
  minWidth: 340,
  maxWidth: 520,
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  position: 'relative',
};

export default function AdminUserModal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div style={modalStyle}>
      <div style={contentStyle}>
        <button onClick={onClose} style={{position:'absolute',top:16,right:16,fontSize:22,background:'none',border:'none',cursor:'pointer',color:'#888'}} title="Fechar">×</button>
        <h2 style={{marginTop:0,marginBottom:24,fontSize:'1.4rem',color:'#218838',fontWeight:700}}>{title}</h2>
        {children}
      </div>
    </div>
  );
} 