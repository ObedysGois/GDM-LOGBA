/**
 * Utilitários para geocodificação usando Google Maps API
 */

const GOOGLE_MAPS_API_KEY = 'AIzaSyAYPqweXiFwIA_PP1y1tbmjZiEXgSdqIUE';

/**
 * Obtém o endereço a partir de coordenadas (geocodificação reversa)
 * @param {number} latitude Latitude
 * @param {number} longitude Longitude
 * @returns {Promise<string|null>} Endereço formatado ou null em caso de erro
 */
export const getAddressFromCoordinates = async (latitude, longitude) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}&language=pt-BR`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      // Pegar o primeiro resultado (mais relevante)
      const result = data.results[0];
      return result.formatted_address || result.address_components.map(c => c.long_name).join(', ');
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao obter endereço:', error);
    return null;
  }
};

/**
 * Obtém coordenadas a partir de um endereço (geocodificação)
 * @param {string} address Endereço a ser geocodificado
 * @returns {Promise<{latitude: number, longitude: number}|null>} Coordenadas ou null em caso de erro
 */
export const getCoordinatesFromAddress = async (address) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}&language=pt-BR`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng
      };
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao obter coordenadas:', error);
    return null;
  }
};

/**
 * Obtém informações detalhadas do endereço a partir de coordenadas
 * @param {number} latitude Latitude
 * @param {number} longitude Longitude
 * @returns {Promise<Object|null>} Objeto com informações do endereço ou null
 */
export const getAddressDetailsFromCoordinates = async (latitude, longitude) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}&language=pt-BR`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const addressComponents = result.address_components || [];
      
      // Extrair componentes do endereço
      const addressDetails = {
        formatted_address: result.formatted_address,
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      };
      
      addressComponents.forEach(component => {
        const types = component.types;
        if (types.includes('street_number')) {
          addressDetails.number = component.long_name;
        } else if (types.includes('route')) {
          addressDetails.street = component.long_name;
        } else if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
          addressDetails.neighborhood = component.long_name;
        } else if (types.includes('administrative_area_level_2')) {
          addressDetails.city = component.long_name;
        } else if (types.includes('administrative_area_level_1')) {
          addressDetails.state = component.short_name;
        } else if (types.includes('postal_code')) {
          addressDetails.zipCode = component.long_name;
        } else if (types.includes('country')) {
          addressDetails.country = component.long_name;
        }
      });
      
      return addressDetails;
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao obter detalhes do endereço:', error);
    return null;
  }
};

