/**
 * Utilitários de geolocalização e cálculo de distâncias
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationError {
  code: number;
  message: string;
}

/**
 * Solicita a localização atual do usuário
 * @returns Promise com as coordenadas ou erro
 */
export const getCurrentLocation = (): Promise<Coordinates> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({
        code: 0,
        message: 'Geolocalização não é suportada pelo seu navegador'
      } as LocationError);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        let message = 'Erro ao obter localização';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Permissão de localização negada. Por favor, habilite nas configurações do navegador.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Localização indisponível no momento.';
            break;
          case error.TIMEOUT:
            message = 'Tempo esgotado ao tentar obter localização.';
            break;
        }

        reject({
          code: error.code,
          message
        } as LocationError);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // Cache por 5 minutos
      }
    );
  });
};

/**
 * Calcula a distância entre duas coordenadas usando a fórmula de Haversine
 * @param coord1 Primeira coordenada (usuário)
 * @param coord2 Segunda coordenada (evento)
 * @returns Distância em quilômetros
 */
export const calculateDistance = (
  coord1: Coordinates,
  coord2: Coordinates
): number => {
  const R = 6371; // Raio da Terra em km
  
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);
  
  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);

  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * 
    Math.cos(lat1) * Math.cos(lat2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Arredonda para 1 casa decimal
};

/**
 * Converte graus para radianos
 */
const toRad = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Formata a distância para exibição amigável
 * @param distance Distância em km
 * @returns String formatada (ex: "2.5 km" ou "850 m")
 */
export const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }
  return `${distance.toFixed(1)} km`;
};

/**
 * Opções de raio de busca
 */
export const RADIUS_OPTIONS = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 15, label: '15 km' }
] as const;

export type RadiusValue = typeof RADIUS_OPTIONS[number]['value'];
