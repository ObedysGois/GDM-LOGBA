import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNotifications } from '../hooks/useNotifications.js';
import toast from 'react-hot-toast';

const NotificationContext = createContext();

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext deve ser usado dentro de NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const {
    permission,
    token,
    isSupported,
    requestPermission,
    getFCMToken,
    sendLocalNotification
  } = useNotifications();

  const [isInitialized, setIsInitialized] = useState(false);

  // Inicializar notificações quando o componente montar
  useEffect(() => {
    const initializeNotifications = async () => {
      if (isSupported && !isInitialized) {
        // Verificar se já temos permissão
        if (permission === 'granted') {
          await getFCMToken();
        } else if (permission === 'default') {
          // Mostrar um toast perguntando se o usuário quer ativar notificações
          toast.custom((t) => (
            <div
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Ativar Notificações Push
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Receba notificações importantes mesmo quando não estiver usando o app
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-gray-200">
                <button
                  onClick={async () => {
                    toast.dismiss(t.id);
                    await requestPermission();
                  }}
                  className="w-full border border-transparent rounded-none p-4 flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Ativar
                </button>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Agora não
                </button>
              </div>
            </div>
          ), {
            duration: 10000,
            position: 'top-center'
          });
        }
        setIsInitialized(true);
      }
    };

    initializeNotifications();
  }, [isSupported, permission, isInitialized, getFCMToken, requestPermission]);

  // Função para enviar notificação personalizada
  const sendNotification = (title, message, type = 'info') => {
    // Enviar como toast
    switch (type) {
      case 'success':
        toast.success(`${title}: ${message}`);
        break;
      case 'error':
        toast.error(`${title}: ${message}`);
        break;
      case 'warning':
        toast(`${title}: ${message}`, {
          icon: '⚠️',
        });
        break;
      default:
        toast(`${title}: ${message}`);
    }

    // Também enviar como notificação push se tiver permissão
    if (permission === 'granted') {
      sendLocalNotification(title, message);
    }
  };

  // Função para notificar sobre novos registros
  const notifyNewRecord = (recordType, details) => {
    const title = 'Novo Registro Adicionado';
    const message = `${recordType}: ${details}`;
    sendNotification(title, message, 'success');
  };

  // Função para notificar sobre atualizações importantes
  const notifyUpdate = (message) => {
    const title = 'Atualização do Sistema';
    sendNotification(title, message, 'info');
  };

  // Função para notificar sobre erros críticos
  const notifyError = (message) => {
    const title = 'Erro do Sistema';
    sendNotification(title, message, 'error');
  };

  // Função para notificar sobre avisos
  const notifyWarning = (message) => {
    const title = 'Aviso';
    sendNotification(title, message, 'warning');
  };

  const value = {
    permission,
    token,
    isSupported,
    isInitialized,
    requestPermission,
    getFCMToken,
    sendNotification,
    notifyNewRecord,
    notifyUpdate,
    notifyError,
    notifyWarning,
    sendLocalNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};