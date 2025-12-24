import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.js';
import { setupWebSocketFallback } from './websocketFallback.js';

// Configurar fallback para WebSocket
setupWebSocketFallback();

// Registrar o service worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/serviceWorker.js', {
      scope: '/'
    })
      .then(registration => {
        console.log('✅ Service Worker registrado com sucesso:', registration.scope);
        
        // Verificar atualizações periodicamente
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // A cada hora
        
        // Listener para atualizações do service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Novo service worker disponível
                console.log('🔄 Nova versão do app disponível!');
                // O UpdatePrompt component irá mostrar a notificação
              }
            });
          }
        });
      })
      .catch(error => {
        console.error('❌ Falha ao registrar o Service Worker:', error);
      });
  });
  
  // Listener para quando o service worker estiver pronto
  navigator.serviceWorker.ready.then(registration => {
    console.log('✅ Service Worker pronto para uso');
    
    // Solicitar permissão para notificações
    if ('Notification' in window && Notification.permission === 'default') {
      // Não solicitar automaticamente, deixar o usuário solicitar quando necessário
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);