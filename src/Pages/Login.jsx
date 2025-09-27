import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebaseConfig.js';
import { useAuth } from '../AuthContext.js';
import { LogIn, UserPlus, Mail, Lock, Loader2 } from 'lucide-react';
import '../App.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginType, setLoginType] = useState('login'); // 'login' or 'register'
  const { currentUser } = useAuth();
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
      <div style={{
        minHeight: '100vh',
        width: '100vw',
        background: `url('/assets/docemellogo1.png') center center/cover no-repeat, linear-gradient(135deg, #218838 0%, #43a047 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.97)',
          borderRadius: 32,
          boxShadow: '0 8px 32px rgba(33,136,56,0.18)',
          padding: '64px 48px',
          minWidth: 420,
          minHeight: 420,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 32
        }}>
          <img src="/assets/LOGBAENTREGAS.jpg" alt="Logo LOG.BA" style={{ width: 180, height: 180, objectFit: 'contain', borderRadius: 24, boxShadow: '0 4px 24px #21883833', marginBottom: 16 }} />
          <h1 style={{
            fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
            fontWeight: 900,
            fontSize: 44,
            color: '#218838',
            margin: 0,
            letterSpacing: 2,
            textShadow: '0 2px 12px #21883822'
          }}>
            Bem-vindo!
          </h1>
          <p style={{
            fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
            fontWeight: 500,
            fontSize: 22,
            color: '#333',
            margin: 0,
            textAlign: 'center',
            textShadow: '0 1px 4px #21883811'
          }}>
            Você já está logado como<br /><span style={{color:'#218838', fontWeight:700}}>{currentUser.email}</span>
          </p>
          <div style={{marginTop: 24, color: '#218838', fontSize: 18, fontWeight: 600, letterSpacing: 1, textAlign: 'center'}}>
            Redirecionando para o sistema...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src="/assets/logodocemel.png" alt="Grupo Doce Mel Logo" className="login-logo" />
          <h2>{loginType === 'login' ? 'Entrar no Sistema' : 'Criar Conta'}</h2>
          <p>{loginType === 'login' ? 'Faça login para acessar o sistema' : 'Crie sua conta para começar'}</p>
        </div>

        <form onSubmit={loginType === 'login' ? handleLogin : handleRegister} className="login-form">
          <div className="form-group">
            <div className="input-wrapper">
              <Mail className="input-icon" size={20} />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu email"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                maxLength={10}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary login-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="spinner" size={20} />
                {loginType === 'login' ? 'Entrando...' : 'Cadastrando...'}
              </>
            ) : (
              <>
                {loginType === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
                {loginType === 'login' ? 'Entrar' : 'Cadastrar'}
              </>
            )}
          </button>
        </form>

        <div className="login-actions">
          <button 
            className="btn btn-secondary google-btn"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar com Google
          </button>

          <div className="login-toggle">
            <p>
              {loginType === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}
              <button 
                className="toggle-btn"
                onClick={() => setLoginType(loginType === 'login' ? 'register' : 'login')}
                disabled={isLoading}
              >
                {loginType === 'login' ? 'Criar conta' : 'Fazer login'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
