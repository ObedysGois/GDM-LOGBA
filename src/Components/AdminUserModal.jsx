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
  borderRadius: 8,
  padding: 20,
  minWidth: 300,
  maxWidth: 480,
  boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
  position: 'relative',
};

export default function AdminUserModal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div style={modalStyle}>
      <div style={contentStyle}>
        <button onClick={onClose} style={{position:'absolute',top:12,right:12,fontSize:18,background:'none',border:'none',cursor:'pointer',color:'#888'}} title="Fechar">×</button>
        <h2 style={{marginTop:0,marginBottom:16,fontSize:'1.2rem',color:'#218838',fontWeight:700}}>{title}</h2>
        {children}
      </div>
    </div>
  );
}