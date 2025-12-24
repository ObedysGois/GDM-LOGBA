import React, { useEffect, useState, useCallback } from 'react';

const ToastNotification = ({ open, type = 'info', message, onClose, duration = 4000 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300); // Tempo da animação de saída
  }, [onClose]);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setIsExiting(false);
      
      // Auto-dismiss após o tempo definido
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [open, duration, handleClose]);

  if (!isVisible) return null;

  // Configurações por tipo
  const toastConfig = {
    success: {
      icon: '✅',
      bgColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      borderColor: '#10b981',
      shadowColor: 'rgba(16, 185, 129, 0.3)',
      title: 'Sucesso!'
    },
    error: {
      icon: '❌',
      bgColor: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      borderColor: '#ef4444',
      shadowColor: 'rgba(239, 68, 68, 0.3)',
      title: 'Erro!'
    },
    warning: {
      icon: '⚠️',
      bgColor: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      borderColor: '#f59e0b',
      shadowColor: 'rgba(245, 158, 11, 0.3)',
      title: 'Atenção!'
    },
    info: {
      icon: 'ℹ️',
      bgColor: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      borderColor: '#3b82f6',
      shadowColor: 'rgba(59, 130, 246, 0.3)',
      title: 'Informação'
    }
  };

  const config = toastConfig[type] || toastConfig.info;

  return (
    <div style={{
      position: 'fixed',
      top: '16px',
      right: '16px',
      zIndex: 10000,
      maxWidth: '350px',
      minWidth: '280px'
    }}>
      <div style={{
        background: config.bgColor,
        border: `2px solid ${config.borderColor}`,
        borderRadius: '12px',
        padding: '16px',
        boxShadow: `0 6px 24px ${config.shadowColor}`,
        color: '#fff',
        fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
        transform: isExiting ? 'translateX(100%)' : 'translateX(0)',
        opacity: isExiting ? 0 : 1,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Efeito de brilho */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
          animation: 'shimmer 2s infinite',
          pointerEvents: 'none'
        }}></div>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{
              fontSize: '20px',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
            }}>
              {config.icon}
            </span>
            <h4 style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 700,
              textShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              {config.title}
            </h4>
          </div>
          
          {/* Botão fechar */}
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(10px)'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.3)';
              e.target.style.transform = 'scale(1.1)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.2)';
              e.target.style.transform = 'scale(1)';
            }}
          >
            ×
          </button>
        </div>

        {/* Mensagem */}
        <div style={{
          fontSize: '0.875rem',
          lineHeight: 1.4,
          fontWeight: 500,
          textShadow: '0 1px 2px rgba(0,0,0,0.1)',
          whiteSpace: 'pre-line'
        }}>
          {message}
        </div>

        {/* Barra de progresso */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '3px',
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '0 0 10px 10px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            background: 'rgba(255, 255, 255, 0.8)',
            width: '100%',
            animation: `progress ${duration}ms linear`,
            borderRadius: '0 0 10px 10px'
          }}></div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        
        @keyframes progress {
          0% { width: 100%; }
          100% { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default ToastNotification;