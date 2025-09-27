import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.js';
import { ToastContext } from './App.js';
import './App.css';

function Layout() {
  const { currentUser, loading, logout } = useAuth();
  const { showToast } = React.useContext(ToastContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !currentUser) {
      navigate('/login');
    }
  }, [currentUser, loading, navigate]);

  useEffect(() => {
    // Fechar sidebar em telas pequenas quando mudar de rota
    if (window.innerWidth <= 1024) {
      setSidebarOpen(false);
    }
  }, [location]);

  const handleLogout = async () => {
    try {
      await logout();
      showToast('Logout realizado com sucesso!', 'success');
      navigate('/login');
    } catch (error) {
      showToast('Erro ao fazer logout. Tente novamente.', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#218838'
      }}>
        Carregando...
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  // Determinar se o usuário pode acessar a tela de localização
  const canAccessLocalizacao = currentUser.type === 'admin' || currentUser.type === 'colaborador';
  const canAccessMonitoramento = currentUser.type === 'admin' || currentUser.type === 'colaborador';
  const canAccessProfile = currentUser.type === 'admin' || currentUser.type === 'colaborador';

  const menuItems = [
    { path: '/', icon: '🏠', label: 'Home' },
    { path: '/registros', icon: '📝', label: 'Registros' },
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    ...(canAccessLocalizacao ? [{ path: '/localizacao', icon: '📍', label: 'Localização' }] : []),
    { path: '/meu-resumo', icon: '📋', label: 'Meu Resumo' },
    ...(canAccessMonitoramento ? [{ path: '/monitoramento', icon: '👁️', label: 'Monitoramento' }] : []),
    ...(canAccessProfile ? [{ path: '/profile', icon: '👤', label: 'Perfil' }] : [])
  ];

  return (
    <div className="app-main">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <img src="/assets/logodocemel.png" alt="Logo" className="sidebar-logo" />
        </div>
        
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(item.path);
              }}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-text">{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-icon">👤</span>
            <span className="user-email">{currentUser.email}</span>
          </div>
          <button onClick={handleLogout} className="logout-button">
            <span className="logout-icon">🚪</span>
            Sair
          </button>
        </div>
      </div>

      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-content">
          <button
            className="menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <h1 className="topbar-title">
            <span className="topbar-icon">🚛</span>
            Logística BA
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
} 

export default Layout; 