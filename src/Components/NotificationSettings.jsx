import React from 'react';
import { useNotificationContext } from '../contexts/NotificationContext';

const NotificationSettings = () => {
  const {
    permission,
    isSupported,
    requestPermission,
    sendNotification,
    token
  } = useNotificationContext();

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return { text: 'Ativadas', color: 'text-green-600', bg: 'bg-green-100' };
      case 'denied':
        return { text: 'Negadas', color: 'text-red-600', bg: 'bg-red-100' };
      default:
        return { text: 'Não solicitadas', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    }
  };

  const status = getPermissionStatus();

  const handleTestNotification = () => {
    sendNotification(
      'Teste de Notificação',
      'Esta é uma notificação de teste do GDM LogBA!',
      'success'
    );
  };

  if (!isSupported) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg border">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Notificações Push
        </h3>
        <p className="text-sm text-gray-600">
          Notificações push não são suportadas neste navegador.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Notificações Push
        </h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
          {status.text}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-3">
            Receba notificações importantes mesmo quando não estiver usando o aplicativo.
          </p>

          {permission !== 'granted' && (
            <button
              onClick={requestPermission}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm font-medium"
            >
              {permission === 'denied' ? 'Reativar Notificações' : 'Ativar Notificações'}
            </button>
          )}

          {permission === 'granted' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-md">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-medium text-green-800">
                    Notificações ativadas
                  </span>
                </div>
              </div>

              <button
                onClick={handleTestNotification}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors text-sm font-medium"
              >
                Testar Notificação
              </button>

              {token && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    Informações técnicas
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <p className="text-xs text-gray-600 mb-2">Token FCM:</p>
                    <code className="text-xs bg-white p-2 rounded border block break-all">
                      {token}
                    </code>
                  </div>
                </details>
              )}
            </div>
          )}

          {permission === 'denied' && (
            <div className="mt-3 p-3 bg-red-50 rounded-md">
              <p className="text-sm text-red-800">
                As notificações foram negadas. Para reativá-las, você precisa:
              </p>
              <ol className="text-sm text-red-700 mt-2 ml-4 list-decimal">
                <li>Clicar no ícone de cadeado na barra de endereços</li>
                <li>Alterar a permissão de notificações para "Permitir"</li>
                <li>Recarregar a página</li>
              </ol>
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Tipos de notificação
          </h4>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center">
              <svg className="h-4 w-4 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novos registros adicionados
            </div>
            <div className="flex items-center">
              <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Atualizações do sistema
            </div>
            <div className="flex items-center">
              <svg className="h-4 w-4 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Avisos importantes
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;