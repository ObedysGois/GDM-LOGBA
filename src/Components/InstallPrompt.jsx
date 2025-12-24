import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Smartphone } from 'lucide-react';
import './InstallPrompt.css';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Verificar se já está instalado
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                             window.navigator.standalone ||
                             document.referrer.includes('android-app://');
    setIsStandalone(isStandaloneMode);

    // Verificar se é iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Verificar se já foi instalado antes (localStorage)
    const hasSeenPrompt = localStorage.getItem('pwa-install-prompt-dismissed');
    const installTime = localStorage.getItem('pwa-installed-time');
    
    // Se já foi instalado há mais de 7 dias, mostrar novamente
    if (installTime) {
      const daysSinceInstall = (Date.now() - parseInt(installTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceInstall < 7) {
        return;
      }
    }

    // Se já viu o prompt e não instalou, não mostrar por 30 dias
    if (hasSeenPrompt && !isStandaloneMode) {
      const daysSinceDismiss = (Date.now() - parseInt(hasSeenPrompt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < 30) {
        return;
      }
    }

    // Não mostrar se já está instalado
    if (isStandaloneMode) {
      return;
    }

    // Aguardar um pouco antes de mostrar o prompt
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 3000);

    // Listener para evento beforeinstallprompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android/Chrome
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('Usuário aceitou instalar o PWA');
        localStorage.setItem('pwa-installed-time', Date.now().toString());
        localStorage.removeItem('pwa-install-prompt-dismissed');
      } else {
        console.log('Usuário recusou instalar o PWA');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else if (isIOS) {
      // iOS - mostrar instruções
      setShowPrompt(false);
      alert(
        'Para instalar este app no iOS:\n\n' +
        '1. Toque no botão de compartilhar (ícone de compartilhar na barra inferior)\n' +
        '2. Role para baixo e toque em "Adicionar à Tela de Início"\n' +
        '3. Toque em "Adicionar" no canto superior direito'
      );
      localStorage.setItem('pwa-install-prompt-dismissed', Date.now().toString());
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-prompt-dismissed', Date.now().toString());
  };

  if (!showPrompt || isStandalone) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="install-prompt"
      >
        <div className="install-prompt-content">
          <div className="install-prompt-header">
            <div className="install-prompt-icon">
              <Smartphone size={24} />
            </div>
            <div className="install-prompt-text">
              <h3>Instalar App</h3>
              <p>Instale o app para acesso rápido e melhor experiência</p>
            </div>
            <button
              className="install-prompt-close"
              onClick={handleDismiss}
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="install-prompt-actions">
            <button
              className="install-prompt-button install-prompt-button-primary"
              onClick={handleInstallClick}
            >
              <Download size={18} />
              Instalar Agora
            </button>
            <button
              className="install-prompt-button install-prompt-button-secondary"
              onClick={handleDismiss}
            >
              Agora Não
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InstallPrompt;

