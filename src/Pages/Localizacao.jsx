import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Filter, Clock, User, Building, Truck } from 'lucide-react';
import PageHeader from '../Components/PageHeader.jsx';
import LocationHistory from '../Components/LocationHistory.jsx';
import { useTheme } from '../contexts/ThemeContext.js';
import '../App.css';
import { MapContainer, TileLayer, Marker, Popup, useMap, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuth } from '../AuthContext.js';
import { ToastContext } from '../App.js';
import { useNavigate } from 'react-router-dom';
import { saveUserLocation, getOnlineUserLocations, getDeliveryRecordsByUser } from '../firebaseUtils.js';
import { saveUserData, hasLoggedInToday } from '../indexedDBUtils.js';

// Função para gerar cores diferentes para cada usuário
const generateUserColor = (userEmail) => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
  ];
  
  // Usar hash do email para garantir cor consistente
  let hash = 0;
  for (let i = 0; i < userEmail.length; i++) {
    const char = userEmail.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Função para criar ícone colorido
const createColoredIcon = (color, isCurrentUser = false) => {
  const size = isCurrentUser ? [32, 32] : [28, 28];
  const anchor = isCurrentUser ? [16, 32] : [14, 28];
  
  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
        <path fill="${color}" stroke="#fff" stroke-width="2" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `)}`,
    iconSize: size,
    iconAnchor: anchor,
    popupAnchor: [0, -anchor[1]],
  });
};

const userIcon = createColoredIcon('#FF6B6B', true); // Vermelho para o usuário atual

