/*
 * MOCK BACKEND - API REST Uber (simulación del backend Laravel 12 + JWT)
 * ---------------------------------------------------------------------------
 * Implementa TODOS los endpoints de API_DOCUMENTATION.md con datos en memoria,
 * para poder probar el frontend Ionic sin tener PHP/PostgreSQL instalados.
 * No usa librerías externas: solo el módulo http de Node.
 *
 *   node server.mjs            -> escucha en http://0.0.0.0:8000/api
 *   PORT=9000 node server.mjs  -> otro puerto
 *
 * Los datos se reinician cada vez que se arranca el servidor.
 * El "JWT" es un token aleatorio guardado en memoria (no es un JWT firmado real).
 */
import { randomBytes } from 'node:crypto';
import http from 'node:http';
import { pathToFileURL } from 'node:url';

const TOKEN_TTL_SECONDS = 3600;
const URBAN_SPEED_KMH = 20;

// ===========================================================================
// DATOS INICIALES (mismas cuentas del "Ingreso rápido por rol")
// ===========================================================================
export function createState() {
  return {
    seq: { user: 7, driver: 4, vehicle: 4, request: 3, trip: 3, rating: 2, fare: 2, log: 1, location: 1 },
    users: [
      { id: 1, name: 'Admin Uber', email: 'admin@uber.com', phone: '3000000000', password: 'admin123', role: 'admin', status: 'active' },
      { id: 2, name: 'Juan Pérez', email: 'cliente@uber.com', phone: '3001234567', password: 'cliente123', role: 'client', status: 'active' },
      { id: 3, name: 'Carlos Rodríguez', email: 'conductor@uber.com', phone: '3119876543', password: 'conductor123', role: 'driver', status: 'active' },
      { id: 4, name: 'Andrés Torres (Pendiente)', email: 'andres@uber.com', phone: '3124567890', password: 'conductor123', role: 'driver', status: 'active' },
      { id: 5, name: 'María López', email: 'maria@uber.com', phone: '3015550000', password: 'cliente123', role: 'client', status: 'active' },
      { id: 6, name: 'Laura Martínez', email: 'laura@uber.com', phone: '3165550000', password: 'conductor123', role: 'driver', status: 'active' },
      { id: 7, name: 'Pedro Gómez', email: 'pedro@uber.com', phone: '3025550000', password: 'cliente123', role: 'client', status: 'active' },
    ],
    drivers: [
      { id: 1, user_id: 3, license_number: 'LC-55120-CO', approval_status: 'approved', availability_status: 'unavailable', rating_average: 4.95 },
      { id: 2, user_id: 6, license_number: 'LC-77310-CO', approval_status: 'approved', availability_status: 'unavailable', rating_average: 4.8 },
      { id: 3, user_id: 4, license_number: 'LC-11928-C', approval_status: 'pending', availability_status: 'unavailable', rating_average: 5.0 },
    ],
    vehicles: [
      { id: 1, driver_id: 1, plate: 'UBR-123', brand: 'Chevrolet', model: 'Onix Turbo', year: 2023, capacity: 4, color: 'Gris Plata' },
      { id: 2, driver_id: 2, plate: 'VRD-777', brand: 'Renault', model: 'Logan', year: 2022, capacity: 4, color: 'Verde Esmeralda' },
      { id: 3, driver_id: 3, plate: 'NEW-456', brand: 'Kia', model: 'Rio', year: 2024, capacity: 4, color: 'Blanco' },
    ],
    fares: [
      { id: 1, name: 'Tarifa Estándar Urbana', base_fare: 3800, price_per_km: 1250, price_per_minute: 250, minimum_fare: 6500, surge_multiplier: 1.0, active: true },
    ],
    requests: [
      { id: 1, client_id: 2, origin_name: 'Usaquén, Carrera 6 # 119-24', origin_latitude: 4.6949, origin_longitude: -74.0306, destination_name: 'Parque de la 93, Calle 93A # 12-50', destination_latitude: 4.6766, destination_longitude: -74.0483, estimated_distance_km: 2.81, estimated_duration_min: 9, estimated_fare: 9300, status: 'completed', created_at: '2026-10-20T18:40:00.000000Z' },
      { id: 2, client_id: 5, origin_name: 'Zona T, Calle 82 # 12-18', origin_latitude: 4.6669, origin_longitude: -74.0526, destination_name: 'Centro Comercial Andino, Carrera 11 # 82-71', destination_latitude: 4.6664, destination_longitude: -74.0536, estimated_distance_km: 0.12, estimated_duration_min: 1, estimated_fare: 6500, status: 'completed', created_at: '2026-10-20T20:00:00.000000Z' },
    ],
    trips: [
      { id: 1, request_id: 1, client_id: 2, driver_id: 1, vehicle_id: 1, fare_id: 1, status: 'completed', estimated_fare: 9300, final_fare: 9300, distance_travelled_km: 2.9, duration_travelled_min: 11, driver_arrived_at: '2026-10-20T18:45:00.000000Z', started_at: '2026-10-20T18:48:00.000000Z', completed_at: '2026-10-20T19:00:00.000000Z', created_at: '2026-10-20T18:41:00.000000Z' },
      { id: 2, request_id: 2, client_id: 5, driver_id: 2, vehicle_id: 2, fare_id: 1, status: 'completed', estimated_fare: 6500, final_fare: 6500, distance_travelled_km: 0.3, duration_travelled_min: 3, driver_arrived_at: '2026-10-20T20:04:00.000000Z', started_at: '2026-10-20T20:05:00.000000Z', completed_at: '2026-10-20T20:09:00.000000Z', created_at: '2026-10-20T20:01:00.000000Z' },
    ],
    ratings: [
      { id: 1, trip_id: 2, client_id: 5, driver_id: 2, score: 5, comment: 'Muy amable', has_incident: false, created_at: '2026-10-20T20:12:00.000000Z' },
    ],
    cancellations: [],
    locations: [],
    auditLogs: [],
    tokens: new Map(), // token -> { userId, exp }
    blacklist: new Set(),
  };
}

