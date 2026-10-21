/*
 * MODELOS DE LA API
 * Cada interfaz copia la forma del JSON documentado en API_DOCUMENTATION.md.
 * Así TypeScript avisa si escribimos mal un campo (ej. "estimated_fare").
 */

export type Role = 'admin' | 'client' | 'driver';
export type ApprovalStatus = 'pending' | 'approved' | 'suspended' | 'rejected';
export type Availability = 'available' | 'unavailable';
export type TripStatus = 'requested' | 'assigned' | 'driver_arrived' | 'in_progress' | 'completed' | 'cancelled';

// ===== Autenticación (sección 3.1) =====

export interface Vehicle {
  id?: number;
  plate: string;
  brand: string;
  model: string;
  year?: number;
  capacity?: number;
  color?: string;
}

// El documento no muestra el perfil de conductor dentro de /auth/me, pero el
// video del profesor sí muestra estado, rating y vehículo; si el backend lo envía lo usamos.
export interface DriverProfile {
  id: number;
  license_number?: string;
  approval_status: ApprovalStatus;
  availability_status?: Availability;
  rating_average?: number;
  vehicles?: Vehicle[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  status?: string;
  driver?: DriverProfile;
}

export interface LoginRequest {
  login: string; // correo o teléfono
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'client' | 'driver';
  // Solo para conductores:
  license_number?: string;
  plate?: string;
  brand?: string;
  model?: string;
  year?: number;
  capacity?: number;
  color?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface MessageResponse {
  success: boolean;
  message: string;
}

// ===== Tarifas (secciones 3.2 y 3.5) =====

export interface Fare {
  id?: number;
  name: string;
  base_fare: number;
  price_per_km: number;
  price_per_minute: number;
  minimum_fare: number;
  surge_multiplier: number;
  active: boolean;
}

// ===== Cliente (sección 3.3) =====

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface EstimateRequest {
  origin_latitude: number;
  origin_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
}

export interface FareEstimate {
  distance_km: number;
  duration_min: number;
  estimated_fare: number;
  currency: string;
  fare_breakdown: Omit<Fare, 'id' | 'name' | 'active'>;
}

export interface RideRequestBody extends EstimateRequest {
  origin_name: string;
  destination_name: string;
}

export interface RideRequest extends RideRequestBody {
  id: number;
  client_id: number;
  estimated_distance_km: number;
  estimated_duration_min: number;
  estimated_fare: number;
  status: TripStatus;
  created_at: string;
}

export interface TripDriver {
  id: number;
  rating_average?: number;
  user: { name: string; phone?: string };
  latest_location?: Coordinates | null;
}

// Respuesta de GET /client/active: puede ser una solicitud (buscando conductor) o un viaje.
export interface ActiveRide {
  id: number;
  status: TripStatus;
  estimated_fare: number;
  origin_name?: string;
  destination_name?: string;
  origin_latitude?: number;
  origin_longitude?: number;
  destination_latitude?: number;
  destination_longitude?: number;
  driver?: TripDriver;
  vehicle?: Vehicle;
}

export interface ActiveResponse {
  success: boolean;
  has_active: boolean;
  type?: 'request' | 'trip';
  data?: ActiveRide;
}

export interface Trip {
  id: number;
  request_id?: number;
  client_id?: number;
  driver_id?: number;
  status: TripStatus;
  estimated_fare?: number;
  final_fare?: number | null;
  origin_name?: string;
  destination_name?: string;
  distance_travelled_km?: number;
  duration_travelled_min?: number;
  driver_arrived_at?: string;
  started_at?: string;
  completed_at?: string | null;
  driver?: { user: { name: string } };
  client?: { name: string };
  vehicle?: { plate: string };
  rating?: Rating | null;
}

export interface RatingRequest {
  score: number;
  comment: string;
  has_incident: boolean;
}

export interface Rating {
  id: number;
  trip_id: number;
  score: number;
  comment: string;
}

// ===== Conductor (sección 3.4) =====

export interface PendingRequest {
  id: number;
  origin_name: string;
  destination_name: string;
  origin_latitude?: number;
  origin_longitude?: number;
  destination_latitude?: number;
  destination_longitude?: number;
  estimated_distance_km: number;
  estimated_fare: number;
  client: { name: string; phone: string };
}

export interface LocationUpdate extends Coordinates {
  heading?: number;
  speed?: number;
  trip_id?: number;
}

// ===== Administrador (sección 3.5) =====

export interface DashboardStats {
  total_clients: number;
  total_drivers: number;
  pending_drivers: number;
  approved_drivers: number;
  active_trips: number;
  completed_trips: number;
  cancelled_trips: number;
  pending_requests: number;
  total_revenue: number;
}

export interface AdminDriver {
  id: number;
  license_number: string;
  approval_status: ApprovalStatus;
  rating_average: number;
  user: { name: string; email: string };
  vehicles: Vehicle[];
}

export interface TripFilters {
  status?: string;
  driver_id?: number | string;
  client_id?: number | string;
  date?: string;
}
