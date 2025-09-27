// Service Worker para atualização de localização em segundo plano
const CACHE_NAME = 'logistica-gdm-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/js/0.chunk.js',
  '/static/js/bundle.js',
  '/manifest.json',
  '/favicon.ico',
  '/assets/logodocemel.png'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Gerenciamento de mensagens
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Gerenciamento de sincronização em segundo plano
self.addEventListener('sync', event => {
  if (event.tag === 'updateLocation') {
    event.waitUntil(updateUserLocation());
  }
});

// Função para atualizar a localização do usuário
async function updateUserLocation() {
  try {
    console.log('Iniciando atualização de localização em segundo plano...');
    // Verificar se o usuário fez login hoje
    const loggedInToday = await hasLoggedInToday();
    if (!loggedInToday) {
      console.log('Usuário não fez login hoje, não atualizando localização');
      return;
    }
    
    // Recuperar dados do usuário do IndexedDB
    const userData = await getUserDataFromIndexedDB();
    if (!userData) {
      console.log('Dados do usuário não encontrados');
      return;
    }

    // Verificar conexão com a internet
    if (!navigator.onLine) {
      console.log('Sem conexão com a internet, armazenando para envio posterior');
      // Obter localização atual mesmo offline
      try {
        const position = await getCurrentPosition();
        if (position) {
          // Armazenar para envio posterior
          await storeLocationForRetry({
            user_email: userData.email,
            user_name: userData.displayName || userData.email,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            is_online: true,
            last_update: new Date().toISOString()
          });
        }
      } catch (posError) {
        console.error('Erro ao obter posição offline:', posError);
      }
      return;
    }

    // Obter localização atual
    let position;
    try {
      position = await getCurrentPosition();
      if (!position) {
        console.warn('Posição não disponível, usando posição padrão');
        position = {
          coords: {
            latitude: -12.9704, // Coordenadas padrão (Salvador, BA)
            longitude: -38.5124,
            accuracy: 1000
          },
          timestamp: Date.now()
        };
      }
    } catch (positionError) {
      console.warn('Erro ao obter posição, usando posição padrão:', positionError);
      position = {
        coords: {
          latitude: -12.9704, // Coordenadas padrão (Salvador, BA)
          longitude: -38.5124,
          accuracy: 1000
        },
        timestamp: Date.now()
      };
    }

    // Preparar dados para envio
    const locationData = {
      user_email: userData.email,
      user_name: userData.displayName || userData.email,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      is_online: true,
      last_update: new Date().toISOString()
    };

    // Enviar para o Firebase
    const result = await sendLocationToFirebase(locationData);
    
    if (result && result.success === false) {
      if (result.offline) {
        console.log('Localização armazenada para envio posterior (dispositivo offline)');
      } else {
        console.log('Localização armazenada para envio posterior:', result);
      }
    } else {
      console.log('Localização atualizada em segundo plano:', locationData);
    }
    
    // Agendar próxima atualização (a cada 5 minutos)
    setTimeout(() => {
      self.registration.sync.register('updateLocation');
    }, 5 * 60 * 1000);
  } catch (error) {
    console.error('Erro ao atualizar localização em segundo plano:', error);
  }
}

// Função para obter dados do usuário do IndexedDB
async function getUserDataFromIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('logistica-gdm-db', 1);
    
    request.onerror = event => {
      console.error('Erro ao abrir IndexedDB:', event);
      reject(event);
    };
    
    request.onsuccess = event => {
      const db = event.target.result;
      const transaction = db.transaction(['userData'], 'readonly');
      const store = transaction.objectStore('userData');
      const getRequest = store.get('currentUser');
      
      getRequest.onsuccess = () => {
        resolve(getRequest.result);
      };
      
      getRequest.onerror = event => {
        console.error('Erro ao obter dados do usuário:', event);
        reject(event);
      };
    };
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('userData')) {
        db.createObjectStore('userData');
      }
    };
  });
}

