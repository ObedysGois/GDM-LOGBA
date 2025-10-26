import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { motion } from 'framer-motion';
import { auth } from '../firebaseConfig.js';
import { useAuth } from '../AuthContext.js';
import { useTheme } from '../contexts/ThemeContext.js';
import { LogIn, UserPlus, Mail, Lock, Loader2, Truck, Eye, EyeOff } from 'lucide-react';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginType, setLoginType] = useState('login'); // 'login' or 'register'
  const { currentUser } = useAuth();
  const { isDarkMode, colors } = useTheme();
  const navigate = window.reactRouterNavigate || ((path) => { window.location.href = path; });

  React.useEffect(() => {
    if (currentUser) {
      const timer = setTimeout(() => {
        navigate('/');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentUser, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Login successful - AuthContext will handle redirect
    } catch (error) {
      alert(`Erro no login: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert('Cadastro realizado com sucesso!');
      setLoginType('login');
    } catch (error) {
      alert(`Erro no cadastro: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // Login successful - AuthContext will handle redirect
    } catch (error) {
      alert(`Erro no login com Google: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (currentUser) {
    return (
      <div className={`
        min-h-screen flex items-center justify-center fixed inset-0 z-50
        ${isDarkMode ? 'bg-dark-bg' : 'bg-light-bg'}
        transition-colors duration-300
      `}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`
            p-16 rounded-3xl shadow-2xl max-w-md w-full mx-4
            ${isDarkMode ? 'bg-dark-card' : 'bg-light-card'}
            border ${isDarkMode ? 'border-dark-border' : 'border-light-border'}
          `}
        >
          <div className="text-center space-y-6">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className={`
                w-20 h-20 mx-auto rounded-2xl flex items-center justify-center
                ${isDarkMode ? 'bg-dark-primary' : 'bg-light-primary'}
              `}
            >
              <Truck className="w-10 h-10 text-white" />
            </motion.div>
            
            <div>
              <h1 className="text-3xl font-bold mb-2">Bem-vindo!</h1>
              <p className={`text-lg ${isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}>
                Você já está logado como
              </p>
              <p className={`font-semibold ${isDarkMode ? 'text-dark-primary' : 'text-light-primary'}`}>
                {currentUser.email}
              </p>
            </div>
            
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={`text-lg font-medium ${isDarkMode ? 'text-dark-primary' : 'text-light-primary'}`}
            >
              Redirecionando para o sistema...
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleSubmit = loginType === 'login' ? handleLogin : handleRegister;

  return (
    <div className={`
      min-h-screen flex items-center justify-center p-4
      ${isDarkMode ? 'bg-dark-bg' : 'bg-light-bg'}
      transition-colors duration-300
    `}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`
          w-full max-w-md p-8 rounded-3xl shadow-2xl
          ${isDarkMode ? 'bg-dark-card' : 'bg-light-card'}
          border ${isDarkMode ? 'border-dark-border' : 'border-light-border'}
        `}
      >
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring", stiffness: 200 }}
            className={`
              w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center
              ${isDarkMode ? 'bg-dark-primary' : 'bg-light-primary'}
              shadow-lg
            `}
          >
            <Truck className="w-10 h-10 text-white" />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-3xl font-bold mb-2"
          >
            LOG.BA
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className={`text-lg ${isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary'}`}
          >
            Sistema de Logística
          </motion.p>
        </div>

        {/* Botões de Alternância */}
        <div className={`
          flex rounded-2xl p-1 mb-8
          ${isDarkMode ? 'bg-dark-bg' : 'bg-light-bg'}
        `}>
          <button
            onClick={() => setLoginType('login')}
            className={`
              flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300
              ${loginType === 'login'
                ? `${isDarkMode ? 'bg-dark-primary text-white' : 'bg-light-primary text-white'} shadow-lg`
                : `${isDarkMode ? 'text-dark-text-secondary hover:text-dark-text' : 'text-light-text-secondary hover:text-light-text'}`
              }
            `}
          >
            <LogIn className="w-4 h-4 inline mr-2" />
            Entrar
          </button>
          <button
            onClick={() => setLoginType('register')}
            className={`
              flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300
              ${loginType === 'register'
                ? `${isDarkMode ? 'bg-dark-primary text-white' : 'bg-light-primary text-white'} shadow-lg`
                : `${isDarkMode ? 'text-dark-text-secondary hover:text-dark-text' : 'text-light-text-secondary hover:text-light-text'}`
              }
            `}
          >
            <UserPlus className="w-4 h-4 inline mr-2" />
            Cadastrar
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campo Email */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <label className={`
              block text-sm font-medium mb-2
              ${isDarkMode ? 'text-dark-text' : 'text-light-text'}
            `}>
              Email
            </label>
            <div className="relative">
              <Mail className={`
                absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5
                ${isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary'}
              `} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className={`
                  w-full pl-12 pr-4 py-4 rounded-2xl border transition-all duration-300
                  ${isDarkMode 
                    ? 'bg-dark-bg border-dark-border text-dark-text placeholder-dark-text-secondary focus:border-dark-primary focus:ring-2 focus:ring-dark-primary/20' 
                    : 'bg-light-bg border-light-border text-light-text placeholder-light-text-secondary focus:border-light-primary focus:ring-2 focus:ring-light-primary/20'
                  }
                  focus:outline-none
                `}
              />
            </div>
          </motion.div>

          {/* Campo Senha */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <label className={`
              block text-sm font-medium mb-2
              ${isDarkMode ? 'text-dark-text' : 'text-light-text'}
            `}>
              Senha
            </label>
            <div className="relative">
              <Lock className={`
                absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5
                ${isDarkMode ? 'text-dark-text-secondary' : 'text-light-text-secondary'}
              `} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className={`
                  w-full pl-12 pr-12 py-4 rounded-2xl border transition-all duration-300
                  ${isDarkMode 
                    ? 'bg-dark-bg border-dark-border text-dark-text placeholder-dark-text-secondary focus:border-dark-primary focus:ring-2 focus:ring-dark-primary/20' 
                    : 'bg-light-bg border-light-border text-light-text placeholder-light-text-secondary focus:border-light-primary focus:ring-2 focus:ring-light-primary/20'
                  }
                  focus:outline-none
                `}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`
                  absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-lg
                  ${isDarkMode ? 'text-dark-text-secondary hover:text-dark-text' : 'text-light-text-secondary hover:text-light-text'}
                  transition-colors duration-200
                `}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>

          {/* Botão Principal */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            type="submit"
            disabled={isLoading}
            className={`
              w-full py-4 px-6 rounded-2xl font-semibold text-white transition-all duration-300
              ${isDarkMode ? 'bg-dark-primary hover:bg-dark-primary/90' : 'bg-light-primary hover:bg-light-primary/90'}
              ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'}
              focus:outline-none focus:ring-4 ${isDarkMode ? 'focus:ring-dark-primary/30' : 'focus:ring-light-primary/30'}
            `}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processando...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                {loginType === 'login' ? <LogIn className="w-5 h-5 mr-2" /> : <UserPlus className="w-5 h-5 mr-2" />}
                {loginType === 'login' ? 'Entrar' : 'Cadastrar'}
              </div>
            )}
          </motion.button>

          {/* Divisor */}
          <div className="relative my-8">
            <div className={`absolute inset-0 flex items-center`}>
              <div className={`w-full border-t ${isDarkMode ? 'border-dark-border' : 'border-light-border'}`}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className={`
                px-4 ${isDarkMode ? 'bg-dark-card text-dark-text-secondary' : 'bg-light-card text-light-text-secondary'}
              `}>
                ou
              </span>
            </div>
          </div>

          {/* Botão Google */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className={`
              w-full py-4 px-6 rounded-2xl font-semibold border-2 transition-all duration-300
              ${isDarkMode 
                ? 'border-dark-border text-dark-text hover:bg-dark-bg hover:border-dark-primary' 
                : 'border-light-border text-light-text hover:bg-light-bg hover:border-light-primary'
              }
              ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'}
              focus:outline-none focus:ring-4 ${isDarkMode ? 'focus:ring-dark-primary/30' : 'focus:ring-light-primary/30'}
            `}
          >
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar com Google
            </div>
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}

export default Login;