// ===========================================================================
// UTILIDADES
// ===========================================================================
const stamp = () => new Date().toISOString().replace(/\.(\d{3})Z$/, '.$1000Z');

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function fareFor(fare, km, min) {
  const raw = (fare.base_fare + km * fare.price_per_km + min * fare.price_per_minute) * fare.surge_multiplier;
  return Math.round(Math.max(raw, fare.minimum_fare));
}

const round2 = (n) => Math.round(n * 100) / 100;

// Validación al estilo Laravel: devuelve 422 con { errors: { campo: [mensaje] } }
function validate(body, rules) {
  const errors = {};
  for (const [field, rule] of Object.entries(rules)) {
    const v = body?.[field];
    const empty = v === undefined || v === null || v === '';
    if (rule.required && empty) {
      errors[field] = [`El campo ${field} es obligatorio.`];
      continue;
    }
    if (empty) continue;
    if (rule.type === 'number' && (typeof v !== 'number' || Number.isNaN(v))) {
      errors[field] = [`El campo ${field} debe ser numérico.`];
    } else if (rule.type === 'string' && typeof v !== 'string') {
      errors[field] = [`El campo ${field} debe ser texto.`];
    } else if (rule.type === 'boolean' && typeof v !== 'boolean') {
      errors[field] = [`El campo ${field} debe ser verdadero o falso.`];
    } else if (rule.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
      errors[field] = [`El campo ${field} debe ser un correo válido.`];
    } else if (rule.min !== undefined && typeof v === 'string' && v.length < rule.min) {
      errors[field] = [`El campo ${field} debe tener al menos ${rule.min} caracteres.`];
    } else if (rule.min !== undefined && typeof v === 'number' && v < rule.min) {
      errors[field] = [`El campo ${field} debe ser mínimo ${rule.min}.`];
    } else if (rule.max !== undefined && typeof v === 'number' && v > rule.max) {
      errors[field] = [`El campo ${field} debe ser máximo ${rule.max}.`];
    } else if (rule.in && !rule.in.includes(v)) {
      errors[field] = [`El valor de ${field} no es válido.`];
    }
  }
  if (Object.keys(errors).length) {
    throw new HttpError(422, 'Los datos enviados no son válidos.', { errors });
  }
}

