import React, { useEffect, useState, useContext } from 'react';
import { MapPin, X, Check } from 'lucide-react';
import { ToastContext } from '../App.js';

const GeolocationPermission = () => {
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const { showToast } = useContext(ToastContext);

  useEffect(() => {
    // Verificar se já foi solicitada a permissão anteriormente
    const permissionRequested = localStorage.getItem('geolocation-permission-requested');
    
    if (!permissionRequested) {
      // Aguardar um pouco para o app carregar completamente
      setTimeout(() => {
        setShowPermissionModal(true);
      }, 2000);
    }
  }, []);

  const handleAllowLocation = async () => {
    try {
      if (!navigator.geolocation) {
        showToast('Geolocalização não é suportada neste dispositivo.', 'error');
        setShowPermissionModal(false);
        localStorage.setItem('geolocation-permission-requested', 'true');
        return;
      }

      // Solicitar permissão de geolocalização
      navigator.geolocation.getCurrentPosition(
        (position) => {
          showToast('Permissão de localização concedida com sucesso!', 'success');
          setShowPermissionModal(false);
          localStorage.setItem('geolocation-permission-requested', 'true');
          localStorage.setItem('geolocation-permission-granted', 'true');
        },
        (error) => {
          let errorMessage = 'Erro ao obter localização.';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permissão de localização negada. Você pode alterar isso nas configurações do navegador.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Localização não disponível.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Tempo limite para obter localização.';
              break;
            default:
              errorMessage = 'Erro desconhecido ao obter localização.';
              break;
          }
          
          showToast(errorMessage, 'error');
          setShowPermissionModal(false);
          localStorage.setItem('geolocation-permission-requested', 'true');
          localStorage.setItem('geolocation-permission-granted', 'false');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } catch (error) {
      console.error('Erro ao solicitar permissão de geolocalização:', error);
      showToast('Erro ao solicitar permissão de localização.', 'error');
      setShowPermissionModal(false);
      localStorage.setItem('geolocation-permission-requested', 'true');
    }
  };

  const handleDenyLocation = () => {
    showToast('Permissão de localização negada. Algumas funcionalidades podem não funcionar corretamente.', 'warning');
    setShowPermissionModal(false);
    localStorage.setItem('geolocation-permission-requested', 'true');
    localStorage.setItem('geolocation-permission-granted', 'false');
  };

  if (!showPermissionModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <MapPin className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <h2 className="text-xl font-bold text-center mb-2">
          Permissão de Localização
        </h2>
        
        <p className="text-gray-600 text-center mb-6">
          Para melhor experiência e funcionalidades de rastreamento em tempo real, 
          precisamos acessar sua localização. Isso nos permite:
        </p>
        
        <ul className="text-sm text-gray-600 mb-6 space-y-2">
          <li className="flex items-center">
            <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
            Rastrear entregas em tempo real
          </li>
          <li className="flex items-center">
            <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
            Mostrar sua posição no mapa
          </li>
          <li className="flex items-center">
            <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
            Melhorar a precisão das rotas
          </li>
        </ul>
        
        <div className="flex space-x-3">
          <button
            onClick={handleDenyLocation}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center"
          >
            <X className="h-4 w-4 mr-2" />
            Não Permitir
          </button>
          
          <button
            onClick={handleAllowLocation}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Permitir
          </button>
        </div>
        
        <p className="text-xs text-gray-500 text-center mt-4">
          Você pode alterar essa configuração a qualquer momento nas configurações do seu navegador.
        </p>
      </div>
    </div>
  );
};

export default GeolocationPermission;