// Função para verificar se o usuário fez login hoje
async function hasLoggedInToday() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('logistica-gdm-db', 1);
    
    request.onerror = event => {
      console.error('Erro ao abrir IndexedDB:', event);
      reject(false);
    };
    
    request.onsuccess = event => {
      const db = event.target.result;
      
      // Verificar se a store lastLogin existe
      if (!db.objectStoreNames.contains('lastLogin')) {
        console.log('Store lastLogin não existe');
        resolve(false);
        return;
      }
      
      const transaction = db.transaction(['lastLogin'], 'readonly');
      const store = transaction.objectStore('lastLogin');
      const getRequest = store.get('lastLoginDate');
      
      getRequest.onsuccess = () => {
        const lastLoginDate = getRequest.result;
        if (!lastLoginDate) {
          console.log('Data de último login não encontrada');
          resolve(false);
          return;
        }
        
        // Verificar se a data do último login é de hoje
        const today = new Date().toISOString().split('T')[0];
        const lastLogin = new Date(lastLoginDate).toISOString().split('T')[0];
        
        const isToday = today === lastLogin;
        console.log(`Último login: ${lastLogin}, Hoje: ${today}, É hoje: ${isToday}`);
        resolve(isToday);
      };
      
      getRequest.onerror = event => {
        console.error('Erro ao obter data de último login:', event);
        reject(false);
      };
    };
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('lastLogin')) {
        db.createObjectStore('lastLogin');
      }
    };
  });
}

// Função para obter a posição atual
async function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      console.warn('Geolocalização não suportada, usando posição padrão');
      // Retorna uma posição padrão em vez de rejeitar a promessa
      resolve({
        coords: {
          latitude: -12.9704, // Coordenadas padrão (Salvador, BA)
          longitude: -38.5124,
          accuracy: 1000
        },
        timestamp: Date.now()
      });
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      position => resolve(position),
      error => {
        console.warn('Erro ao obter localização, usando posição padrão:', error);
        // Retorna uma posição padrão em caso de erro
        resolve({
          coords: {
            latitude: -12.9704, // Coordenadas padrão (Salvador, BA)
            longitude: -38.5124,
            accuracy: 1000
          },
          timestamp: Date.now()
        });
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
    );
  });
}

// Função para enviar localização para o Firebase
async function sendLocationToFirebase(locationData) {
  try {
    // Verificar conexão com a internet antes de tentar enviar
    if (!navigator.onLine) {
      console.warn('Sem conexão com a internet, armazenando para tentar mais tarde');
      await storeLocationForRetry(locationData);
      return { success: false, offline: true };
    }
    
    const response = await fetch('/api/updateLocation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(locationData),
    });
    
    if (!response.ok) {
      console.warn(`Resposta do servidor não foi OK: ${response.status} ${response.statusText}`);
      await storeLocationForRetry(locationData);
      return { success: false, status: response.status };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erro ao enviar localização:', error);
    // Armazenar para tentar novamente mais tarde
    await storeLocationForRetry(locationData);
    return { success: false, error: error.message };
  }
}

// Função para armazenar localização para tentar novamente mais tarde
async function storeLocationForRetry(locationData) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('logistica-gdm-db', 1);
    
    request.onsuccess = event => {
      const db = event.target.result;
      const transaction = db.transaction(['pendingLocations'], 'readwrite');
      const store = transaction.objectStore('pendingLocations');
      
      const addRequest = store.add({
        ...locationData,
        timestamp: new Date().getTime()
      });
      
      addRequest.onsuccess = () => resolve();
      addRequest.onerror = event => reject(event);
    };
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingLocations')) {
        db.createObjectStore('pendingLocations', { keyPath: 'timestamp' });
      }
    };
  });
}

// Configurar atualização periódica (a cada 5 minutos)
setInterval(() => {
  self.registration.sync.register('updateLocation')
    .catch(err => console.error('Erro ao registrar sincronização:', err));
}, 5 * 60 * 1000);