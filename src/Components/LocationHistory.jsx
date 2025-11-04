import React, { useState, useEffect } from 'react';
import { getUserLocationHistory, getAllUsersLocationHistory, isAdmin, isCollaborator } from '../firebaseUtils';
import { useAuth } from '../AuthContext';
import './LocationHistory.css';

const LocationHistory = () => {
  const [locationHistory, setLocationHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchLocationHistory = async () => {
      if (!currentUser?.email) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Verifica se o usuário tem permissão para ver todos os históricos
        const canViewAllHistory = isAdmin(currentUser.email) || 
                                 isCollaborator(currentUser) || 
                                 currentUser.userType === 'manager';
        
        let history;
        if (canViewAllHistory) {
          // Admin, colaborador ou gerente vê todos os históricos
          history = await getAllUsersLocationHistory();
        } else {
          // Fretista vê apenas seu próprio histórico
          history = await getUserLocationHistory(currentUser.email);
        }
        
        setLocationHistory(history);
        setError(null);
      } catch (err) {
        console.error('Erro ao buscar histórico:', err);
        setError('Erro ao carregar histórico de localização');
      } finally {
        setLoading(false);
      }
    };

    fetchLocationHistory();
  }, [currentUser]);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAddressFromCoords = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=YOUR_API_KEY&language=pt&pretty=1`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const components = data.results[0].components;
        const neighbourhood = components.neighbourhood || components.suburb || '';
        const road = components.road || '';
        return `${road}${neighbourhood ? `, ${neighbourhood}` : ''}`;
      }
    } catch (error) {
      console.error('Erro ao buscar endereço:', error);
    }
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  // Função para extrair o nome do usuário do email
  const getUserNameFromEmail = (email) => {
    if (!email) return 'Usuário desconhecido';
    return email.split('@')[0];
  };

  // Verifica se deve mostrar informações de usuário
  const shouldShowUserInfo = () => {
    return isAdmin(currentUser?.email) || 
           isCollaborator(currentUser) || 
           currentUser?.userType === 'manager';
  };

  if (loading) {
    return (
      <div className="location-history-container">
        <div className="location-history-header">
          <h3>📍 Histórico de Localização</h3>
        </div>
        <div className="loading">Carregando histórico...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="location-history-container">
        <div className="location-history-header">
          <h3>📍 Histórico de Localização</h3>
        </div>
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="location-history-container">
      <div className="location-history-header">
        <h3>📍 Histórico de Localização</h3>
        <span className="history-count">{locationHistory.length} registros</span>
      </div>
      
      {locationHistory.length === 0 ? (
        <div className="no-history">
          <p>Nenhum histórico de localização encontrado.</p>
          <small>O histórico será criado conforme você utiliza o app.</small>
        </div>
      ) : (
        <div className="history-list">
          {locationHistory.map((location, index) => (
            <div key={location.id || index} className="history-item">
              <div className="history-time">
                {formatDate(location.timestamp)}
              </div>
              {shouldShowUserInfo() && (
                <div className="user-info">
                  👤 {getUserNameFromEmail(location.user_email)}
                </div>
              )}
              <div className="history-location">
                <div className="coordinates">
                  📍 {location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)}
                </div>
                {location.address && (
                  <div className="address">{location.address}</div>
                )}
                <div className="status">
                  {location.is_online ? (
                    <span className="online">🟢 Online</span>
                  ) : (
                    <span className="offline">🔴 Offline</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationHistory;