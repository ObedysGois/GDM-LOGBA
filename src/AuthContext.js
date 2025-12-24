import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { logUserAccess, addUser, saveUserLocation, saveLocationToHistory } from './firebaseUtils.js';
import { getDocs, query, collection, where, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebaseConfig.js';
import { getAddressFromCoordinates } from './utils/geocodingUtils.js';
import { adminEmails } from './firebaseUtils.js';
import { saveUserData, savePendingLocation } from './indexedDBUtils.js';
import { 
  checkGeolocationPermission, 
  hasLocationTrackingPermission,
  watchPosition,
  clearWatch
} from './utils/geolocationUtils.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const locationWatchId = useRef(null);
  const locationUpdateInterval = useRef(null);

  // Função para iniciar rastreamento automático de localização
  const startLocationTracking = async (user) => {
    // Verificar se o usuário tem permissão para rastreamento
    if (!user || !hasLocationTrackingPermission(user.type)) {
      console.log('Usuário não tem permissão para rastreamento de localização:', user?.type);
      return;
    }

    // Verificar status da permissão de geolocalização
    const permissionStatus = await checkGeolocationPermission();
    
    if (permissionStatus === 'unsupported') {
      console.log('Geolocalização não suportada neste navegador');
      return;
    }
    
    if (permissionStatus === 'denied') {
      console.log('Permissão de geolocalização negada pelo usuário');
      return;
    }

    // Salvar dados do usuário no IndexedDB para uso offline
    try {
      await saveUserData(user);
    } catch (error) {
      console.error('Erro ao salvar dados do usuário no IndexedDB:', error);
    }

    // Função para atualizar localização
    const updateLocation = async (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      
      // Obter endereço usando geocodificação reversa (apenas se precisão for boa)
      // Limitar chamadas de geocodificação para evitar muitas requisições
      let address = null;
      if (accuracy && accuracy < 100) { // Apenas se precisão for menor que 100m
        try {
          // Throttle: só buscar endereço a cada 30 segundos para evitar muitas requisições
          const lastGeocodeTime = sessionStorage.getItem('lastGeocodeTime');
          const now = Date.now();
          if (!lastGeocodeTime || (now - parseInt(lastGeocodeTime)) > 30000) {
            address = await getAddressFromCoordinates(latitude, longitude);
            sessionStorage.setItem('lastGeocodeTime', now.toString());
          }
        } catch (geocodeError) {
          console.log('Erro ao obter endereço (não crítico):', geocodeError);
        }
      }
      
      const locationData = {
        user_email: user.email,
        user_name: user.displayName || user.email,
        latitude,
        longitude,
        accuracy: accuracy || null,
        address: address,
        is_online: true,
      };

      try {
        // Tentar salvar no Firebase (localização atual)
        const success = await saveUserLocation(locationData);
        
        // Salvar no histórico independentemente do sucesso da localização atual
        await saveLocationToHistory(locationData);
        
        if (!success) {
          // Se falhar, salvar no IndexedDB para sincronização posterior
          await savePendingLocation(locationData);
        }
      } catch (error) {
        console.error('Erro ao salvar localização:', error);
        // Salvar no IndexedDB como fallback
        try {
          await savePendingLocation(locationData);
          // Tentar salvar no histórico mesmo em caso de erro
          await saveLocationToHistory(locationData);
        } catch (indexedDBError) {
          console.error('Erro ao salvar localização no IndexedDB:', indexedDBError);
        }
      }
    };

    // Função para lidar com erros de geolocalização
    const handleLocationError = (error) => {
      let errorMessage = 'Erro ao obter localização';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Permissão de localização negada';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Localização não disponível';
          break;
        case error.TIMEOUT:
          errorMessage = 'Tempo limite para obter localização';
          break;
        default:
          errorMessage = 'Erro desconhecido ao obter localização';
          break;
      }
      
      console.log(errorMessage, error);
    };

    // Iniciar rastreamento contínuo usando a função utilitária
    try {
      locationWatchId.current = watchPosition(
        updateLocation,
        handleLocationError,
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 30000 // Cache por 30 segundos
        }
      );

      if (locationWatchId.current) {
        console.log('Rastreamento de localização iniciado para:', user.email);
        
        // Configurar intervalo de atualização periódica para garantir rastreamento contínuo
        // Isso garante que mesmo se watchPosition falhar, continuamos rastreando
        locationUpdateInterval.current = setInterval(async () => {
          try {
            // Obter posição atual
            const position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 60000
              });
            });
            
            // Atualizar localização
            await updateLocation(position);
            
            // Registrar sync para service worker
            if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
              navigator.serviceWorker.ready.then(async (registration) => {
                try {
                  await registration.sync.register('updateLocation');
                } catch (error) {
                  // Ignorar erros de sync
                }
              });
            }
          } catch (error) {
            console.log('Erro no rastreamento periódico (não crítico):', error);
          }
        }, 2 * 60 * 1000); // A cada 2 minutos
        
        // Configurar periodic background sync se disponível (para rastreamento mesmo com app fechado)
        if ('serviceWorker' in navigator && 'periodicSync' in window.ServiceWorkerRegistration.prototype) {
          navigator.serviceWorker.ready.then(async (registration) => {
            try {
              // Solicitar permissão para periodic sync
              const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
              if (status.state === 'granted') {
                await registration.periodicSync.register('updateLocation', {
                  minInterval: 5 * 60 * 1000 // A cada 5 minutos
                });
                console.log('Periodic background sync registrado para rastreamento contínuo');
              }
            } catch (error) {
              console.log('Periodic background sync não disponível:', error);
            }
          });
        }
        
        // Registrar background sync para quando o app estiver em segundo plano
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
          navigator.serviceWorker.ready.then(async (registration) => {
            try {
              await registration.sync.register('updateLocation');
              console.log('Background sync registrado');
            } catch (error) {
              console.log('Background sync não disponível:', error);
            }
          });
        }
      }
    } catch (error) {
      console.error('Erro ao iniciar rastreamento de localização:', error);
    }
  };

  // Função para parar rastreamento de localização
  const stopLocationTracking = () => {
    if (locationWatchId.current) {
      clearWatch(locationWatchId.current);
      locationWatchId.current = null;
      console.log('Rastreamento de localização parado');
    }

    if (locationUpdateInterval.current) {
      clearInterval(locationUpdateInterval.current);
      locationUpdateInterval.current = null;
    }
  };

  useEffect(() => {
    console.log('DEBUG AuthContext - Iniciando listener de autenticação');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('DEBUG AuthContext - onAuthStateChanged chamado, user:', user);
      if (user) {
        console.log('DEBUG AuthContext - Usuário autenticado:', user.email);
        // Buscar tipo do usuário no Firestore
        const q = query(collection(db, 'users'), where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        let userType = 'fretista'; // padrão
        let userDoc = null;
        
        if (!querySnapshot.empty) {
          userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          userType = userData.type || 'novo'; // padrão agora é 'novo'
        } else {
          // Usuário não existe no Firestore - cadastrar automaticamente como 'novo'
          try {
            const newUserData = {
              email: user.email,
              type: 'novo', // Novos usuários são cadastrados como 'novo'
              nome: user.displayName || user.email.split('@')[0],
              createdAt: new Date().toISOString()
            };
            await addUser(newUserData);
            console.log('Usuário cadastrado automaticamente como novo:', user.email);
            userType = 'novo';
          } catch (error) {
            console.error('Erro ao cadastrar usuário automaticamente:', error);
          }
        }
        
        // Verificar se é expedidor baseado no domínio do email ou outros critérios
        if (user.email.includes('@expedidor.') || user.email.includes('expedidor')) {
          userType = 'expedidor';
          // Atualizar no Firestore se necessário
          if (userDoc && userDoc.data().type !== 'expedidor') {
            try {
              await updateDoc(doc(db, 'users', userDoc.id), { type: 'expedidor' });
            } catch (error) {
              console.error('Erro ao atualizar tipo para expedidor:', error);
            }
          }
        }
        
        // Se o e-mail estiver na lista de administradores, força admin
        if (adminEmails.includes(user.email)) {
          userType = 'admin';
          // Atualizar no Firestore se necessário
          if (userDoc && userDoc.data().type !== 'admin') {
            try {
              await updateDoc(doc(db, 'users', userDoc.id), { type: 'admin' });
            } catch (error) {
              console.error('Erro ao atualizar tipo para admin:', error);
            }
          }
        }
        
        const userData = { ...user, type: userType };
        setCurrentUser(userData);
        console.log('DEBUG AuthContext - setCurrentUser chamado com:', userData);
        logUserAccess(user.email);
        
        // Iniciar rastreamento automático de localização
        await startLocationTracking(userData);
      } else {
        console.log('DEBUG AuthContext - Usuário não autenticado, setCurrentUser(null)');
        
        // Parar rastreamento de localização
        stopLocationTracking();
        
        setCurrentUser(null);
      }
      console.log('DEBUG AuthContext - setLoading(false)');
      setLoading(false);
    });
    
    // Cleanup function
    return () => {
      console.log('DEBUG AuthContext - Limpando listener de autenticação');
      stopLocationTracking();
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      // O estado do usuário será automaticamente atualizado pelo onAuthStateChanged
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
