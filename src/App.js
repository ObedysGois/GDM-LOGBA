import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext.js';
import { ThemeProvider } from './contexts/ThemeContext.js';
import { NotificationProvider } from './contexts/NotificationContext.js';
import { Toaster } from 'react-hot-toast';
import Layout from './Layout.js';
import Login from './Pages/Login.jsx';
import Home from './Pages/Home.jsx';
import Registros from './Pages/Registros.jsx';
import Dashboard from './Pages/Dashboard.jsx';
import Localizacao from './Pages/Localizacao.jsx';
import MeuResumo from './Pages/MeuResumo.jsx';
import Monitoramento from './Pages/Monitoramento.jsx';
import Profile from './Pages/Profile.jsx';
import ChecklistExpedicao from './Pages/ChecklistExpedicao.jsx';
import ToastNotification from './Components/ToastNotification.jsx';
import './App.css';

// Context para toast notifications
export const ToastContext = React.createContext();

function App() {
  const [toast, setToast] = useState({ open: false, type: 'info', message: '', duration: 4000 });

  // Função para mostrar toast
  const showToast = (message, type = 'info', duration = 4000) => {
    setToast({ open: true, type, message, duration });
  };

  // Função para fechar toast
  const closeToast = () => {
    setToast({ ...toast, open: false });
  };

  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <ToastContext.Provider value={{ showToast }}>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
            <div className="App">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="registros" element={<Registros />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="localizacao" element={<Localizacao />} />
                  <Route path="meu-resumo" element={<MeuResumo />} />
                  <Route path="monitoramento" element={<Monitoramento />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="checklist-expedicao" element={<ChecklistExpedicao />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              
              {/* Toast Notification Global */}
              <ToastNotification 
                open={toast.open} 
                type={toast.type} 
                message={toast.message} 
                duration={toast.duration}
                onClose={closeToast} 
              />
              
              {/* React Hot Toast para notificações push */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#0F0F0F',
                    color: '#fff',
                  },
                  success: {
                    duration: 3000,
                    theme: {
                      primary: 'green',
                      secondary: 'black',
                    },
                  },
                }}
              />
            </div>
          </Router>
        </ToastContext.Provider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
