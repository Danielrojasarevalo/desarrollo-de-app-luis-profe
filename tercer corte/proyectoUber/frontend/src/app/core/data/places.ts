import { Role } from '../models/api.models';

/*
 * LUGARES PREDEFINIDOS DE BOGOTÁ
 * Alimentan los selectores "Punto de Recogida" y "Destino" (como en el video).
 * Los dos primeros son los del ejemplo de API_DOCUMENTATION.md.
 */
export interface Place {
  name: string;
  latitude: number;
  longitude: number;
}

export const PLACES: Place[] = [
  { name: 'Parque de la 93, Calle 93A # 12-50', latitude: 4.6766, longitude: -74.0483 },
  { name: 'Centro Comercial Andino, Carrera 11 # 82-71', latitude: 4.6664, longitude: -74.0536 },
  { name: 'Zona T, Calle 82 # 12-18', latitude: 4.6669, longitude: -74.0526 },
  { name: 'Usaquén, Carrera 6 # 119-24', latitude: 4.6949, longitude: -74.0306 },
  { name: 'Centro Comercial Unicentro, Av. 15 # 124-30', latitude: 4.7024, longitude: -74.0415 },
  { name: 'Parque Simón Bolívar, Calle 63 # 59A-06', latitude: 4.6582, longitude: -74.0937 },
  { name: 'Plaza de Bolívar, Carrera 7 # 11-10', latitude: 4.5981, longitude: -74.0761 },
  { name: 'Aeropuerto El Dorado, Av. El Dorado # 103-09', latitude: 4.7016, longitude: -74.1469 },
];

// Centro del mapa cuando todavía no hay ubicación (Bogotá).
export const DEFAULT_CENTER = { latitude: 4.6766, longitude: -74.0483 };

/*
 * CUENTAS DE PRUEBA para el "Ingreso Rápido por Rol" (mismas del video del profesor).
 * El botón "Cargar" llena el formulario y "Entrar" inicia sesión directamente.
 */
export interface TestAccount {
  label: string;
  name: string;
  login: string;
  password: string;
  role: Role;
  icon: string;
}

export const TEST_ACCOUNTS: TestAccount[] = [
  { label: 'Pasajero (Cliente)', name: 'Juan Pérez', login: 'cliente@uber.com', password: 'cliente123', role: 'client', icon: 'person' },
  { label: 'Conductor Aprobado', name: 'Carlos Rodríguez (UBR-123)', login: 'conductor@uber.com', password: 'conductor123', role: 'driver', icon: 'car-sport' },
  { label: 'Conductor Pendiente', name: 'Andrés Torres (NEW-456)', login: 'andres@uber.com', password: 'conductor123', role: 'driver', icon: 'time' },
  { label: 'Administrador del Sistema', name: 'Admin Uber', login: 'admin@uber.com', password: 'admin123', role: 'admin', icon: 'shield-checkmark' },
];
