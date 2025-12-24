import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X, Download } from 'lucide-react';
import './UpdatePrompt.css';

const UpdatePrompt = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let refreshing = false;

    // Detectar atualizações do service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);

        // Verificar atualizações periodicamente
        const checkForUpdates = () => {
          reg.update();
        };

        // Verificar a cada 1 hora
        const updateInterval = setInterval(checkForUpdates, 60 * 60 * 1000);

        // Listener para quando uma nova versão é encontrada
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Nova versão disponível
                setUpdateAvailable(true);
              }
            });
          }
        });

        // Verificar atualização na inicialização
        checkForUpdates();

        return () => clearInterval(updateInterval);
      });
    }

    // Verificar se há uma nova versão do app (comparando versões)
    const checkAppVersion = async () => {
      try {
        const response = await fetch('/version.json?' + Date.now());
        if (response.ok) {
          const data = await response.json();
          const currentVersion = localStorage.getItem('app-version');
          
          if (currentVersion && currentVersion !== data.version) {
            setUpdateAvailable(true);
          }
          
          localStorage.setItem('app-version', data.version);
        }
      } catch (error) {
        // Ignorar erros de versão
        console.log('Versão não disponível');
      }
    };

    checkAppVersion();
  }, []);

  const handleUpdate = async () => {
    if (!registration || !registration.waiting) {
      // Recarregar a página se não houver service worker esperando
      window.location.reload();
      return;
    }

    setIsUpdating(true);

    // Enviar mensagem para o service worker para pular a espera
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Aguardar um pouco e recarregar
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
    // Não mostrar novamente por 24 horas
    localStorage.setItem('update-dismissed', Date.now().toString());
  };

  // Verificar se foi dispensado recentemente
  useEffect(() => {
    const dismissed = localStorage.getItem('update-dismissed');
    if (dismissed) {
      const hoursSinceDismiss = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60);
      if (hoursSinceDismiss < 24) {
        setUpdateAvailable(false);
      }
    }
  }, []);

  if (!updateAvailable) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="update-prompt"
      >
        <div className="update-prompt-content">
          <div className="update-prompt-header">
            <div className="update-prompt-icon">
              <RefreshCw size={20} className={isUpdating ? 'spinning' : ''} />
            </div>
            <div className="update-prompt-text">
              <h3>Nova Versão Disponível</h3>
              <p>Uma nova versão do aplicativo está disponível. Atualize para obter as últimas melhorias.</p>
            </div>
            <button
              className="update-prompt-close"
              onClick={handleDismiss}
              aria-label="Fechar"
              disabled={isUpdating}
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="update-prompt-actions">
            <button
              className="update-prompt-button update-prompt-button-primary"
              onClick={handleUpdate}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <RefreshCw size={16} className="spinning" />
                  Atualizando...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Atualizar Agora
                </>
              )}
            </button>
            <button
              className="update-prompt-button update-prompt-button-secondary"
              onClick={handleDismiss}
              disabled={isUpdating}
            >
              Depois
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UpdatePrompt;

