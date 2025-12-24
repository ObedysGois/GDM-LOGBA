import React, { useState, useEffect } from 'react';
import { getUserLocationHistory, getAllUsersLocationHistory, isAdmin, isCollaborator } from '../firebaseUtils';
import { useAuth } from '../AuthContext';
import { getAddressFromCoordinates } from '../utils/geocodingUtils';
import './LocationHistory.css';

const LocationHistory = () => {
  const [locationHistory, setLocationHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addressesLoading, setAddressesLoading] = useState(new Set());
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


  // Função para extrair o nome do usuário do email ou usar user_name
  const getUserDisplayName = (location) => {
    if (location.user_name) {
      return location.user_name;
    }
    if (location.user_email) {
      return location.user_email.split('@')[0];
    }
    return 'Usuário desconhecido';
  };

  // Função removida - não é mais necessária pois sempre mostramos o nome do usuário

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
            <div key={location.id || `location-${index}`} className="history-item">
              <div className="history-time">
                {formatDate(location.timestamp || location.last_update)}
              </div>
              {/* Sempre mostrar nome do usuário */}
              <div className="user-info">
                👤 {getUserDisplayName(location)}
              </div>
              <div className="history-location">
                <div className="coordinates">
                  📍 {location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)}
                </div>
                {/* Mostrar endereço se disponível, caso contrário tentar obter */}
                {location.address ? (
                  <div className="address">📍 {location.address}</div>
                ) : location.latitude && location.longitude && !addressesLoading.has(location.id) ? (
                  <div 
                    className="address address-loading"
                    onClick={async () => {
                      if (addressesLoading.has(location.id)) return;
                      setAddressesLoading(prev => new Set(prev).add(location.id));
                      try {
                        const address = await getAddressFromCoordinates(location.latitude, location.longitude);
                        if (address) {
                          setLocationHistory(prev => prev.map(loc => 
                            loc.id === location.id ? { ...loc, address } : loc
                          ));
                        }
                      } catch (err) {
                        console.error('Erro ao obter endereço:', err);
                      } finally {
                        setAddressesLoading(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(location.id);
                          return newSet;
                        });
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                    title="Clique para carregar endereço"
                  >
                    📍 Clique para carregar endereço
                  </div>
                ) : location.latitude && location.longitude ? (
                  <div className="address address-loading">📍 Carregando endereço...</div>
                ) : null}
                <div className="status">
                  {location.is_online !== false ? (
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