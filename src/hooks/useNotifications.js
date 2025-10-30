import { useState, useEffect, useCallback } from 'react';
import { 
  getToken, 
  onMessage
} from 'firebase/messaging';
import { messaging } from '../firebaseConfig.js';
import toast from 'react-hot-toast';

const VAPID_KEY = 'BKxyz...'; // Você precisará gerar uma chave VAPID no console do Firebase

export const useNotifications = () => {
  const [permission, setPermission] = useState(Notification.permission);
  const [token, setToken] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  // Verificar se as notificações são suportadas
  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator && messaging) {
      setIsSupported(true);
    }
  }, []);

  // Solicitar permissão para notificações
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast.error('Notificações não são suportadas neste navegador');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        toast.success('Permissão para notificações concedida!');
        return true;
      } else {
        toast.error('Permissão para notificações negada');
        return false;
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      toast.error('Erro ao solicitar permissão para notificações');
      return false;
    }
  }, [isSupported]);

  // Obter token FCM
  const getFCMToken = useCallback(async () => {
    if (!messaging || permission !== 'granted') {
      return null;
    }

    try {
      const currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY
      });

      if (currentToken) {
        setToken(currentToken);
        console.log('FCM Token:', currentToken);
        return currentToken;
      } else {
        console.log('Nenhum token de registro disponível.');
        return null;
      }
    } catch (error) {
      console.error('Erro ao obter token:', error);
      toast.error('Erro ao configurar notificações');
      return null;
    }
  }, [permission]);

  // Configurar listener para mensagens em foreground
  useEffect(() => {
    if (!messaging) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Mensagem recebida em foreground:', payload);
      
      const { title, body } = payload.notification || {};
      
      // Mostrar toast para notificações em foreground
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7H4l5-5v5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {title || 'Nova Notificação'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {body || 'Você tem uma nova mensagem'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Fechar
            </button>
          </div>
        </div>
      ), {
        duration: 5000,
        position: 'top-right'
      });
    });

    return unsubscribe;
  }, []);

  // Inicializar notificações automaticamente se já tiver permissão
  useEffect(() => {
    if (permission === 'granted' && !token) {
      getFCMToken();
    }
  }, [permission, token, getFCMToken]);

  // Enviar notificação local (para teste)
  const sendLocalNotification = useCallback((title, body, options = {}) => {
    if (permission !== 'granted') {
      toast.error('Permissão para notificações não concedida');
      return;
    }

    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'gdm-local-notification',
      ...options
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Também mostrar como toast
    toast.success(`${title}: ${body}`);
  }, [permission]);

  return {
    permission,
    token,
    isSupported,
    requestPermission,
    getFCMToken,
    sendLocalNotification
  };
};