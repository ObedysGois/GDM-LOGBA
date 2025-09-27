// Utilitários para gerenciar o IndexedDB

// Nome e versão do banco de dados
const DB_NAME = 'logistica-gdm-db';
const DB_VERSION = 1;

// Função para abrir o banco de dados
export const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('Erro ao abrir o banco de dados:', event);
      reject(event);
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Criar stores se não existirem
      if (!db.objectStoreNames.contains('userData')) {
        db.createObjectStore('userData');
      }
      
      if (!db.objectStoreNames.contains('pendingLocations')) {
        db.createObjectStore('pendingLocations', { keyPath: 'timestamp' });
      }
      
      if (!db.objectStoreNames.contains('lastLogin')) {
        db.createObjectStore('lastLogin');
      }
    };
  });
};

// Salvar dados do usuário atual
export const saveUserData = async (userData) => {
  try {
    // Criar uma cópia simplificada do objeto userData para evitar erro de clonagem
    const userDataClone = {
      uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      type: userData.type,
      // Adicionar apenas propriedades serializáveis
      // Evitar objetos complexos como funções, classes personalizadas, etc.
    };
    
    const db = await openDatabase();
    const transaction = db.transaction(['userData'], 'readwrite');
    const store = transaction.objectStore('userData');
    
    // Salvar dados do usuário (versão simplificada)
    store.put(userDataClone, 'currentUser');
    
    // Registrar data do último login
    const loginTransaction = db.transaction(['lastLogin'], 'readwrite');
    const loginStore = loginTransaction.objectStore('lastLogin');
    loginStore.put(new Date().toISOString(), 'lastLoginDate');
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = (event) => {
        console.error('Erro ao salvar dados do usuário:', event);
        reject(event);
      };
    });
  } catch (error) {
    console.error('Erro ao salvar dados do usuário:', error);
    return false;
  }
};

// Obter dados do usuário atual
export const getUserData = async () => {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(['userData'], 'readonly');
    const store = transaction.objectStore('userData');
    
    return new Promise((resolve, reject) => {
      const request = store.get('currentUser');
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => {
        console.error('Erro ao obter dados do usuário:', event);
        reject(event);
      };
    });
  } catch (error) {
    console.error('Erro ao obter dados do usuário:', error);
    return null;
  }
};

// Verificar se o usuário fez login hoje
export const hasLoggedInToday = async () => {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(['lastLogin'], 'readonly');
    const store = transaction.objectStore('lastLogin');
    
    return new Promise((resolve, reject) => {
      const request = store.get('lastLoginDate');
      
      request.onsuccess = () => {
        const lastLoginDate = request.result;
        if (!lastLoginDate) {
          resolve(false);
          return;
        }
        
        // Verificar se a data do último login é de hoje
        const today = new Date().toISOString().split('T')[0];
        const lastLogin = new Date(lastLoginDate).toISOString().split('T')[0];
        
        resolve(today === lastLogin);
      };
      
      request.onerror = (event) => {
        console.error('Erro ao verificar último login:', event);
        reject(event);
      };
    });
  } catch (error) {
    console.error('Erro ao verificar último login:', error);
    return false;
  }
};

// Salvar localização pendente para envio posterior
export const savePendingLocation = async (locationData) => {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(['pendingLocations'], 'readwrite');
    const store = transaction.objectStore('pendingLocations');
    
    const data = {
      ...locationData,
      timestamp: new Date().getTime()
    };
    
    return new Promise((resolve, reject) => {
      const request = store.add(data);
      
      request.onsuccess = () => resolve(true);
      request.onerror = (event) => {
        console.error('Erro ao salvar localização pendente:', event);
        reject(event);
      };
    });
  } catch (error) {
    console.error('Erro ao salvar localização pendente:', error);
    return false;
  }
};

// Obter todas as localizações pendentes
export const getPendingLocations = async () => {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(['pendingLocations'], 'readonly');
    const store = transaction.objectStore('pendingLocations');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => {
        console.error('Erro ao obter localizações pendentes:', event);
        reject(event);
      };
    });
  } catch (error) {
    console.error('Erro ao obter localizações pendentes:', error);
    return [];
  }
};

// Remover uma localização pendente
export const removePendingLocation = async (timestamp) => {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(['pendingLocations'], 'readwrite');
    const store = transaction.objectStore('pendingLocations');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(timestamp);
      
      request.onsuccess = () => resolve(true);
      request.onerror = (event) => {
        console.error('Erro ao remover localização pendente:', event);
        reject(event);
      };
    });
  } catch (error) {
    console.error('Erro ao remover localização pendente:', error);
    return false;
  }
};

// Limpar dados do usuário (logout)
export const clearUserData = async () => {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(['userData'], 'readwrite');
    const store = transaction.objectStore('userData');
    
    return new Promise((resolve, reject) => {
      const request = store.delete('currentUser');
      
      request.onsuccess = () => resolve(true);
      request.onerror = (event) => {
        console.error('Erro ao limpar dados do usuário:', event);
        reject(event);
      };
    });
  } catch (error) {
    console.error('Erro ao limpar dados do usuário:', error);
    return false;
  }
};