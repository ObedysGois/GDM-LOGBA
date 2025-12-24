import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, updateProfile } from 'firebase/auth';
import { motion } from 'framer-motion';
import { auth } from '../firebaseConfig.js';
import { useAuth } from '../AuthContext.js';
import { useTheme } from '../contexts/ThemeContext.js';
import { LogIn, UserPlus, Mail, Lock, Loader2, Eye, EyeOff, User } from 'lucide-react';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginType, setLoginType] = useState('login'); // 'login' or 'register'
  const { currentUser } = useAuth();
  const { isDarkMode } = useTheme();
  const navigateRef = React.useRef(window.reactRouterNavigate || ((path) => { window.location.href = path; }));

  React.useEffect(() => {
    if (currentUser) {
      const timer = setTimeout(() => {
        navigateRef.current('/');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Atualizar o perfil do usuário com o nome
      await updateProfile(user, {
        displayName: username
      });
      
      alert('Cadastro realizado com sucesso!');
      setLoginType('login');
      setUsername(''); // Limpar o campo de nome
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
      <div 
        className="min-h-screen flex items-center justify-center fixed inset-0 z-50"
        style={{
          backgroundImage: 'url(/assets/logosplash.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 p-8 rounded-xl shadow-lg max-w-md w-full mx-4 bg-white bg-opacity-20 backdrop-blur-md border border-white border-opacity-30"
        >
          <div className="text-center space-y-4">
            <div className="w-full flex justify-center mb-4">
              <img 
                src="/assets/logosplash.png" 
                alt="Logo Splash" 
                className="w-full h-32 object-contain"
              />
            </div>
            
            <div>
              <h1 className="text-xl font-bold mb-1 text-white">Bem-vindo!</h1>
              <p className="text-sm text-white text-opacity-80">
                Você já está logado como
              </p>
              <p className="font-semibold text-white">
                {currentUser.email}
              </p>
            </div>
            
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-sm font-medium text-white"
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
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: 'url(/assets/backgroundlogin.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay escuro para melhor contraste */}
      <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md p-6 rounded-xl shadow-2xl bg-white bg-opacity-20 backdrop-blur-md border border-white border-opacity-30"
      >
        {/* Logo e Título */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring", stiffness: 200 }}
            className="w-full flex justify-center mb-4"
          >
            <img 
              src="/assets/logodocemel.png" 
              alt="Logo Doce Mel" 
              className="w-full h-24 object-contain"
            />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-xl font-bold mb-1 text-white"
          >
            LOG.BA
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-sm text-white text-opacity-80"
          >
            Sistema de Logística
          </motion.p>
        </div>

        {/* Botões de Alternância */}
        <div className="flex rounded-lg p-1 mb-6 bg-white bg-opacity-10 backdrop-blur-sm">
          <button
            onClick={() => setLoginType('login')}
            className={`
              flex-1 py-2 px-3 rounded-md font-medium transition-all duration-300 text-sm
              ${loginType === 'login'
                ? 'bg-white bg-opacity-30 text-white shadow-md backdrop-blur-sm'
                : 'text-white text-opacity-70 hover:text-white'
              }
            `}
          >
            <LogIn className="w-3 h-3 inline mr-1" />
            Entrar
          </button>
          <button
            onClick={() => setLoginType('register')}
            className={`
              flex-1 py-2 px-3 rounded-md font-medium transition-all duration-300 text-sm
              ${loginType === 'register'
                ? 'bg-white bg-opacity-30 text-white shadow-md backdrop-blur-sm'
                : 'text-white text-opacity-70 hover:text-white'
              }
            `}
          >
            <UserPlus className="w-3 h-3 inline mr-1" />
            Cadastrar
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo Email */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <label className="block text-xs font-medium mb-1 text-white">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white text-opacity-70" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-white border-opacity-30 transition-all duration-300 text-sm bg-white bg-opacity-20 backdrop-blur-sm text-white placeholder-white placeholder-opacity-60 focus:border-white focus:border-opacity-50 focus:ring-2 focus:ring-white focus:ring-opacity-20 focus:outline-none"
              />
            </div>
          </motion.div>

          {/* Campo Nome de Usuário - apenas no cadastro */}
          {loginType === 'register' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55, duration: 0.5 }}
            >
              <label className="block text-xs font-medium mb-1 text-white">
                Nome de Usuário
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white text-opacity-70" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required={loginType === 'register'}
                  placeholder="Seu nome completo"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-white border-opacity-30 transition-all duration-300 text-sm bg-white bg-opacity-20 backdrop-blur-sm text-white placeholder-white placeholder-opacity-60 focus:border-white focus:border-opacity-50 focus:ring-2 focus:ring-white focus:ring-opacity-20 focus:outline-none"
                />
              </div>
            </motion.div>
          )}

          {/* Campo Senha */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <label className="block text-xs font-medium mb-1 text-white">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white text-opacity-70" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-white border-opacity-30 transition-all duration-300 text-sm bg-white bg-opacity-20 backdrop-blur-sm text-white placeholder-white placeholder-opacity-60 focus:border-white focus:border-opacity-50 focus:ring-2 focus:ring-white focus:ring-opacity-20 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-md text-white text-opacity-70 hover:text-white transition-colors duration-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
              w-full py-2.5 px-4 rounded-lg font-semibold text-white transition-all duration-300 text-sm
              bg-white bg-opacity-30 backdrop-blur-sm border border-white border-opacity-40
              ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-opacity-40 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'}
              focus:outline-none focus:ring-4 focus:ring-white focus:ring-opacity-30
            `}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                {loginType === 'login' ? <LogIn className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                {loginType === 'login' ? 'Entrar' : 'Cadastrar'}
              </div>
            )}
          </motion.button>

          {/* Divisor */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white border-opacity-30"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white bg-opacity-20 backdrop-blur-sm text-white text-opacity-80 rounded">
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
              w-full py-2.5 px-4 rounded-lg font-semibold border-2 transition-all duration-300 text-sm
              border-white border-opacity-30 text-white bg-white bg-opacity-10 backdrop-blur-sm
              ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-opacity-20 hover:border-opacity-50 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'}
              focus:outline-none focus:ring-4 focus:ring-white focus:ring-opacity-30
            `}
          >
            <div className="flex items-center justify-center">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
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
