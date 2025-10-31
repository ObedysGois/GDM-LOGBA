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
  const canAccessLocalizacao = ['admin', 'colaborador'].includes(userType);
  const canAccessMonitoramento = ['admin', 'colaborador'].includes(userType);
  const canAccessProfile = ['admin', 'colaborador', 'fretista'].includes(userType);
  const canAccessChecklistExpedicao = ['admin', 'colaborador', 'fretista', 'expedidor'].includes(userType);
  
  // Usuário expedidor só tem acesso ao Checklist Expedição
  const isExpedidor = userType === 'expedidor';
  
  // Usuários vendedor e novo não têm acesso ao Checklist Expedição
  const isVendedorOrNovo = ['vendedor', 'novo'].includes(userType);

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
  ] : isVendedorOrNovo ? [
    // Vendedor e novo não têm acesso ao Checklist Expedição
    { path: '/', icon: Home, label: 'Home' },
    { path: '/registros', icon: FileText, label: 'Registros' },
    { path: '/dashboard', icon: BarChart3, label: 'Dashboard' },
    ...(canAccessLocalizacao ? [{ path: '/localizacao', icon: MapPin, label: 'Localização' }] : []),
    { path: '/meu-resumo', icon: ClipboardList, label: 'Meu Resumo' },
    ...(canAccessMonitoramento ? [{ path: '/monitoramento', icon: Eye, label: 'Monitoramento' }] : []),
    ...(canAccessProfile ? [{ path: '/profile', icon: User, label: 'Perfil' }] : [])
  ] : [
    // Admin, colaborador e fretista têm acesso completo
    { path: '/', icon: Home, label: 'Home' },
    { path: '/registros', icon: FileText, label: 'Registros' },
    { path: '/dashboard', icon: BarChart3, label: 'Dashboard' },
    ...(canAccessLocalizacao ? [{ path: '/localizacao', icon: MapPin, label: 'Localização' }] : []),
    { path: '/meu-resumo', icon: ClipboardList, label: 'Meu Resumo' },
    ...(canAccessMonitoramento ? [{ path: '/monitoramento', icon: Eye, label: 'Monitoramento' }] : []),
    ...(canAccessProfile ? [{ path: '/profile', icon: User, label: 'Perfil' }] : []),
    { path: '/checklist-expedicao', icon: Truck, label: 'Checklist Expedição' }
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
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={`
                fixed top-0 left-0 h-full w-80 z-50 shadow-2xl
                ${isDarkMode ? 'bg-dark-card border-dark-border' : 'bg-light-card border-light-border'}
                border-r transition-colors duration-300
              `}
            >
              {/* Logo Section */}
              <div className={`
                p-6 border-b
                ${isDarkMode ? 'border-dark-border' : 'border-light-border'}
              `}>
                <div className="flex items-center space-x-3">
                  <div className={`
                    w-12 h-12 rounded-xl overflow-hidden
                    ${isDarkMode ? 'bg-dark-primary' : 'bg-light-primary'}
                  `}>
                    <img 
                      src="/assets/logodocemel.png" 
                      alt="Logo Doce Mel" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">LOG.BA</h2>
                    <p className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                      Sistema de Transporte
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation Menu */}
              <nav className="p-4 space-y-2">
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
                        w-full flex items-center space-x-3 p-4 rounded-xl
                        transition-all duration-200 text-left
                        ${isActive 
                          ? isDarkMode 
                            ? 'bg-dark-primary text-white shadow-lg' 
                            : 'bg-light-primary text-white shadow-lg'
                          : isDarkMode
                            ? 'hover:bg-dark-hover text-dark-text'
                            : 'hover:bg-light-hover text-light-text'
                        }
                      `}
                    >
                      <IconComponent className="w-5 h-5" />
                      <span className="font-medium text-sm">{item.label}</span>
                    </motion.button>
                  );
                })}
              </nav>

              {/* User Info & Logout */}
              <div className={`
                absolute bottom-0 left-0 right-0 p-4 border-t
                ${isDarkMode ? 'border-dark-border bg-dark-card' : 'border-light-border bg-light-card'}
              `}>
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${isDarkMode ? 'bg-dark-primary' : 'bg-light-primary'}
                  `}>
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Usuário'}
                    </p>
                    <p className={`text-xs ${isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
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
                    w-full flex items-center justify-center space-x-2 p-3 rounded-xl
                    transition-all duration-200
                    ${isDarkMode 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-red-500 hover:bg-red-600 text-white'
                    }
                  `}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-medium">Sair</span>
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
      <header className={`
        fixed top-0 left-0 right-0 z-30 h-16 shadow-lg
        ${isDarkMode ? 'bg-dark-card border-dark-border' : 'bg-light-card border-light-border'}
        border-b transition-colors duration-300
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
                w-10 h-10 rounded-lg overflow-hidden
                ${isDarkMode ? 'bg-dark-primary' : 'bg-light-primary'}
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