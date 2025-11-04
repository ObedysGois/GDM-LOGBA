/**
 * Utilitários para gerenciamento de geolocalização
 */

/**
 * Verifica se a geolocalização é suportada pelo navegador
 * @returns {boolean} True se suportada, false caso contrário
 */
export const isGeolocationSupported = () => {
  return 'geolocation' in navigator;
};

/**
 * Verifica o status da permissão de geolocalização
 * @returns {Promise<string>} Status da permissão: 'granted', 'denied', 'prompt', ou 'unsupported'
 */
export const checkGeolocationPermission = async () => {
  if (!isGeolocationSupported()) {
    return 'unsupported';
  }

  try {
    // Verificar se a API de permissões está disponível
    if ('permissions' in navigator) {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state; // 'granted', 'denied', ou 'prompt'
    }
    
    // Fallback: verificar localStorage
    const permissionGranted = localStorage.getItem('geolocation-permission-granted');
    if (permissionGranted === 'true') {
      return 'granted';
    } else if (permissionGranted === 'false') {
      return 'denied';
    }
    
    return 'prompt';
  } catch (error) {
    console.error('Erro ao verificar permissão de geolocalização:', error);
    return 'prompt';
  }
};

/**
 * Solicita permissão de geolocalização de forma silenciosa
 * @returns {Promise<boolean>} True se a permissão foi concedida, false caso contrário
 */
export const requestGeolocationPermission = () => {
  return new Promise((resolve) => {
    if (!isGeolocationSupported()) {
      console.log('Geolocalização não suportada');
      resolve(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Permissão de geolocalização concedida');
        localStorage.setItem('geolocation-permission-granted', 'true');
        resolve(true);
      },
      (error) => {
        console.log('Permissão de geolocalização negada ou erro:', error.message);
        localStorage.setItem('geolocation-permission-granted', 'false');
        resolve(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000 // 5 minutos
      }
    );
  });
};

/**
 * Obtém a posição atual do usuário
 * @param {Object} options Opções para getCurrentPosition
 * @returns {Promise<GeolocationPosition>} Posição atual
 */
export const getCurrentPosition = (options = {}) => {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new Error('Geolocalização não suportada'));
      return;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000
    };

    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      { ...defaultOptions, ...options }
    );
  });
};

/**
 * Inicia o rastreamento contínuo da posição
 * @param {Function} successCallback Callback para posição obtida com sucesso
 * @param {Function} errorCallback Callback para erros
 * @param {Object} options Opções para watchPosition
 * @returns {number} ID do watch para poder parar posteriormente
 */
export const watchPosition = (successCallback, errorCallback, options = {}) => {
  if (!isGeolocationSupported()) {
    errorCallback(new Error('Geolocalização não suportada'));
    return null;
  }

  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 30000
  };

  return navigator.geolocation.watchPosition(
    successCallback,
    errorCallback,
    { ...defaultOptions, ...options }
  );
};

/**
 * Para o rastreamento de posição
 * @param {number} watchId ID retornado por watchPosition
 */
export const clearWatch = (watchId) => {
  if (watchId && isGeolocationSupported()) {
    navigator.geolocation.clearWatch(watchId);
  }
};

/**
 * Verifica se o usuário tem permissão para rastreamento baseado no tipo
 * @param {string} userType Tipo do usuário
 * @returns {boolean} True se tem permissão, false caso contrário
 */
export const hasLocationTrackingPermission = (userType) => {
  const allowedTypes = ['admin', 'colaborador', 'fretista'];
  return allowedTypes.includes(userType);
};

/**
 * Formata coordenadas para exibição
 * @param {number} latitude Latitude
 * @param {number} longitude Longitude
 * @param {number} precision Número de casas decimais (padrão: 6)
 * @returns {string} Coordenadas formatadas
 */
export const formatCoordinates = (latitude, longitude, precision = 6) => {
  return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
};

/**
 * Calcula a distância entre duas coordenadas usando a fórmula de Haversine
 * @param {number} lat1 Latitude do ponto 1
 * @param {number} lon1 Longitude do ponto 1
 * @param {number} lat2 Latitude do ponto 2
 * @param {number} lon2 Longitude do ponto 2
 * @returns {number} Distância em metros
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Raio da Terra em metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};