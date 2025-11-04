import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  FileText, 
  BarChart3, 
  MapPin, 
  ClipboardList, 
  Eye, 
  User, 
  LogOut, 
  Menu,
  Truck
} from 'lucide-react';
import { useAuth } from './AuthContext.js';
import { useTheme } from './contexts/ThemeContext.js';
import { ToastContext } from './App.js';
import ThemeToggle from './Components/ThemeToggle.jsx';

function Layout() {
  const { currentUser, loading, logout } = useAuth();
  const { isDarkMode, colors } = useTheme();
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

  // Definir permissões baseadas no tipo de usuário
  const userType = currentUser?.type;
  
  // Controle de acesso por tipo de usuário
  const canAccessLocalizacao = ['admin', 'colaborador', 'fretista', 'comercial'].includes(userType);
  const canAccessMonitoramento = ['admin', 'colaborador', 'gerencia', 'comercial'].includes(userType);
  const canAccessProfile = ['admin', 'colaborador', 'fretista', 'gerencia', 'comercial', 'novo'].includes(userType);
  const canAccessChecklistExpedicao = ['admin', 'colaborador', 'fretista', 'expedidor', 'gerencia'].includes(userType);
  const canAccessRegistros = ['admin', 'colaborador', 'fretista'].includes(userType);
  const canAccessDashboard = ['admin', 'colaborador', 'fretista', 'gerencia', 'comercial'].includes(userType);
  const canAccessHome = ['admin', 'colaborador', 'fretista', 'gerencia', 'comercial'].includes(userType);
  
  // Usuário expedidor só tem acesso ao Checklist Expedição
  const isExpedidor = userType === 'expedidor';
  
  // Usuário novo só tem acesso ao Perfil
  const isNovo = userType === 'novo';

  const handleLogout = async () => {
    try {
      await logout();
      showToast('Logout realizado com sucesso!', 'success');
      navigate('/login');
    } catch (error) {
      console.error('Erro no logout:', error);
      showToast('Erro ao fazer logout', 'error');
    }
  };

  if (loading) {
    return (
      <div className={`
        flex justify-center items-center h-screen
        ${isDarkMode ? 'bg-dark-bg text-dark-text' : 'bg-light-bg text-light-text'}
        transition-colors duration-300
      `}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className={`w-8 h-8 border-4 border-t-transparent rounded-full mr-3
            ${isDarkMode ? 'border-dark-primary' : 'border-light-primary'}
          `}
        />
        <span className="text-lg font-medium">Carregando...</span>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const menuItems = isExpedidor ? [
    // Expedidor só vê Checklist Expedição
    { path: '/checklist-expedicao', icon: Truck, label: 'Checklist Expedição' }
  ] : isNovo ? [
    // Usuário novo só tem acesso ao Perfil
    ...(canAccessProfile ? [{ path: '/profile', icon: User, label: 'Perfil' }] : [])
  ] : [
    // Outros usuários têm acesso baseado em suas permissões
    ...(canAccessHome ? [{ path: '/', icon: Home, label: 'Home' }] : []),
    ...(canAccessRegistros ? [{ path: '/registros', icon: FileText, label: 'Registros' }] : []),
    ...(canAccessDashboard ? [{ path: '/dashboard', icon: BarChart3, label: 'Dashboard' }] : []),
    ...(canAccessLocalizacao ? [{ path: '/localizacao', icon: MapPin, label: 'Localização' }] : []),
    // Meu Resumo: todos exceto gerencia e expedidor
    ...(userType !== 'gerencia' ? [{ path: '/meu-resumo', icon: ClipboardList, label: 'Meu Resumo' }] : []),
    ...(canAccessMonitoramento ? [{ path: '/monitoramento', icon: Eye, label: 'Monitoramento' }] : []),
    ...(canAccessProfile ? [{ path: '/profile', icon: User, label: 'Perfil' }] : []),
    ...(canAccessChecklistExpedicao ? [{ path: '/checklist-expedicao', icon: Truck, label: 'Checklist Expedição' }] : [])
  ];

  return (
    <div className={`
      min-h-screen transition-colors duration-300
      ${isDarkMode ? 'bg-dark-bg text-dark-text' : 'bg-light-bg text-light-text'}
    `}>
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }} style={
                        {
              background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
              backdropFilter: isDarkMode ? 'blur(10px)' : 'none',
              border: isDarkMode ? '1px solid #0F0F0F' : undefined,
              boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined
        }
              }
              className={`
                fixed top-0 left-0 h-full w-70 z-50 shadow-2xl 
              `}
            >
              {/* Logo Section */}
              <div style={
                        {
          background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
              backdropFilter: isDarkMode ? 'blur(10px)' : 'none',
              border: isDarkMode ? '1px solid #0F0F0F' : undefined,
              boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined
        }
              } className={`
                p-4 border-b
                ${isDarkMode ? 'border-dark-border' : 'border-light-border'}
              `}>
                <div className="flex items-center space-x-3">
                  <div className={`
                    w-12 h-10 rounded-xl overflow-hidden
                    ${isDarkMode ? 'bg-black-primary' : 'bg-white-primary'}
                  `}>
                    <img 
                      src="/assets/logodocemel.png" 
                      alt="Logo Doce Mel" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold">LOG.BA</h2>
                    <p className={`text-xs ${isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                      Sistema de Transportes Logísticas
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation Menu */}
              <nav  className="p-4 space-y-0">
                {menuItems.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <motion.button
                      key={item.path}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        navigate(item.path);
                        setSidebarOpen(false);
                      }}
                      className={`
                        w-full flex items-center space-x-3 p-3 rounded-xl
                        transition-all duration-200 text-left
                        ${isActive 
                          ? isDarkMode 
                            ? 'bg-dark-hover text-white shadow-lg' 
                            : 'bg-light-primary text-white shadow-lg'
                          : isDarkMode
                            ? 'hover:bg-dark-cinza text-dark-text'
                            : 'hover:bg-light-hover text-light-text'
                        }
                      `}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span className="text-sm  font-poppins font-bold">{item.label}</span>
                    </motion.button>
                  );
                })}
              </nav>

              {/* User Info & Logout */}
              <div style={
                        {
          background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
              backdropFilter: isDarkMode ? 'blur(10px)' : 'none',
              border: isDarkMode ? '1px solid #0F0F0F' : undefined,
              boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined
        }} className={`
                absolute bottom-0 left-0 right-0 p-4 border-t
              `}>
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${isDarkMode ? 'bg-dark-hover' : 'bg-light-primary'}
                  `}>
                    <User className="w-4 h-4 text-light-card" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Usuário'}
                    </p>
                    <p className={`text-xs ${isDarkMode ? 'text-dark-accent' : 'text-dark-accent'}`}>
                      {currentUser?.type === 'admin' ? 'Administrador' : 
                       currentUser?.type === 'fretista' ? 'Fretista' : 'Motorista'}
                    </p>
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogout}
                  className={`
                    w-full flex items-center justify-center space-x-2 p-1 rounded-xl
                    transition-all duration-200
                    ${isDarkMode 
                      ? 'bg-red-600 hover:bg-red-700 text-light-card text-bold' 
                      : 'bg-red-500 hover:bg-red-600 text-light-card text-bold'
                    }
                  `}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-medium text-light-card text-bold">Sair</span>
                </motion.button>
              </div>
            </motion.div>

            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
            />
          </>
        )}
      </AnimatePresence>

      {/* Topbar */}
      <header style={
        {
          background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
              backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
              border: isDarkMode ? '1px solid #0F0F0F' : undefined,
              boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined
        }
      } className={`
        fixed top-0 left-0 right-0 z-30 h-14 shadow-lg
      `}>
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`
                p-2 rounded-lg transition-colors duration-200
                ${isDarkMode 
                  ? 'hover:bg-dark-hover text-dark-text' 
                  : 'hover:bg-light-hover text-light-text'
                }
              `}
            >
              <Menu className="w-6 h-6" />
            </motion.button>
            
            <div className="flex items-center space-x-3">
              <div className={`
                w-14 h-12 rounded-lg overflow-hidden
                ${isDarkMode ? 'bg-black-primary' : 'bg-white-primary'}
              `}>
                <img 
                  src="/assets/logodocemel.png" 
                  alt="Logo Doce Mel" 
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-xl font-bold hidden sm:block">LOG.BA</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            <div className="flex items-center space-x-2">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center
                ${isDarkMode ? 'bg-dark-primary' : 'bg-light-primary'}
              `}>
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium text-sm hidden md:block">
                {currentUser?.nome || 'Usuário'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  );
} 

export default Layout;