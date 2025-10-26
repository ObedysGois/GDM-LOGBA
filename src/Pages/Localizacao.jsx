import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Clock, User, Building, Truck } from 'lucide-react';
import PageHeader from '../Components/PageHeader.jsx';
import { useTheme } from '../contexts/ThemeContext.js';
import '../App.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuth } from '../AuthContext.js';
import { ToastContext } from '../App.js';
import { useNavigate } from 'react-router-dom';
import { saveUserLocation, getOnlineUserLocations } from '../firebaseUtils.js';
import { saveUserData, hasLoggedInToday } from '../indexedDBUtils.js';

// Ícone customizado para o usuário logado
const userIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});
// Ícone para outros fretistas
const driverIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/854/854878.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

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

  // Proteção de rota: só admin e colaborador
  useEffect(() => {
    if (currentUser && currentUser.type !== 'admin' && currentUser.type !== 'colaborador') {
      showToast('Acesso negado! Apenas administradores e colaboradores podem acessar a localização.', 'error');
      navigate('/');
    }
  }, [currentUser, navigate, showToast]);

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
      setOnlineDrivers(drivers);
    };
    fetchDrivers();
    interval = setInterval(fetchDrivers, 10000); // Atualiza a cada 10s
    return () => clearInterval(interval);
  }, []);

  // Simula entrega em andamento (substitua por lógica real se necessário)
  useEffect(() => {
    setTimeout(() => {
      setCurrentDelivery({
        client: 'Assai Paralela',
        startTime: new Date(Date.now() - 30 * 60 * 1000), // 30 min atrás
        status: 'Em andamento',
      });
    }, 1000);
  }, []);

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
      padding: '0 0 32px 0',
      backgroundColor: isDarkMode ? '#1a202c' : 'transparent'
    }}>
      {/* Cabeçalho moderno */}
      <PageHeader
        title="Localização"
        subtitle="Acompanhe localização em tempo real dos fretistas"
        icon={MapPin}
      />

      {/* Filtros dinâmicos */}
      <div style={{
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 16, 
        marginBottom: 24, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: isDarkMode ? '#2d3748' : '#fff',
        padding: '20px',
        borderRadius: '12px',
        border: isDarkMode ? '1px solid #4a5568' : '1px solid #e2e8f0'
      }}>
        <input
          type="text"
          placeholder="Buscar por nome, e-mail ou cliente..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            padding: '10px 16px', 
            borderRadius: 8, 
            border: isDarkMode ? '1px solid #4a5568' : '1px solid #d0d7de', 
            fontSize: 16, 
            minWidth: 220,
            backgroundColor: isDarkMode ? '#1a202c' : '#fff',
            color: isDarkMode ? '#e2e8f0' : '#000'
          }}
        />
        <select
          value={selectedFretista}
          onChange={e => setSelectedFretista(e.target.value)}
          style={{
            padding: '10px 16px', 
            borderRadius: 8, 
            border: isDarkMode ? '1px solid #4a5568' : '1px solid #d0d7de', 
            fontSize: 16, 
            minWidth: 180,
            backgroundColor: isDarkMode ? '#1a202c' : '#fff',
            color: isDarkMode ? '#e2e8f0' : '#000'
          }}
        >
          <option value="">Todos os Fretistas</option>
          {fretistasList.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select
          value={selectedCliente}
          onChange={e => setSelectedCliente(e.target.value)}
          style={{
            padding: '10px 16px', 
            borderRadius: 8, 
            border: isDarkMode ? '1px solid #4a5568' : '1px solid #d0d7de', 
            fontSize: 16, 
            minWidth: 180,
            backgroundColor: isDarkMode ? '#1a202c' : '#fff',
            color: isDarkMode ? '#e2e8f0' : '#000'
          }}
        >
          <option value="">Todos os Clientes</option>
          {clientesList.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          type="button"
          onClick={() => { setSearchTerm(''); setSelectedFretista(''); setSelectedCliente(''); }}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: 'none',
            background: isDarkMode 
              ? 'linear-gradient(90deg, #38a169 0%, #3182ce 100%)' 
              : 'linear-gradient(90deg, #43a047 0%, #1976d2 100%)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            cursor: 'pointer',
            boxShadow: '0 2px 8px #1976d233',
            transition: 'background 0.2s',
            marginLeft: 8
          }}
        >
          Limpar filtros
        </button>
      </div>

      {/* Mapa ampliado e responsivo */}
      <div style={{
        width: '100%',
        maxWidth: '100%',
        margin: '0 auto',
        marginBottom: 32,
        borderRadius: 24,
        boxShadow: isDarkMode 
          ? '0 8px 32px rgba(0,0,0,0.3)' 
          : '0 8px 32px rgba(33,136,56,0.10)',
        overflow: 'hidden',
        background: isDarkMode ? '#2d3748' : '#fff',
        minHeight: 400,
        height: '48vw',
        maxHeight: 600,
        minWidth: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          padding: '28px 32px 0 32px', 
          background: isDarkMode 
            ? 'linear-gradient(90deg, #2d5a3d 0%, #2d4a5a 100%)' 
            : 'linear-gradient(90deg, #e3fcec 0%, #e3f0fc 100%)', 
          borderRadius: '24px 24px 0 0'
        }}>
          <h3 style={{
            fontSize: '1.4rem', 
            color: isDarkMode ? '#68d391' : '#218838', 
            margin: 0, 
            fontWeight: 800, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10
          }}>
            <Navigation style={{width: 24, height: 24}} />
            Mapa de Localização
          </h3>
        </div>
        <div style={{
          flex: 1, 
          minHeight: 300, 
          width: '100%', 
          background: isDarkMode ? '#1a202c' : '#f8f9fa', 
          borderRadius: '0 0 24px 24px', 
          overflow: 'hidden', 
          position: 'relative'
        }}>
            {loading || !userLocation ? (
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, justifyContent: 'center', height: '100%'}}>
              <div style={{
                width: 56, 
                height: 56, 
                border: isDarkMode ? '5px solid #4a5568' : '5px solid #e0e0e0', 
                borderTop: isDarkMode ? '5px solid #68d391' : '5px solid #218838', 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{
                color: isDarkMode ? '#a0aec0' : '#666', 
                margin: 0, 
                fontSize: 18
              }}>Carregando mapa...</p>
              </div>
            ) : (
            <MapContainer center={[userLocation.latitude, userLocation.longitude]} zoom={15} style={{height: '100%', width: '100%', borderRadius: 0}}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <CenterMap position={userLocation} />
                {/* Marker do usuário logado */}
                <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon}>
                  <Popup>
                    <b>Você</b><br />
                    {currentUser?.displayName || currentUser?.email}
                  </Popup>
                </Marker>
                {/* Markers dos fretistas online */}
              {filteredDrivers.filter(d => d.user_email !== currentUser.email).map(driver => (
                  <Marker key={driver.user_email} position={[driver.latitude, driver.longitude]} icon={driverIcon}>
                    <Popup>
                      <b>{driver.user_name}</b><br />
                      {driver.user_email}
                      <br />Última atualização: {new Date(driver.last_update).toLocaleTimeString('pt-BR')}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>
        </div>

      {/* Cards abaixo do mapa, responsivos */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 28, width: '100%', maxWidth: 900, margin: '0 auto',
      }}>
        {/* Card informações do usuário */}
        <div className="card" style={{
          padding: 24, 
          borderRadius: 18, 
          boxShadow: isDarkMode 
            ? '0 4px 16px rgba(0,0,0,0.3)' 
            : '0 4px 16px #21883811', 
          background: isDarkMode ? '#2d3748' : '#fff',
          border: isDarkMode ? '1px solid #4a5568' : 'none'
        }}>
          <h3 style={{
            fontSize: '1.1rem', 
            color: isDarkMode ? '#68d391' : '#218838', 
            marginBottom: 18, 
            fontWeight: 700, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8
          }}>
            <User style={{width: 20, height: 20}} />
            Seu Usuário
          </h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
              <span style={{
                fontWeight: 600, 
                color: isDarkMode ? '#a0aec0' : '#495057'
              }}>Nome:</span>
              <span style={{
                color: isDarkMode ? '#68d391' : '#218838', 
                fontWeight: 700
              }}>{currentUser?.displayName || currentUser?.email}</span>
              </div>
            <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
              <span style={{
                fontWeight: 600, 
                color: isDarkMode ? '#a0aec0' : '#495057'
              }}>Tipo:</span>
              <span style={{
                color: isDarkMode ? '#63b3ed' : '#1976d2', 
                fontWeight: 700, 
                textTransform: 'capitalize'
              }}>{currentUser?.type}</span>
            </div>
            {userLocation && (
              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <MapPin style={{
                  width: 18, 
                  height: 18, 
                  color: isDarkMode ? '#63b3ed' : '#1976d2'
                }} />
                <span style={{
                  fontWeight: 600, 
                  color: isDarkMode ? '#a0aec0' : '#495057'
                }}>Localização:</span>
                <span style={{
                  color: isDarkMode ? '#63b3ed' : '#1976d2', 
                  fontWeight: 700
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
            padding: 24, 
            borderRadius: 18, 
            boxShadow: isDarkMode 
              ? '0 4px 16px rgba(0,0,0,0.3)' 
              : '0 4px 16px #ff980011', 
            background: isDarkMode ? '#2d3748' : '#fff',
            border: isDarkMode ? '1px solid #4a5568' : 'none'
          }}>
            <h3 style={{
              fontSize: '1.1rem', 
              color: isDarkMode ? '#fbb040' : '#ff9800', 
              marginBottom: 18, 
              fontWeight: 700, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8
            }}>
            <Truck style={{width: 20, height: 20}} />
            Entrega em Andamento
          </h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <span style={{
                  fontWeight: 600, 
                  color: isDarkMode ? '#a0aec0' : '#495057'
                }}>Cliente:</span>
                <span style={{
                  color: isDarkMode ? '#fbb040' : '#ff9800', 
                  fontWeight: 700
                }}>{currentDelivery.client}</span>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <Clock style={{
                  width: 18, 
                  height: 18, 
                  color: isDarkMode ? '#68d391' : '#4caf50'
                }} />
                <span style={{
                  fontWeight: 600, 
                  color: isDarkMode ? '#a0aec0' : '#495057'
                }}>Tempo em Loja:</span>
                <span style={{
                  color: isDarkMode ? '#68d391' : '#4caf50', 
                  fontWeight: 700
                }}>{getTimeInStore()}</span>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <Navigation style={{
                  width: 18, 
                  height: 18, 
                  color: isDarkMode ? '#63b3ed' : '#1976d2'
                }} />
                <span style={{
                  fontWeight: 600, 
                  color: isDarkMode ? '#a0aec0' : '#495057'
                }}>Status:</span>
                <span style={{
                  color: isDarkMode ? '#63b3ed' : '#1976d2', 
                  fontWeight: 700
                }}>{currentDelivery.status}</span>
            </div>
          </div>
        </div>
      )}

        {/* Card fretistas ativos */}
        <div className="card" style={{
          padding: 24, 
          borderRadius: 18, 
          boxShadow: isDarkMode 
            ? '0 4px 16px rgba(0,0,0,0.3)' 
            : '0 4px 16px #1976d211', 
          background: isDarkMode ? '#2d3748' : '#fff',
          border: isDarkMode ? '1px solid #4a5568' : 'none'
        }}>
          <h3 style={{
            fontSize: '1.1rem', 
            color: isDarkMode ? '#63b3ed' : '#1976d2', 
            marginBottom: 18, 
            fontWeight: 700, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8
          }}>
          <Truck style={{width: 20, height: 20}} />
          Fretistas Ativos
        </h3>
          <div style={{
            background: isDarkMode ? '#1a202c' : '#f8f9fa', 
            padding: 16, 
            borderRadius: 12, 
            minHeight: 80, 
            maxHeight: 200, 
            overflowY: 'auto',
            border: isDarkMode ? '1px solid #4a5568' : 'none'
          }}>
            {filteredDrivers.length === 0 ? (
              <p style={{
                color: isDarkMode ? '#a0aec0' : '#666', 
                margin: 0, 
                fontSize: 15
              }}>Nenhum fretista online no momento.</p>
          ) : (
            <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
                {filteredDrivers.map(driver => (
                  <li key={driver.user_email} style={{
                    marginBottom: 8, 
                    color: driver.user_email === currentUser.email 
                      ? (isDarkMode ? '#68d391' : '#218838') 
                      : (isDarkMode ? '#e2e8f0' : '#333'), 
                    fontWeight: driver.user_email === currentUser.email ? 700 : 500, 
                    fontSize: 15
                  }}>
                    <span style={{marginRight: 6}}>{driver.user_name}</span> 
                    <span style={{
                      color: isDarkMode ? '#a0aec0' : '#888', 
                      fontSize: 13
                    }}>({driver.user_email})</span>
                    {driver.user_email === currentUser.email && 
                      <span style={{
                        color: isDarkMode ? '#68d391' : '#43a047', 
                        fontWeight: 700, 
                        marginLeft: 6
                      }}>(Você)</span>
                    }
                  <span style={{
                    marginLeft: 8, 
                    color: isDarkMode ? '#a0aec0' : '#888', 
                    fontSize: 13
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

      {/* Responsividade mobile */}
      <style>{`
        @media (max-width: 900px) {
          .localizacao-container > div[style*='grid'] { display: block !important; }
          .localizacao-container > div[style*='grid'] > div { width: 100% !important; max-width: 100% !important; }
        }
        @media (max-width: 600px) {
          .localizacao-container { padding: 0 0 16px 0 !important; }
          .card { border-radius: 12px !important; padding: 16px !important; }
          .localizacao-container h2 { font-size: 1.3rem !important; }
        }
      `}</style>

      {/* Botão flutuante para Registros */}
      <div
        onClick={() => navigate('/registros')}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)',
          boxShadow: '0 8px 24px rgba(255, 152, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: 24,
          color: '#fff',
          zIndex: 1000,
          transition: 'all 0.3s ease',
          border: '3px solid rgba(255, 255, 255, 0.2)',
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = '0 12px 32px rgba(255, 152, 0, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 8px 24px rgba(255, 152, 0, 0.3)';
        }}
      >
        🚛
      </div>
    </div>
  );
}

export default Localizacao;