function Localizacao() {
  const { currentUser } = useAuth();
  const { isDarkMode } = useTheme();
  const { showToast } = React.useContext(ToastContext);
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState(null);
  const [currentDelivery, setCurrentDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onlineDrivers, setOnlineDrivers] = useState([]);
  const locationWatchId = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFretista, setSelectedFretista] = useState("");
  const [selectedCliente, setSelectedCliente] = useState("");

  // Proteção de rota: admin, colaborador e fretista
  useEffect(() => {
    if (currentUser && !['admin', 'colaborador', 'fretista'].includes(currentUser.type)) {
      showToast('Acesso negado! Apenas administradores, colaboradores e fretistas podem acessar a localização.', 'error');
      navigate('/');
    }
  }, [currentUser, navigate]); // Removido showToast das dependências para evitar loop infinito

  // Registra o service worker para atualização em segundo plano
  useEffect(() => {
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
  }, []);

  // Atualiza localização do usuário logado e configura para atualização em segundo plano
  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    
    // Salva dados do usuário no IndexedDB para uso pelo service worker
    saveUserData(currentUser);
    
    // Verifica se o usuário já fez login hoje (requisito para atualização em segundo plano)
    hasLoggedInToday().then(loggedToday => {
      console.log('Usuário logou hoje:', loggedToday);
    });
    
    // Pega localização do navegador
    if (navigator.geolocation) {
      locationWatchId.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation({ latitude, longitude });
          
          // Salva no Firestore
          await saveUserLocation({
            user_email: currentUser.email,
            user_name: currentUser.displayName || currentUser.email,
            latitude,
            longitude,
            is_online: true,
          });
          
          // Registra tarefa de sincronização para atualização em segundo plano
          if ('serviceWorker' in navigator && 'SyncManager' in window) {
            navigator.serviceWorker.ready
              .then(registration => {
                registration.sync.register('updateLocation')
                  .catch(err => console.error('Erro ao registrar sincronização:', err));
              })
              .catch(err => console.error('Service worker não está pronto:', err));
          }
          
          setLoading(false);
        },
        (err) => {
          setLoading(false);
          alert('Não foi possível obter sua localização. Permita o acesso ao GPS.');
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
      );
    } else {
      setLoading(false);
      alert('Geolocalização não suportada no seu navegador.');
    }
    
    // Solicita permissão para notificações (necessário para background sync em alguns navegadores)
    if ('Notification' in window) {
      Notification.requestPermission();
    }
    
    return () => {
      if (locationWatchId.current) navigator.geolocation.clearWatch(locationWatchId.current);
    };
  }, [currentUser]);

  // Busca localizações dos fretistas online em tempo real
  useEffect(() => {
    let interval;
    const fetchDrivers = async () => {
      const drivers = await getOnlineUserLocations();
      // Remove duplicatas baseado no email do usuário
      const uniqueDrivers = drivers.filter((driver, index, self) => 
        index === self.findIndex(d => d.user_email === driver.user_email)
      );
      setOnlineDrivers(uniqueDrivers);
    };
    fetchDrivers();
    interval = setInterval(fetchDrivers, 10000); // Atualiza a cada 10s
    return () => clearInterval(interval);
  }, []);

  // Busca entrega real em andamento do usuário
  useEffect(() => {
    const fetchCurrentDelivery = async () => {
      if (!currentUser?.email) return;
      
      try {
        const userRecords = await getDeliveryRecordsByUser(currentUser.email);
        const activeDelivery = userRecords.find(record => 
          record.status === 'Entrega em andamento' && record.checkin_time
        );
        
        if (activeDelivery) {
          setCurrentDelivery({
            client: activeDelivery.client,
            startTime: new Date(activeDelivery.checkin_time),
            status: activeDelivery.status,
            id: activeDelivery.id
          });
        } else {
          setCurrentDelivery(null);
        }
      } catch (error) {
        console.error('Erro ao buscar entrega em andamento:', error);
        setCurrentDelivery(null);
      }
    };

    fetchCurrentDelivery();
    
    // Atualiza a cada 30 segundos para manter dados atualizados
    const interval = setInterval(fetchCurrentDelivery, 30000);
    
    return () => clearInterval(interval);
  }, [currentUser?.email]);

  const getTimeInStore = () => {
    if (!currentDelivery?.startTime) return '0 min';
    const diffMs = Date.now() - currentDelivery.startTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes} min`;
  };

  // Centraliza o mapa na localização do usuário
  function CenterMap({ position }) {
    const map = useMap();
    useEffect(() => {
      if (position) map.setView([position.latitude, position.longitude], 15);
    }, [position, map]);
    return null;
  }

  // Extrai lista de fretistas únicos
  const fretistasList = Array.from(new Set(onlineDrivers.map(d => d.user_name)));
  // Extrai lista de clientes únicos das entregas em andamento (simulado)
  const clientesList = currentDelivery ? [currentDelivery.client] : [];

  // Filtro aplicado aos fretistas ativos
  const filteredDrivers = onlineDrivers.filter(driver => {
    const matchesSearch =
      driver.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFretista = selectedFretista ? driver.user_name === selectedFretista : true;
    return matchesSearch && matchesFretista;
  });

  // Filtro aplicado à entrega em andamento (simulado)
  const showCurrentDelivery = currentDelivery &&
    (!selectedCliente || currentDelivery.client === selectedCliente) &&
    (searchTerm === '' || currentDelivery.client.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="localizacao-container" style={{
      maxWidth: '1300px', 
      margin: '0 auto', 
      padding: '0 0 20px 0',
      backgroundColor: isDarkMode ? '#0f0f0f' : 'transparent'
    }}>
      {/* Cabeçalho moderno */}
      <PageHeader
        title="Localização"
        subtitle="Acompanhe localização em tempo real dos fretistas"
        icon={MapPin}
      />

      {/* Filtros de Localização */}
      <div className="card" style={{padding: 20, marginBottom: 20, background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
              backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
              border: isDarkMode ? '1px solid #0F0F0F' : undefined,
              marginBlock: 14,
              boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined}}>
        <h3 style={{fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600}}>
          <Filter style={{width: 16, height: 16}} />
          Filtros de Localização
        </h3>      
      {/* Filtros dinâmicos */}
      <div style={{
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 12, 
        marginBottom: 16, 
        justifyContent: 'center', 
        alignItems: 'center',
        borderRadius: 12,
        background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
        backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
        border: isDarkMode ? '1px solid #0F0F0F' : undefined,
        boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined,
        padding: '12px'
      }}>
        <input
          type="text"
          placeholder="Buscar por nome, e-mail ou cliente..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
                      style={{
            padding: 8, 
            width: '100%', 
            background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
            borderRadius: 4, 
            fontSize: 14, 
            backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            border: isDarkMode ? '1px solid #0F0F0F' : undefined,
            boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined,
            backgroundColor: isDarkMode ? '#2a2a2a' : '#fff',
            color: isDarkMode ? '#e2e8f0' : '#000'
            }}
        />
        <select
          value={selectedFretista}
          onChange={e => setSelectedFretista(e.target.value)}
                      style={{
            padding: 8, 
            width: '100%', 
            background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
            borderRadius: 4, 
            fontSize: 14, 
            backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            border: isDarkMode ? '1px solid #0F0F0F' : undefined,
            boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined,
            backgroundColor: isDarkMode ? '#2a2a2a' : '#fff',
            color: isDarkMode ? '#e2e8f0' : '#000'
            }}
        >
          <option value="">🚛 Todos os Fretistas</option>
          {fretistasList.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select
          value={selectedCliente}
          onChange={e => setSelectedCliente(e.target.value)}
            style={{
            padding: 8, 
            width: '100%', 
            background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
            borderRadius: 4, 
            fontSize: 14, 
            backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
            border: isDarkMode ? '1px solid #0F0F0F' : undefined,
            boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined,
            backgroundColor: isDarkMode ? '#2a2a2a' : '#fff',
            color: isDarkMode ? '#e2e8f0' : '#000'
            }}
        >
          <option value="">👤 Todos os Clientes</option>
          {clientesList.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          type="button"
          onClick={() => { setSearchTerm(''); setSelectedFretista(''); setSelectedCliente(''); }}
          style={{
            padding: '6px 12px',
            borderRadius: 4,
            border: 'none',
            background: isDarkMode 
              ? 'linear-gradient(90deg, #38a169 0%, #3182ce 100%)' 
              : 'linear-gradient(90deg, #43a047 0%, #1976d2 100%)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            boxShadow: '0 1px 4px #1976d233',
            transition: 'background 0.2s',
            marginLeft: 6
          }}
        >
          Limpar filtros
        </button>
      </div>
      </div>


      {/* Mapa ampliado e responsivo */}
      <div style={{
        width: '100%',
        maxWidth: '100%',
        margin: '0 auto',
        marginBottom: 20,
        borderRadius: 8,
        boxShadow: isDarkMode 
          ? '0 4px 16px rgba(0,0,0,0.3)' 
          : '0 4px 16px rgba(33,136,56,0.10)',
        overflow: 'hidden',
        background: isDarkMode ? '#2a2a2a' : '#fff',
        minHeight: 350,
        height: '40vw',
        maxHeight: 500,
        minWidth: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          padding: '16px 20px 0 20px', 
          background: isDarkMode 
            ? 'linear-gradient(90deg, #2d5a3d 0%, #2d4a5a 100%)' 
            : 'linear-gradient(90deg, #e3fcec 0%, #e3f0fc 100%)', 
          borderRadius: '8px 8px 0 0'
        }}>
          <h3 style={{
            fontSize: '1.1rem', 
            color: isDarkMode ? '#68d391' : '#218838', 
            margin: 0, 
            fontWeight: 700, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8
          }}>
            <Navigation style={{width: 20, height: 20}} />
            Mapa de Localização
          </h3>
        </div>
        <div style={{
          flex: 1, 
          minHeight: 280, 
          width: '100%', 
          background: isDarkMode ? '#2a2a2a' : '#f8f9fa', 
          borderRadius: '0 0 8px 8px', 
          overflow: 'hidden', 
          position: 'relative'
        }}>
            {loading || !userLocation ? (
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, justifyContent: 'center', height: '100%'}}>
              <div style={{
                width: 40, 
                height: 40, 
                border: isDarkMode ? '4px solid #4a5568' : '4px solid #e0e0e0', 
                borderTop: isDarkMode ? '4px solid #68d391' : '4px solid #218838', 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{
                color: isDarkMode ? '#a0aec0' : '#666', 
                margin: 0, 
                fontSize: 16
              }}>Carregando mapa...</p>
              </div>
            ) : (
            <MapContainer center={[userLocation.latitude, userLocation.longitude]} zoom={15} style={{height: '100%', width: '100%', borderRadius: 0, }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <CenterMap position={userLocation} />
                {/* Marker do usuário logado */}
                <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon}>
                  <Tooltip permanent direction="top" offset={[0, -40]} className="user-tooltip">
                    <span style={{fontWeight: 'bold', color: '#333'}}>Você</span>
                  </Tooltip>
                  <Popup>
                    <b>Você</b><br />
                    {currentUser?.displayName || currentUser?.email}
                  </Popup>
                </Marker>
                {/* Markers dos fretistas online */}
              {filteredDrivers.filter(d => d.user_email !== currentUser.email).map((driver, index) => {
                const driverColor = generateUserColor(driver.user_email);
                const driverIcon = createColoredIcon(driverColor);
                
                return (
                  <Marker key={`${driver.user_email}-${driver.last_update || index}`} position={[driver.latitude, driver.longitude]} icon={driverIcon}>
                    <Tooltip permanent direction="top" offset={[0, -35]} className="driver-tooltip">
                      <span style={{fontWeight: 'bold', color: '#333'}}>{driver.user_name}</span>
                    </Tooltip>
                    <Popup>
                      <b>{driver.user_name}</b><br />
                      <br />Última atualização: {new Date(driver.last_update).toLocaleTimeString('pt-BR')}
                    </Popup>
                  </Marker>
                );
              })}
              </MapContainer>
            )}
          </div>
        </div>

      {/* Cards abaixo do mapa, responsivos */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 5, width: '100%', maxWidth: 900, margin: '0 auto', borderRadius: '12px',
      }}>
        {/* Card informações do usuário */}
        <div className="card" style={{
          padding: 5, 
          background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
          backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
          border: isDarkMode ? '1px solid #0F0F0F' : undefined,
          boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined,
          borderRadius: '12px'
        }}>
          <h3 style={{
            fontSize: '1rem', 
            color: isDarkMode ? '#68d391' : '#218838', 
            marginBottom: 12, 
            fontWeight: 600, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6
          }}>
            <User style={{width: 18, height: 18}} />
            Seu Usuário
          </h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
              <span style={{
                fontWeight: 500, 
                color: isDarkMode ? '#a0aec0' : '#495057',
                fontSize: 14
              }}>Nome:</span>
              <span style={{
                color: isDarkMode ? '#68d391' : '#218838', 
                fontWeight: 600,
                fontSize: 14
              }}>{currentUser?.displayName || currentUser?.email}</span>
              </div>
            <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
              <span style={{
                fontWeight: 500, 
                color: isDarkMode ? '#a0aec0' : '#495057',
                fontSize: 14
              }}>Tipo:</span>
              <span style={{
                color: isDarkMode ? '#63b3ed' : '#1976d2', 
                fontWeight: 600, 
                textTransform: 'capitalize',
                fontSize: 14
              }}>{currentUser?.type}</span>
            </div>
            {userLocation && (
              <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <MapPin style={{
                  width: 16, 
                  height: 16, 
                  color: isDarkMode ? '#63b3ed' : '#1976d2'
                }} />
                <span style={{
                  fontWeight: 500, 
                  color: isDarkMode ? '#a0aec0' : '#495057',
                  fontSize: 14
                }}>Localização:</span>
                <span style={{
                  color: isDarkMode ? '#63b3ed' : '#1976d2', 
                  fontWeight: 600,
                  fontSize: 14
                }}>
                  Lat: {userLocation.latitude.toFixed(4)}, Long: {userLocation.longitude.toFixed(4)}
                </span>
              </div>
            )}
        </div>
      </div>

        {/* Card entrega atual */}
        {showCurrentDelivery && (
          <div className="card" style={{
            padding: 5, 
          background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
          backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
          border: isDarkMode ? '1px solid #0F0F0F' : undefined,
          boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined,
          borderRadius: '12px'
          }}>
            <h3 style={{
              fontSize: '1rem', 
              color: isDarkMode ? '#fbb040' : '#ff9800', 
              marginBottom: 12, 
              fontWeight: 600, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6
            }}>
            <Truck style={{width: 18, height: 18}} />
            Entrega em Andamento
          </h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <span style={{
                  fontWeight: 500, 
                  color: isDarkMode ? '#a0aec0' : '#495057',
                  fontSize: 14
                }}>Cliente:</span>
                <span style={{
                  color: isDarkMode ? '#fbb040' : '#ff9800', 
                  fontWeight: 600,
                  fontSize: 14
                }}>{currentDelivery.client}</span>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <Clock style={{
                  width: 16, 
                  height: 16, 
                  color: isDarkMode ? '#68d391' : '#4caf50'
                }} />
                <span style={{
                  fontWeight: 500, 
                  color: isDarkMode ? '#a0aec0' : '#495057',
                  fontSize: 14
                }}>Tempo em Loja:</span>
                <span style={{
                  color: isDarkMode ? '#68d391' : '#4caf50', 
                  fontWeight: 600,
                  fontSize: 14
                }}>{getTimeInStore()}</span>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <Navigation style={{
                  width: 16, 
                  height: 16, 
                  color: isDarkMode ? '#63b3ed' : '#1976d2'
                }} />
                <span style={{
                  fontWeight: 500, 
                  color: isDarkMode ? '#a0aec0' : '#495057',
                  fontSize: 14
                }}>Status:</span>
                <span style={{
                  color: isDarkMode ? '#63b3ed' : '#1976d2', 
                  fontWeight: 600,
                  fontSize: 14
                }}>{currentDelivery.status}</span>
            </div>
          </div>
        </div>
      )}

        {/* Card fretistas ativos */}
        <div className="card" style={{
          padding: 5, 
          background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
          backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
          border: isDarkMode ? '1px solid #0F0F0F' : undefined,
          boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined,
          borderRadius: '12px'
        }}>
          <h3 style={{
            fontSize: '1rem', 
            color: isDarkMode ? '#63b3ed' : '#1976d2', 
            marginBottom: 12, 
            fontWeight: 600, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6
          }}>
          <Truck style={{width: 18, height: 18}} />
          Fretistas Ativos
        </h3>
          <div style={{
            padding: 12, 
            minHeight: 60, 
            maxHeight: 180, 
            overflowY: 'auto',
          background: isDarkMode ? 'linear-gradient(135deg, rgba(25, 25, 25, 0.9) 0%, rgba(25, 25, 25, 0.7) 100%)' : 'white',
          backdropFilter: isDarkMode ? 'blur(20px)' : 'none',
          border: isDarkMode ? '1px solid #0F0F0F' : undefined,
          boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : undefined,
          borderRadius: '12px'
          }}>
            {filteredDrivers.length === 0 ? (
              <p style={{
                color: isDarkMode ? '#a0aec0' : '#666', 
                margin: 0, 
                fontSize: 14
              }}>Nenhum fretista online no momento.</p>
          ) : (
            <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
                {filteredDrivers.map((driver, index) => (
                  <li key={`${driver.user_email}-${driver.last_update || index}`} style={{
                    marginBottom: 6, 
                    color: driver.user_email === currentUser.email 
                      ? (isDarkMode ? '#68d391' : '#218838') 
                      : (isDarkMode ? '#e2e8f0' : '#333'), 
                    fontWeight: driver.user_email === currentUser.email ? 600 : 400, 
                    fontSize: 14
                  }}>
                    <span style={{marginRight: 4}}>{driver.user_name}</span> 
                    {driver.user_email === currentUser.email && 
                      <span style={{
                        color: isDarkMode ? '#68d391' : '#43a047', 
                        fontWeight: 600, 
                        marginLeft: 4
                      }}>(Você)</span>
                    }
                  <span style={{
                    marginLeft: 6, 
                    color: isDarkMode ? '#a0aec0' : '#888', 
                    fontSize: 12
                  }}>
                    Última atualização: {new Date(driver.last_update).toLocaleTimeString('pt-BR')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      </div>

      {/* Histórico de Localização */}
      <LocationHistory />

      {/* Responsividade mobile */}
      <style>{`
        @media (max-width: 900px) {
          .localizacao-container > div[style*='grid'] { display: block !important; }
          .localizacao-container > div[style*='grid'] > div { width: 100% !important; max-width: 100% !important; }
        }
        @media (max-width: 600px) {
          .localizacao-container { padding: 0 0 12px 0 !important; }
          .card { border-radius: 4px !important; padding: 12px !important; }
          .localizacao-container h2 { font-size: 1.2rem !important; }
        }
      `}</style>

      {/* Botão flutuante para Registros */}
      <div
        onClick={() => navigate('/registros')}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)',
          boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: 20,
          color: '#fff',
          zIndex: 1000,
          transition: 'all 0.3s ease',
          border: '2px solid rgba(255, 255, 255, 0.2)',
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = '0 6px 16px rgba(255, 152, 0, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 4px 12px rgba(255, 152, 0, 0.3)';
        }}
      >
        🚛
      </div>
    </div>
  );
}

export default Localizacao;