// ===========================================================================
// APLICACIÓN
// ===========================================================================
export function createApp(state = createState()) {
  const S = state;

  const userById = (id) => S.users.find((u) => u.id === id);
  const driverByUser = (userId) => S.drivers.find((d) => d.user_id === userId);
  const vehicleOf = (driverId) => S.vehicles.find((v) => v.driver_id === driverId);
  const activeFare = () => S.fares.find((f) => f.active) ?? S.fares[0];
  const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, status: u.status });
  const latestLocation = (driverId) => {
    const l = [...S.locations].reverse().find((x) => x.driver_id === driverId);
    return l ? { latitude: l.latitude, longitude: l.longitude } : null;
  };
  const vehiclePublic = (v) => v && { plate: v.plate, brand: v.brand, model: v.model, color: v.color, year: v.year, capacity: v.capacity };

  function driverProfile(d) {
    return {
      id: d.id,
      license_number: d.license_number,
      approval_status: d.approval_status,
      availability_status: d.availability_status,
      rating_average: d.rating_average,
      vehicles: S.vehicles.filter((v) => v.driver_id === d.id).map(vehiclePublic),
    };
  }

  function userWithProfile(u) {
    const base = publicUser(u);
    const d = u.role === 'driver' ? driverByUser(u.id) : null;
    return d ? { ...base, driver: driverProfile(d) } : base;
  }

  function audit(userId, action, description) {
    S.auditLogs.push({ id: S.seq.log++, user_id: userId, action, description, created_at: stamp() });
  }

  function issueToken(user) {
    const token = `mock.${randomBytes(24).toString('hex')}`;
    S.tokens.set(token, { userId: user.id, exp: Date.now() + TOKEN_TTL_SECONDS * 1000 });
    return { access_token: token, token_type: 'bearer', expires_in: TOKEN_TTL_SECONDS };
  }

  // Middleware "auth:api"
  function authenticate(req) {
    const header = req.headers['authorization'] ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const entry = token && !S.blacklist.has(token) ? S.tokens.get(token) : null;
    if (!entry || entry.exp < Date.now()) {
      throw new HttpError(401, 'No autenticado. Token ausente, inválido o expirado.');
    }
    const user = userById(entry.userId);
    if (!user) throw new HttpError(401, 'No autenticado.');
    if (user.status !== 'active') throw new HttpError(403, 'Su cuenta está inactiva o suspendida.');
    return { user, token };
  }

  // Middleware "role:xxx"
  function requireRole(req, role) {
    const ctx = authenticate(req);
    if (ctx.user.role !== role) {
      throw new HttpError(403, `Acceso denegado. Se requiere el rol ${role}.`);
    }
    return ctx;
  }

  // Middleware "driver.approved"
  function requireApprovedDriver(req) {
    const ctx = requireRole(req, 'driver');
    const driver = driverByUser(ctx.user.id);
    if (!driver || driver.approval_status !== 'approved') {
      throw new HttpError(403, 'Su cuenta de conductor no está aprobada.', { approval_status: driver?.approval_status ?? 'pending' });
    }
    return { ...ctx, driver };
  }

  const ACTIVE_TRIP = ['assigned', 'driver_arrived', 'in_progress'];

  function clientActive(clientId) {
    const trip = S.trips.find((t) => t.client_id === clientId && ACTIVE_TRIP.includes(t.status));
    if (trip) return { type: 'trip', item: trip };
    const reqst = S.requests.find((r) => r.client_id === clientId && r.status === 'requested');
    return reqst ? { type: 'request', item: reqst } : null;
  }

  function tripSummary(t) {
    const r = S.requests.find((x) => x.id === t.request_id);
    const d = S.drivers.find((x) => x.id === t.driver_id);
    const du = d && userById(d.user_id);
    const v = S.vehicles.find((x) => x.id === t.vehicle_id);
    const c = userById(t.client_id);
    const rating = S.ratings.find((x) => x.trip_id === t.id);
    return {
      id: t.id,
      request_id: t.request_id,
      client_id: t.client_id,
      driver_id: t.driver_id,
      status: t.status,
      estimated_fare: t.estimated_fare,
      final_fare: t.final_fare ?? null,
      origin_name: r?.origin_name,
      destination_name: r?.destination_name,
      distance_travelled_km: t.distance_travelled_km ?? null,
      duration_travelled_min: t.duration_travelled_min ?? null,
      completed_at: t.completed_at ?? null,
      created_at: t.created_at,
      client: c ? { name: c.name } : null,
      driver: du ? { user: { name: du.name } } : null,
      vehicle: v ? { plate: v.plate } : null,
      rating: rating ? { id: rating.id, trip_id: rating.trip_id, score: rating.score, comment: rating.comment } : null,
    };
  }

  function findDriverTrip(driver, id) {
    const trip = S.trips.find((t) => t.id === id);
    if (!trip || trip.driver_id !== driver.id) throw new HttpError(404, 'Viaje no encontrado.');
    return trip;
  }

  function moveTrip(driver, id, from, to, field, message) {
    const trip = findDriverTrip(driver, id);
    if (trip.status !== from) {
      throw new HttpError(400, `El viaje está en estado "${trip.status}" y no puede pasar a "${to}".`);
    }
    trip.status = to;
    trip[field] = stamp();
    return { status: 200, body: { success: true, message, trip: { id: trip.id, status: trip.status, [field]: trip[field] } } };
  }

  // ---------------------------------------------------------------------
  // RUTAS: [método, patrón, manejador(req, body, params, query)]
  // ---------------------------------------------------------------------
  const routes = [
    // ===== 3.1 Autenticación =====
    ['POST', '/api/auth/register', (req, body) => {
      validate(body, {
        name: { required: true, type: 'string' },
        email: { required: true, type: 'string', email: true },
        phone: { required: true, type: 'string' },
        password: { required: true, type: 'string', min: 8 },
        role: { required: true, in: ['client', 'driver'] },
      });
      if (body.role === 'driver') {
        validate(body, {
          license_number: { required: true, type: 'string' },
          plate: { required: true, type: 'string' },
          brand: { required: true, type: 'string' },
          model: { required: true, type: 'string' },
          year: { required: true, type: 'number', min: 1990 },
          capacity: { required: true, type: 'number', min: 1, max: 8 },
          color: { required: true, type: 'string' },
        });
      }
      const email = body.email.toLowerCase();
      if (S.users.some((u) => u.email === email)) {
        throw new HttpError(422, 'Los datos enviados no son válidos.', { errors: { email: ['El correo ya está registrado.'] } });
      }
      if (S.users.some((u) => u.phone === body.phone)) {
        throw new HttpError(422, 'Los datos enviados no son válidos.', { errors: { phone: ['El teléfono ya está registrado.'] } });
      }
      const user = { id: S.seq.user++, name: body.name, email, phone: body.phone, password: body.password, role: body.role, status: 'active' };
      S.users.push(user);
      if (body.role === 'driver') {
        if (S.vehicles.some((v) => v.plate === body.plate.toUpperCase())) {
          throw new HttpError(422, 'Los datos enviados no son válidos.', { errors: { plate: ['La placa ya está registrada.'] } });
        }
        const driver = { id: S.seq.driver++, user_id: user.id, license_number: body.license_number, approval_status: 'pending', availability_status: 'unavailable', rating_average: 5.0 };
        S.drivers.push(driver);
        S.vehicles.push({ id: S.seq.vehicle++, driver_id: driver.id, plate: body.plate.toUpperCase(), brand: body.brand, model: body.model, year: body.year, capacity: body.capacity, color: body.color });
      }
      audit(user.id, 'register', `Registro de ${user.role} ${user.email}`);
      return { status: 201, body: { success: true, message: 'Usuario registrado exitosamente', ...issueToken(user), user: userWithProfile(user) } };
    }],

    ['POST', '/api/auth/login', (req, body) => {
      validate(body, { login: { required: true, type: 'string' }, password: { required: true, type: 'string' } });
      const login = body.login.toLowerCase();
      const user = S.users.find((u) => u.email === login || u.phone === body.login);
      if (!user || user.password !== body.password) {
        throw new HttpError(401, 'Credenciales inválidas. Verifique su correo/teléfono y contraseña.');
      }
      if (user.status !== 'active') throw new HttpError(403, 'Su cuenta está inactiva o suspendida.');
      audit(user.id, 'login', `Inicio de sesión de ${user.email}`);
      return { status: 200, body: { success: true, message: 'Inicio de sesión exitoso', ...issueToken(user), user: userWithProfile(user) } };
    }],

    ['GET', '/api/auth/me', (req) => {
      const { user } = authenticate(req);
      return { status: 200, body: { success: true, user: userWithProfile(user) } };
    }],

    ['POST', '/api/auth/logout', (req) => {
      const { user, token } = authenticate(req);
      S.blacklist.add(token);
      audit(user.id, 'logout', `Cierre de sesión de ${user.email}`);
      return { status: 200, body: { success: true, message: 'Sesión cerrada exitosamente' } };
    }],

    ['POST', '/api/auth/forgot-password', (req, body) => {
      validate(body, { email: { required: true, type: 'string', email: true }, new_password: { required: true, type: 'string', min: 8 } });
      const user = S.users.find((u) => u.email === body.email.toLowerCase());
      if (!user) throw new HttpError(404, 'No existe un usuario con ese correo.');
      user.password = body.new_password;
      audit(user.id, 'password_reset', `Restablecimiento de contraseña de ${user.email}`);
      return { status: 200, body: { success: true, message: 'Contraseña restablecida exitosamente. Ya puede iniciar sesión con su nueva clave.' } };
    }],

    // ===== 3.2 Tarifas públicas =====
    ['GET', '/api/fares/active', () => ({ status: 200, body: { success: true, fare: activeFare() } })],

    // ===== 3.3 Cliente =====
    ['POST', '/api/client/estimate-fare', (req, body) => {
      requireRole(req, 'client');
      const coords = {
        origin_latitude: { required: true, type: 'number', min: -90, max: 90 },
        origin_longitude: { required: true, type: 'number', min: -180, max: 180 },
        destination_latitude: { required: true, type: 'number', min: -90, max: 90 },
        destination_longitude: { required: true, type: 'number', min: -180, max: 180 },
      };
      validate(body, coords);
      const fare = activeFare();
      const km = round2(haversineKm(body.origin_latitude, body.origin_longitude, body.destination_latitude, body.destination_longitude));
      const min = Math.max(1, Math.ceil((km / URBAN_SPEED_KMH) * 60));
      const { base_fare, price_per_km, price_per_minute, minimum_fare, surge_multiplier } = fare;
      return {
        status: 200,
        body: {
          success: true,
          estimate: {
            distance_km: km,
            duration_min: min,
            estimated_fare: fareFor(fare, km, min),
            currency: 'COP',
            fare_breakdown: { base_fare, price_per_km, price_per_minute, minimum_fare, surge_multiplier },
          },
        },
      };
    }],

    ['POST', '/api/client/ride-requests', (req, body) => {
      const { user } = requireRole(req, 'client');
      validate(body, {
        origin_name: { required: true, type: 'string' },
        origin_latitude: { required: true, type: 'number', min: -90, max: 90 },
        origin_longitude: { required: true, type: 'number', min: -180, max: 180 },
        destination_name: { required: true, type: 'string' },
        destination_latitude: { required: true, type: 'number', min: -90, max: 90 },
        destination_longitude: { required: true, type: 'number', min: -180, max: 180 },
      });
      const current = clientActive(user.id);
      if (current) {
        const requestId = current.type === 'trip' ? current.item.request_id : current.item.id;
        throw new HttpError(400, 'Ya cuenta con una solicitud o viaje activo en curso.', { active_request_id: requestId });
      }
      const km = round2(haversineKm(body.origin_latitude, body.origin_longitude, body.destination_latitude, body.destination_longitude));
      const min = Math.max(1, Math.ceil((km / URBAN_SPEED_KMH) * 60));
      const rideRequest = {
        id: S.seq.request++,
        client_id: user.id,
        origin_name: body.origin_name,
        origin_latitude: body.origin_latitude,
        origin_longitude: body.origin_longitude,
        destination_name: body.destination_name,
        destination_latitude: body.destination_latitude,
        destination_longitude: body.destination_longitude,
        estimated_distance_km: km,
        estimated_duration_min: min,
        estimated_fare: fareFor(activeFare(), km, min),
        status: 'requested',
        created_at: stamp(),
      };
      S.requests.push(rideRequest);
      return { status: 201, body: { success: true, message: 'Solicitud de viaje creada exitosamente. Buscando conductores disponibles...', ride_request: rideRequest } };
    }],

    ['GET', '/api/client/active', (req) => {
      const { user } = requireRole(req, 'client');
      const current = clientActive(user.id);
      if (!current) return { status: 200, body: { success: true, has_active: false } };
      const r = current.type === 'trip' ? S.requests.find((x) => x.id === current.item.request_id) : current.item;
      const route = {
        origin_name: r.origin_name, origin_latitude: r.origin_latitude, origin_longitude: r.origin_longitude,
        destination_name: r.destination_name, destination_latitude: r.destination_latitude, destination_longitude: r.destination_longitude,
      };
      if (current.type === 'request') {
        return { status: 200, body: { success: true, has_active: true, type: 'request', data: { id: r.id, status: r.status, estimated_fare: r.estimated_fare, ...route } } };
      }
      const t = current.item;
      const d = S.drivers.find((x) => x.id === t.driver_id);
      const du = userById(d.user_id);
      return {
        status: 200,
        body: {
          success: true,
          has_active: true,
          type: 'trip',
          data: {
            id: t.id,
            status: t.status,
            estimated_fare: t.estimated_fare,
            ...route,
            driver: { id: d.id, rating_average: d.rating_average, user: { name: du.name, phone: du.phone }, latest_location: latestLocation(d.id) },
            vehicle: vehiclePublic(S.vehicles.find((v) => v.id === t.vehicle_id)),
          },
        },
      };
    }],

    ['POST', '/api/client/cancel/:id', (req, body, params) => {
      const { user } = requireRole(req, 'client');
      const id = Number(params.id);
      const reason = body?.reason ?? 'Sin motivo';
      const current = clientActive(user.id);
      if (current?.type === 'trip' && current.item.id === id) {
        const trip = current.item;
        if (trip.status === 'in_progress') throw new HttpError(400, 'No se puede cancelar un viaje que ya inició su recorrido.');
        trip.status = 'cancelled';
        const r = S.requests.find((x) => x.id === trip.request_id);
        if (r) r.status = 'cancelled';
        const d = S.drivers.find((x) => x.id === trip.driver_id);
        if (d) d.availability_status = 'available';
        S.cancellations.push({ trip_id: trip.id, request_id: trip.request_id, client_id: user.id, reason, created_at: stamp() });
        return { status: 200, body: { success: true, message: 'Solicitud cancelada exitosamente' } };
      }
      const r = S.requests.find((x) => x.id === id && x.client_id === user.id);
      if (!r) throw new HttpError(404, 'Solicitud no encontrada.');
      if (r.status !== 'requested') throw new HttpError(400, `La solicitud está en estado "${r.status}" y no se puede cancelar.`);
      r.status = 'cancelled';
      S.cancellations.push({ trip_id: null, request_id: r.id, client_id: user.id, reason, created_at: stamp() });
      return { status: 200, body: { success: true, message: 'Solicitud cancelada exitosamente' } };
    }],

    ['GET', '/api/client/trips', (req) => {
      const { user } = requireRole(req, 'client');
      const data = S.trips.filter((t) => t.client_id === user.id).sort((a, b) => b.id - a.id).map(tripSummary);
      return { status: 200, body: { success: true, trips: { current_page: 1, per_page: 15, total: data.length, data } } };
    }],

    ['POST', '/api/client/trips/:id/rating', (req, body, params) => {
      const { user } = requireRole(req, 'client');
      const trip = S.trips.find((t) => t.id === Number(params.id) && t.client_id === user.id);
      if (!trip) throw new HttpError(404, 'Viaje no encontrado.');
      validate(body, { score: { required: true, type: 'number', min: 1, max: 5 }, comment: { type: 'string' }, has_incident: { type: 'boolean' } });
      if (trip.status !== 'completed') throw new HttpError(400, 'Solo se pueden calificar viajes finalizados.');
      if (S.ratings.some((r) => r.trip_id === trip.id)) throw new HttpError(400, 'Este viaje ya fue calificado.');
      const rating = { id: S.seq.rating++, trip_id: trip.id, client_id: user.id, driver_id: trip.driver_id, score: body.score, comment: body.comment ?? '', has_incident: !!body.has_incident, created_at: stamp() };
      S.ratings.push(rating);
      // Recalcular promedio del conductor
      const scores = S.ratings.filter((r) => r.driver_id === trip.driver_id).map((r) => r.score);
      const d = S.drivers.find((x) => x.id === trip.driver_id);
      if (d) d.rating_average = round2(scores.reduce((a, b) => a + b, 0) / scores.length);
      return { status: 201, body: { success: true, message: 'Calificación enviada exitosamente. ¡Gracias por sus comentarios!', rating: { id: rating.id, trip_id: rating.trip_id, score: rating.score, comment: rating.comment } } };
    }],

    // ===== 3.4 Conductor =====
    ['PUT', '/api/driver/availability', (req, body) => {
      const { user } = requireRole(req, 'driver');
      validate(body, { status: { required: true, in: ['available', 'unavailable'] } });
      const driver = driverByUser(user.id);
      if (driver.approval_status !== 'approved') {
        throw new HttpError(403, 'Solo conductores aprobados pueden activar su disponibilidad.', { approval_status: driver.approval_status });
      }
      if (S.trips.some((t) => t.driver_id === driver.id && ACTIVE_TRIP.includes(t.status))) {
        throw new HttpError(400, 'No puede cambiar su disponibilidad durante un viaje activo.');
      }
      driver.availability_status = body.status;
      return { status: 200, body: { success: true, message: `Disponibilidad cambiada a: ${body.status}`, availability_status: body.status } };
    }],

    ['GET', '/api/driver/ride-requests', (req) => {
      requireApprovedDriver(req);
      const requests = S.requests.filter((r) => r.status === 'requested').map((r) => {
        const c = userById(r.client_id);
        return {
          id: r.id,
          origin_name: r.origin_name,
          origin_latitude: r.origin_latitude,
          origin_longitude: r.origin_longitude,
          destination_name: r.destination_name,
          destination_latitude: r.destination_latitude,
          destination_longitude: r.destination_longitude,
          estimated_distance_km: r.estimated_distance_km,
          estimated_fare: r.estimated_fare,
          client: { name: c.name, phone: c.phone },
        };
      });
      return { status: 200, body: { success: true, requests } };
    }],

    ['POST', '/api/driver/ride-requests/:id/accept', (req, body, params) => {
      const { driver } = requireApprovedDriver(req);
      if (S.trips.some((t) => t.driver_id === driver.id && ACTIVE_TRIP.includes(t.status))) {
        throw new HttpError(400, 'Ya tiene un viaje activo en curso.');
      }
      // Equivalente a DB::transaction + lockForUpdate: Node es de un solo hilo,
      // así que la verificación y el cambio de estado ocurren sin interrupciones.
      const r = S.requests.find((x) => x.id === Number(params.id));
      if (!r) throw new HttpError(404, 'Solicitud no encontrada.');
      if (r.status !== 'requested') {
        throw new HttpError(409, 'Lo sentimos, este servicio ya fue tomado por otro conductor o fue cancelado.');
      }
      r.status = 'accepted';
      const vehicle = vehicleOf(driver.id);
      const trip = { id: S.seq.trip++, request_id: r.id, client_id: r.client_id, driver_id: driver.id, vehicle_id: vehicle?.id, fare_id: activeFare().id, status: 'assigned', estimated_fare: r.estimated_fare, final_fare: null, created_at: stamp() };
      S.trips.push(trip);
      driver.availability_status = 'busy';
      return { status: 200, body: { success: true, message: 'Servicio aceptado exitosamente', trip: { id: trip.id, request_id: r.id, client_id: r.client_id, driver_id: driver.id, status: trip.status, estimated_fare: trip.estimated_fare } } };
    }],

    ['POST', '/api/driver/trips/:id/arrive', (req, body, params) => {
      const { driver } = requireApprovedDriver(req);
      return moveTrip(driver, Number(params.id), 'assigned', 'driver_arrived', 'driver_arrived_at', 'Llegada registrada. El cliente ha sido notificado.');
    }],

    ['POST', '/api/driver/trips/:id/start', (req, body, params) => {
      const { driver } = requireApprovedDriver(req);
      return moveTrip(driver, Number(params.id), 'driver_arrived', 'in_progress', 'started_at', 'Viaje iniciado exitosamente');
    }],

    ['POST', '/api/driver/trips/:id/complete', (req, body, params) => {
      const { driver } = requireApprovedDriver(req);
      const trip = findDriverTrip(driver, Number(params.id));
      validate(body, { actual_distance_km: { required: true, type: 'number', min: 0 }, actual_duration_min: { required: true, type: 'number', min: 0 } });
      if (trip.status !== 'in_progress') throw new HttpError(400, 'Solo se puede finalizar un viaje en curso.');
      const fare = S.fares.find((f) => f.id === trip.fare_id) ?? activeFare();
      trip.status = 'completed';
      trip.distance_travelled_km = body.actual_distance_km;
      trip.duration_travelled_min = body.actual_duration_min;
      trip.final_fare = fareFor(fare, body.actual_distance_km, body.actual_duration_min);
      trip.completed_at = stamp();
      const r = S.requests.find((x) => x.id === trip.request_id);
      if (r) r.status = 'completed';
      driver.availability_status = 'available';
      return {
        status: 200,
        body: {
          success: true,
          message: 'Viaje finalizado con éxito. Tarifa definitiva calculada.',
          trip: { id: trip.id, status: trip.status, final_fare: trip.final_fare, distance_travelled_km: trip.distance_travelled_km, duration_travelled_min: trip.duration_travelled_min, completed_at: trip.completed_at },
        },
      };
    }],

    ['POST', '/api/driver/location', (req, body) => {
      const { driver } = requireApprovedDriver(req);
      validate(body, {
        latitude: { required: true, type: 'number', min: -90, max: 90 },
        longitude: { required: true, type: 'number', min: -180, max: 180 },
        heading: { type: 'number' },
        speed: { type: 'number' },
        trip_id: { type: 'number' },
      });
      const loc = { id: S.seq.location++, driver_id: driver.id, latitude: body.latitude, longitude: body.longitude, heading: body.heading ?? null, speed: body.speed ?? null, trip_id: body.trip_id ?? null, recorded_at: stamp() };
      S.locations.push(loc);
      if (S.locations.length > 2000) S.locations.splice(0, 1000);
      return { status: 200, body: { success: true, location: { driver_id: driver.id, latitude: loc.latitude, longitude: loc.longitude, recorded_at: loc.recorded_at } } };
    }],

    // ===== 3.5 Administrador =====
    ['GET', '/api/admin/dashboard', (req) => {
      requireRole(req, 'admin');
      const completed = S.trips.filter((t) => t.status === 'completed');
      return {
        status: 200,
        body: {
          success: true,
          stats: {
            total_clients: S.users.filter((u) => u.role === 'client').length,
            total_drivers: S.drivers.length,
            pending_drivers: S.drivers.filter((d) => d.approval_status === 'pending').length,
            approved_drivers: S.drivers.filter((d) => d.approval_status === 'approved').length,
            active_trips: S.trips.filter((t) => ACTIVE_TRIP.includes(t.status)).length,
            completed_trips: completed.length,
            cancelled_trips: S.trips.filter((t) => t.status === 'cancelled').length,
            pending_requests: S.requests.filter((r) => r.status === 'requested').length,
            total_revenue: completed.reduce((sum, t) => sum + (t.final_fare ?? 0), 0),
          },
          recent_trips: [...S.trips].sort((a, b) => b.id - a.id).slice(0, 5).map(tripSummary),
          recent_incidents: S.ratings.filter((r) => r.has_incident).slice(-5).reverse()
            .map((r) => ({ id: r.id, trip_id: r.trip_id, score: r.score, comment: r.comment, created_at: r.created_at })),
        },
      };
    }],

    ['GET', '/api/admin/drivers', (req, body, params, query) => {
      requireRole(req, 'admin');
      const filter = query.get('approval_status');
      const drivers = S.drivers.filter((d) => !filter || d.approval_status === filter).map((d) => {
        const u = userById(d.user_id);
        return { ...driverProfile(d), user: { name: u.name, email: u.email } };
      });
      return { status: 200, body: { success: true, drivers } };
    }],

    ['PATCH', '/api/admin/drivers/:id/approval', (req, body, params) => {
      const { user } = requireRole(req, 'admin');
      validate(body, { approval_status: { required: true, in: ['approved', 'pending', 'suspended', 'rejected'] }, admin_notes: { type: 'string' } });
      const d = S.drivers.find((x) => x.id === Number(params.id));
      if (!d) throw new HttpError(404, 'Conductor no encontrado.');
      d.approval_status = body.approval_status;
      d.admin_notes = body.admin_notes ?? null;
      if (body.approval_status !== 'approved') d.availability_status = 'unavailable';
      audit(user.id, 'driver_approval', `Conductor #${d.id} actualizado a ${d.approval_status}`);
      return { status: 200, body: { success: true, message: `Estado del conductor actualizado a: ${d.approval_status}`, driver: { id: d.id, approval_status: d.approval_status } } };
    }],

    ['GET', '/api/admin/fares', (req) => {
      requireRole(req, 'admin');
      return { status: 200, body: { success: true, fares: S.fares } };
    }],

    ['POST', '/api/admin/fares', (req, body) => {
      const { user } = requireRole(req, 'admin');
      validate(body, {
        name: { required: true, type: 'string' },
        base_fare: { required: true, type: 'number', min: 0 },
        price_per_km: { required: true, type: 'number', min: 0 },
        price_per_minute: { required: true, type: 'number', min: 0 },
        minimum_fare: { required: true, type: 'number', min: 0 },
        surge_multiplier: { required: true, type: 'number', min: 1 },
        active: { type: 'boolean' },
      });
      const fare = { id: S.seq.fare++, name: body.name, base_fare: body.base_fare, price_per_km: body.price_per_km, price_per_minute: body.price_per_minute, minimum_fare: body.minimum_fare, surge_multiplier: body.surge_multiplier, active: body.active ?? false };
      if (fare.active) S.fares.forEach((f) => { f.active = false; });
      S.fares.push(fare);
      audit(user.id, 'fare_created', `Tarifa "${fare.name}" configurada`);
      return { status: 201, body: { success: true, message: 'Tarifa configurada exitosamente', fare } };
    }],

    ['GET', '/api/admin/trips', (req, body, params, query) => {
      requireRole(req, 'admin');
      const status = query.get('status');
      const driverId = query.get('driver_id');
      const clientId = query.get('client_id');
      const date = query.get('date');
      const trips = S.trips
        .filter((t) => !status || t.status === status)
        .filter((t) => !driverId || t.driver_id === Number(driverId))
        .filter((t) => !clientId || t.client_id === Number(clientId))
        .filter((t) => !date || (t.created_at ?? '').startsWith(date))
        .sort((a, b) => b.id - a.id)
        .map(tripSummary);
      return { status: 200, body: { success: true, trips } };
    }],

    ['GET', '/api/admin/reports', (req) => {
      requireRole(req, 'admin');
      const completed = S.trips.filter((t) => t.status === 'completed');
      const revenue = completed.reduce((s, t) => s + (t.final_fare ?? 0), 0);
      return {
        status: 200,
        body: {
          success: true,
          cancellations: {
            total: S.cancellations.length,
            requests_cancelled: S.cancellations.filter((c) => !c.trip_id).length,
            trips_cancelled: S.cancellations.filter((c) => c.trip_id).length,
          },
          revenue: {
            total_revenue: revenue,
            completed_trips: completed.length,
            average_fare: completed.length ? Math.round(revenue / completed.length) : 0,
          },
          drivers_performance: S.drivers.map((d) => {
            const mine = completed.filter((t) => t.driver_id === d.id);
            return {
              driver: userById(d.user_id).name,
              completed_trips: mine.length,
              revenue: mine.reduce((s, t) => s + (t.final_fare ?? 0), 0),
              rating_average: d.rating_average,
            };
          }),
        },
      };
    }],

    ['GET', '/api/admin/audit-logs', (req) => {
      requireRole(req, 'admin');
      return { status: 200, body: { success: true, logs: [...S.auditLogs].reverse() } };
    }],
  ];

  // Compila los patrones "/api/x/:id" a expresiones regulares.
  const compiled = routes.map(([method, pattern, handler]) => {
    const keys = [];
    const regex = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '(\\d+)'; })}$`);
    return { method, regex, keys, handler };
  });

  // Manejador HTTP
  return async function handle(req, res) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
    };
    const send = (status, body) => {
      res.writeHead(status, { ...cors, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(body));
    };

    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors);
      res.end();
      return;
    }

    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname.replace(/\/+$/, '');
    try {
      const body = await readJson(req);
      const pathMatches = compiled.filter((r) => r.regex.test(path));
      const route = pathMatches.find((r) => r.method === req.method);
      if (!route) {
        throw pathMatches.length ? new HttpError(405, 'Método no permitido.') : new HttpError(404, 'Ruta no encontrada.');
      }
      const values = path.match(route.regex).slice(1);
      const params = Object.fromEntries(route.keys.map((k, i) => [k, values[i]]));
      const result = route.handler(req, body, params, url.searchParams);
      send(result.status, result.body);
    } catch (err) {
      if (err instanceof HttpError) {
        send(err.status, { success: false, message: err.message, ...err.extra });
      } else {
        console.error(err);
        send(500, { success: false, message: 'Error interno del servidor.' });
      }
    }
    if (process.env.MOCK_LOG !== '0') {
      console.log(`${new Date().toLocaleTimeString()} ${req.method} ${path} -> ${res.statusCode}`);
    }
  };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new HttpError(400, 'El cuerpo de la petición no es un JSON válido.'));
      }
    });
    req.on('error', reject);
  });
}

export function startServer(port = Number(process.env.PORT ?? 8000), host = process.env.HOST ?? '0.0.0.0') {
  const server = http.createServer(createApp());
  return new Promise((resolve) => server.listen(port, host, () => resolve(server)));
}

// Si se ejecuta directamente (node server.mjs) arranca el servidor.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  startServer().then((server) => {
    const { port } = server.address();
    console.log(`🚗 Mock API Uber escuchando en http://127.0.0.1:${port}/api`);
    console.log('Cuentas: cliente@uber.com/cliente123 · conductor@uber.com/conductor123 · andres@uber.com/conductor123 · admin@uber.com/admin123');
  });
}
