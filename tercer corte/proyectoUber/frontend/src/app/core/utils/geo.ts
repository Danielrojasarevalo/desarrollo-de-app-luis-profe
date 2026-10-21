import { Coordinates, Fare } from '../models/api.models';

const EARTH_RADIUS_KM = 6371;
// Velocidad urbana promedio que se usa para estimar la duración (km/h).
export const URBAN_SPEED_KMH = 20;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/*
 * FÓRMULA DE HAVERSINE
 * Distancia en línea recta (sobre la esfera terrestre) entre dos coordenadas.
 * Es la misma fórmula que usa el backend en POST /client/estimate-fare;
 * aquí la usamos para mostrar una vista previa y para la simulación del GPS.
 */
export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/*
 * Tarifa = (base + km·precio_km + min·precio_min) × multiplicador, nunca menor a la mínima.
 * Con la tarifa estándar del documento y 1.28 km / 4 min da 6.500 COP (la mínima).
 */
export function calculateFare(fare: Fare, distanceKm: number, durationMin: number): number {
  const raw = (fare.base_fare + distanceKm * fare.price_per_km + durationMin * fare.price_per_minute)
    * fare.surge_multiplier;
  return Math.round(Math.max(raw, fare.minimum_fare));
}

export function estimateDurationMin(distanceKm: number): number {
  return Math.max(1, Math.ceil((distanceKm / URBAN_SPEED_KMH) * 60));
}

/*
 * Avanza "stepKm" desde "from" en dirección a "to" (interpolación lineal).
 * Lo usa el modo Simulación del conductor para mover el carro por el mapa.
 */
export function stepTowards(from: Coordinates, to: Coordinates, stepKm: number): Coordinates {
  const total = haversineKm(from, to);
  if (total <= stepKm || total === 0) {
    return { ...to };
  }
  const t = stepKm / total;
  return {
    latitude: from.latitude + (to.latitude - from.latitude) * t,
    longitude: from.longitude + (to.longitude - from.longitude) * t,
  };
}

// Rumbo en grados (0 = norte, 90 = este) para el campo "heading" de /driver/location.
export function bearingDeg(from: Coordinates, to: Coordinates): number {
  const y = Math.sin(toRad(to.longitude - from.longitude)) * Math.cos(toRad(to.latitude));
  const x = Math.cos(toRad(from.latitude)) * Math.sin(toRad(to.latitude))
    - Math.sin(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.cos(toRad(to.longitude - from.longitude));
  return Math.round((((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360 * 10) / 10;
}
