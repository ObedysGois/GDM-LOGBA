import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.js';
import { setupWebSocketFallback } from './websocketFallback.js';

// Configurar fallback para WebSocket
setupWebSocketFallback();

// Registrar o service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/serviceWorker.js')
      .then(registration => {
        console.log('Service Worker registrado com sucesso:', registration.scope);
      })
      .catch(error => {
        console.error('Falha ao registrar o Service Worker:', error);
      });
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);