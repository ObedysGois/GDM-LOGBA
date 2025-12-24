// Service Worker PWA completo para Logística GDM
const CACHE_VERSION = 'v2';
const CACHE_NAME = `logistica-gdm-${CACHE_VERSION}`;
const STATIC_CACHE = `logistica-gdm-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `logistica-gdm-dynamic-${CACHE_VERSION}`;

// Recursos estáticos para cache na instalação
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/logodocemel.png',
  '/assets/logosplash.png'
];

// Estratégias de cache
const CACHE_STRATEGIES = {
  // Cache First: para assets estáticos
  CACHE_FIRST: 'cache-first',
  // Network First: para dados dinâmicos
  NETWORK_FIRST: 'network-first',
  // Stale While Revalidate: para recursos que podem ser atualizados
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// Instalação do Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...', CACHE_NAME);
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[Service Worker] Cache estático aberto');
        // Não falhar se alguns recursos não puderem ser cacheados
        return cache.addAll(STATIC_ASSETS).catch(err => {
          console.warn('[Service Worker] Alguns recursos não puderam ser cacheados:', err);
        });
      })
      .then(() => {
        // Forçar ativação imediata
        return self.skipWaiting();
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] Ativando...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Remover caches antigos
          if (cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE &&
              !cacheName.startsWith('logistica-gdm-')) {
            console.log('[Service Worker] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Assumir controle de todas as páginas
      return self.clients.claim();
    })
  );
});

// Interceptação de requisições com estratégias inteligentes
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições não-GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorar requisições para APIs externas (Firebase, etc) - sempre usar network
  if (url.origin !== self.location.origin && 
      (url.hostname.includes('firebase') || 
       url.hostname.includes('googleapis') ||
       url.hostname.includes('supabase'))) {
    event.respondWith(fetch(request));
    return;
  }

  // Estratégia: Cache First para assets estáticos
  if (request.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request).then(fetchResponse => {
          // Cachear resposta dinâmica
          return caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, fetchResponse.clone());
            return fetchResponse;
          });
        }).catch(() => {
          // Se offline e não tiver cache, retornar página offline
          if (request.url.match(/\.(html)$/)) {
            return caches.match('/index.html');
          }
        });
      })
    );
    return;
  }

  // Estratégia: Network First para HTML e dados
  if (request.url.match(/\.(html)$/) || url.pathname === '/') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cachear resposta bem-sucedida
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Se offline, retornar do cache
          return caches.match(request).then(cachedResponse => {
            return cachedResponse || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Estratégia padrão: Stale While Revalidate
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      const fetchPromise = fetch(request).then(networkResponse => {
        // Atualizar cache
        caches.open(DYNAMIC_CACHE).then(cache => {
          cache.put(request, networkResponse.clone());
        });
        return networkResponse;
      }).catch(() => {
        // Se falhar, retornar cache se disponível
        return cachedResponse;
      });

      // Retornar cache imediatamente se disponível, atualizar em background
      return cachedResponse || fetchPromise;
    })
  );
});

// Gerenciamento de mensagens
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    // Notificar todos os clientes para recarregar
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'SW_UPDATED' });
      });
    });
  }
});

// Gerenciamento de sincronização em segundo plano
self.addEventListener('sync', event => {
  if (event.tag === 'updateLocation') {
    event.waitUntil(updateUserLocation());
  }
});

// Gerenciamento de sincronização periódica em segundo plano (se disponível)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'updateLocation') {
    event.waitUntil(updateUserLocation());
  }
});

// Função para atualizar a localização do usuário
// NOTA: Service Workers têm limitações com geolocalização
// O rastreamento principal é feito pelo AuthContext na aplicação principal
async function updateUserLocation() {
  try {
    console.log('Service Worker: Sincronização de localização solicitada');
    
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

    // Verificar se há localizações pendentes no IndexedDB
    const pendingLocations = await getPendingLocations();
    if (pendingLocations && pendingLocations.length > 0) {
      console.log(`Encontradas ${pendingLocations.length} localizações pendentes para sincronizar`);
      
      // Tentar enviar localizações pendentes
      for (const locationData of pendingLocations) {
        try {
          const result = await sendLocationToFirebase(locationData);
          if (result && result.success !== false) {
            // Remover da lista de pendentes se enviado com sucesso
            await removePendingLocation(locationData.timestamp);
          }
        } catch (error) {
          console.error('Erro ao enviar localização pendente:', error);
        }
      }
    }

    // Service Worker não deve tentar obter geolocalização diretamente
    // O rastreamento é feito pela aplicação principal (AuthContext)
    console.log('Service Worker: Localizações pendentes processadas. Rastreamento principal feito pelo AuthContext.');
    
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

// Função para obter localizações pendentes do IndexedDB
async function getPendingLocations() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('logistica-gdm-db', 1);
    
    request.onsuccess = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingLocations')) {
        resolve([]);
        return;
      }
      
      const transaction = db.transaction(['pendingLocations'], 'readonly');
      const store = transaction.objectStore('pendingLocations');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        resolve(getAllRequest.result || []);
      };
      
      getAllRequest.onerror = event => {
        console.error('Erro ao obter localizações pendentes:', event);
        resolve([]);
      };
    };
    
    request.onerror = event => {
      console.error('Erro ao abrir IndexedDB:', event);
      resolve([]);
    };
  });
}

// Função para remover localização pendente após envio bem-sucedido
async function removePendingLocation(timestamp) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('logistica-gdm-db', 1);
    
    request.onsuccess = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingLocations')) {
        resolve();
        return;
      }
      
      const transaction = db.transaction(['pendingLocations'], 'readwrite');
      const store = transaction.objectStore('pendingLocations');
      const deleteRequest = store.delete(timestamp);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = event => {
        console.error('Erro ao remover localização pendente:', event);
        resolve();
      };
    };
    
    request.onerror = event => {
      console.error('Erro ao abrir IndexedDB:', event);
      resolve();
    };
  });
}

// Função para enviar localização para o Firebase
async function sendLocationToFirebase(locationData) {
  try {
    // Verificar se há conexão com a internet
    if (!navigator.onLine) {
      return { success: false, offline: true };
    }

    // Obter configuração do Firebase do cache ou usar fetch
    const firebaseConfig = {
      apiKey: "AIzaSyBla-ItwmWjbfqZWX-rPJb_L1kuT178uac",
      projectId: "gdm-log-ba-2f8c5"
    };

    // Enviar para o Firestore usando REST API
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/user_locations`;
    
    // Buscar documento existente
    const queryUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:runQuery`;
    const queryBody = {
      structuredQuery: {
        where: {
          fieldFilter: {
            field: { fieldPath: 'user_email' },
            op: 'EQUAL',
            value: { stringValue: locationData.user_email }
          }
        },
        from: [{ collectionId: 'user_locations' }],
        limit: 1
      }
    };

    try {
      const queryResponse = await fetch(queryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryBody)
      });

      const queryData = await queryResponse.json();
      
      const documentData = {
        fields: {
          user_email: { stringValue: locationData.user_email },
          user_name: { stringValue: locationData.user_name || locationData.user_email },
          latitude: { doubleValue: locationData.latitude },
          longitude: { doubleValue: locationData.longitude },
          is_online: { booleanValue: locationData.is_online !== false },
          last_update: { timestampValue: new Date().toISOString() }
        }
      };

      if (queryData && queryData[0] && queryData[0].document) {
        // Atualizar documento existente
        const docId = queryData[0].document.name.split('/').pop();
        const updateUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/user_locations/${docId}`;
        
        await fetch(updateUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(documentData)
        });
      } else {
        // Criar novo documento
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(documentData)
        });
      }

      return { success: true };
    } catch (fetchError) {
      console.error('Erro ao enviar localização via REST API:', fetchError);
      return { success: false, error: fetchError.message };
    }
  } catch (error) {
    console.error('Erro ao enviar localização:', error);
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

// NOTA: O rastreamento principal de localização é feito pelo AuthContext na aplicação principal
// O service worker apenas sincroniza localizações pendentes quando há conexão
// Não configuramos atualização periódica automática aqui para evitar conflitos e logs desnecessários