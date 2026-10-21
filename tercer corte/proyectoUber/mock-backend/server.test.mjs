/*
 * PRUEBAS DE INTEGRACIÓN DE LA API (contrato de API_DOCUMENTATION.md)
 * Ejecutar:  node --test            (desde la carpeta mock-backend)
 * Cada prueba arranca un servidor nuevo en un puerto libre, así no dependen entre sí.
 * Los ID de prueba (API-01, API-02, ...) se usan en PRUEBAS.md.
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import { afterEach, beforeEach, describe, test } from 'node:test';

import { createApp } from './server.mjs';

let server;
let base;

beforeEach(async () => {
  process.env.MOCK_LOG = '0';
  server = http.createServer(createApp());
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

afterEach(() => new Promise((r) => server.close(r)));

async function call(method, path, { token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

async function login(loginValue, password) {
  const res = await call('POST', '/auth/login', { body: { login: loginValue, password } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.access_token;
}

const ROUTE = {
  origin_name: 'Parque de la 93, Calle 93A # 12-50',
  origin_latitude: 4.6766,
  origin_longitude: -74.0483,
  destination_name: 'Centro Comercial Andino, Carrera 11 # 82-71',
  destination_latitude: 4.6664,
  destination_longitude: -74.0536,
};

describe('3.1 Autenticación', () => {
  test('API-01 login con correo devuelve JWT y usuario (200)', async () => {
    const res = await call('POST', '/auth/login', { body: { login: 'cliente@uber.com', password: 'cliente123' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.token_type, 'bearer');
    assert.equal(res.body.expires_in, 3600);
    assert.equal(res.body.user.role, 'client');
    assert.ok(res.body.access_token);
  });

  test('API-02 login con teléfono también funciona', async () => {
    const res = await call('POST', '/auth/login', { body: { login: '3001234567', password: 'cliente123' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, 'cliente@uber.com');
  });

  test('API-03 contraseña incorrecta -> 401', async () => {
    const res = await call('POST', '/auth/login', { body: { login: 'cliente@uber.com', password: 'mala' } });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  test('API-04 registro de cliente -> 201 con token', async () => {
    const res = await call('POST', '/auth/register', {
      body: { name: 'Daniela Morales', email: 'daniela@ejemplo.com', phone: '3109876543', password: 'password123', role: 'client' },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.message, 'Usuario registrado exitosamente');
    assert.equal(res.body.user.status, 'active');
  });

  test('API-05 registro de conductor queda "pending" con su vehículo', async () => {
    const res = await call('POST', '/auth/register', {
      body: {
        name: 'Héctor Fabio', email: 'hector@ejemplo.com', phone: '3154567890', password: 'password123', role: 'driver',
        license_number: 'LC-88291-CO', plate: 'HJK-987', brand: 'Mazda', model: 'Mazda 3', year: 2024, capacity: 4, color: 'Rojo Metálico',
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.driver.approval_status, 'pending');
    assert.equal(res.body.user.driver.vehicles[0].plate, 'HJK-987');
  });

  test('API-06 registro con correo repetido o datos inválidos -> 422', async () => {
    const dup = await call('POST', '/auth/register', {
      body: { name: 'X', email: 'cliente@uber.com', phone: '3999999999', password: 'password123', role: 'client' },
    });
    assert.equal(dup.status, 422);
    assert.ok(dup.body.errors.email);

    const shortPass = await call('POST', '/auth/register', {
      body: { name: 'X', email: 'nuevo@ejemplo.com', phone: '3888888888', password: '123', role: 'client' },
    });
    assert.equal(shortPass.status, 422);
    assert.ok(shortPass.body.errors.password);
  });

  test('API-07 /auth/me sin token -> 401 y con token -> perfil', async () => {
    assert.equal((await call('GET', '/auth/me')).status, 401);
    const token = await login('conductor@uber.com', 'conductor123');
    const me = await call('GET', '/auth/me', { token });
    assert.equal(me.status, 200);
    assert.equal(me.body.user.name, 'Carlos Rodríguez');
    assert.equal(me.body.user.driver.approval_status, 'approved');
  });

  test('API-08 logout invalida el token (lista negra)', async () => {
    const token = await login('cliente@uber.com', 'cliente123');
    const out = await call('POST', '/auth/logout', { token });
    assert.equal(out.status, 200);
    assert.equal(out.body.message, 'Sesión cerrada exitosamente');
    assert.equal((await call('GET', '/auth/me', { token })).status, 401);
  });

  test('API-09 forgot-password cambia la clave', async () => {
    const res = await call('POST', '/auth/forgot-password', { body: { email: 'cliente@uber.com', new_password: 'nuevaClaveSegura123' } });
    assert.equal(res.status, 200);
    assert.equal((await call('POST', '/auth/login', { body: { login: 'cliente@uber.com', password: 'cliente123' } })).status, 401);
    await login('cliente@uber.com', 'nuevaClaveSegura123');
  });
});

describe('3.2 / 3.3 Cliente', () => {
  test('API-10 tarifa activa pública', async () => {
    const res = await call('GET', '/fares/active');
    assert.equal(res.status, 200);
    assert.equal(res.body.fare.name, 'Tarifa Estándar Urbana');
    assert.equal(res.body.fare.minimum_fare, 6500);
  });

  test('API-11 estimación con el ejemplo del documento: 1.28 km, 4 min, $6.500', async () => {
    const token = await login('cliente@uber.com', 'cliente123');
    const res = await call('POST', '/client/estimate-fare', {
      token,
      body: { origin_latitude: 4.6766, origin_longitude: -74.0483, destination_latitude: 4.6664, destination_longitude: -74.0536 },
    });
    assert.equal(res.status, 200);
    assert.deepEqual(
      { km: res.body.estimate.distance_km, min: res.body.estimate.duration_min, fare: res.body.estimate.estimated_fare },
      { km: 1.28, min: 4, fare: 6500 },
    );
    assert.equal(res.body.estimate.currency, 'COP');
  });

  test('API-12 un conductor no puede usar endpoints de cliente -> 403', async () => {
    const token = await login('conductor@uber.com', 'conductor123');
    assert.equal((await call('GET', '/client/active', { token })).status, 403);
  });

  test('API-13 solicitar viaje -> 201 y segundo intento -> 400 con active_request_id', async () => {
    const token = await login('cliente@uber.com', 'cliente123');
    const first = await call('POST', '/client/ride-requests', { token, body: ROUTE });
    assert.equal(first.status, 201);
    assert.equal(first.body.ride_request.status, 'requested');
    const second = await call('POST', '/client/ride-requests', { token, body: ROUTE });
    assert.equal(second.status, 400);
    assert.equal(second.body.active_request_id, first.body.ride_request.id);
  });

  test('API-14 solicitud sin coordenadas -> 422', async () => {
    const token = await login('cliente@uber.com', 'cliente123');
    const res = await call('POST', '/client/ride-requests', { token, body: { origin_name: 'A' } });
    assert.equal(res.status, 422);
    assert.ok(res.body.errors.origin_latitude);
  });

  test('API-15 cancelar una solicitud pendiente', async () => {
    const token = await login('cliente@uber.com', 'cliente123');
    const created = await call('POST', '/client/ride-requests', { token, body: ROUTE });
    const cancel = await call('POST', `/client/cancel/${created.body.ride_request.id}`, { token, body: { reason: 'Cambio de planes del usuario' } });
    assert.equal(cancel.status, 200);
    assert.equal((await call('GET', '/client/active', { token })).body.has_active, false);
  });

  test('API-16 historial paginado del cliente', async () => {
    const token = await login('cliente@uber.com', 'cliente123');
    const res = await call('GET', '/client/trips', { token });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.trips.data));
    assert.equal(res.body.trips.data[0].driver.user.name, 'Carlos Rodríguez');
    assert.equal(res.body.trips.data[0].vehicle.plate, 'UBR-123');
  });
});

describe('3.4 Conductor y flujo completo de un viaje', () => {
  test('API-17 conductor pendiente no puede ponerse disponible -> 403 con approval_status', async () => {
    const token = await login('andres@uber.com', 'conductor123');
    const res = await call('PUT', '/driver/availability', { token, body: { status: 'available' } });
    assert.equal(res.status, 403);
    assert.equal(res.body.approval_status, 'pending');
  });

  test('API-18 flujo: solicitar -> aceptar -> llegar -> iniciar -> GPS -> finalizar -> calificar', async () => {
    const client = await login('cliente@uber.com', 'cliente123');
    const driver = await login('conductor@uber.com', 'conductor123');

    const avail = await call('PUT', '/driver/availability', { token: driver, body: { status: 'available' } });
    assert.equal(avail.body.availability_status, 'available');

    const req = await call('POST', '/client/ride-requests', { token: client, body: ROUTE });
    const pending = await call('GET', '/driver/ride-requests', { token: driver });
    assert.ok(pending.body.requests.some((r) => r.id === req.body.ride_request.id));

    const accepted = await call('POST', `/driver/ride-requests/${req.body.ride_request.id}/accept`, { token: driver });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.trip.status, 'assigned');
    const tripId = accepted.body.trip.id;

    // El cliente ve conductor y vehículo
    const active = await call('GET', '/client/active', { token: client });
    assert.equal(active.body.type, 'trip');
    assert.equal(active.body.data.vehicle.plate, 'UBR-123');

    // No se puede iniciar sin haber llegado
    assert.equal((await call('POST', `/driver/trips/${tripId}/start`, { token: driver })).status, 400);

    assert.equal((await call('POST', `/driver/trips/${tripId}/arrive`, { token: driver })).body.trip.status, 'driver_arrived');
    assert.equal((await call('POST', `/driver/trips/${tripId}/start`, { token: driver })).body.trip.status, 'in_progress');

    // GPS: la ubicación llega al cliente
    const loc = await call('POST', '/driver/location', { token: driver, body: { latitude: 4.6715, longitude: -74.0509, heading: 120.5, speed: 34.2, trip_id: tripId } });
    assert.equal(loc.status, 200);
    const tracking = await call('GET', '/client/active', { token: client });
    assert.deepEqual(tracking.body.data.driver.latest_location, { latitude: 4.6715, longitude: -74.0509 });

    // Un viaje en curso no se puede cancelar
    assert.equal((await call('POST', `/client/cancel/${tripId}`, { token: client, body: { reason: 'x' } })).status, 400);

    const done = await call('POST', `/driver/trips/${tripId}/complete`, { token: driver, body: { actual_distance_km: 1.45, actual_duration_min: 6 } });
    assert.equal(done.status, 200);
    assert.equal(done.body.trip.status, 'completed');
    // 3800 + 1.45·1250 + 6·250 = 7112.5 -> 7113 (el ejemplo del documento muestra 6500; ver PRUEBAS.md)
    assert.equal(done.body.trip.final_fare, 7113);
    const me = await call('GET', '/auth/me', { token: driver });
    assert.equal(me.body.user.driver.availability_status, 'available');

    const rating = await call('POST', `/client/trips/${tripId}/rating`, { token: client, body: { score: 5, comment: 'Conducción impecable y vehículo muy limpio.', has_incident: false } });
    assert.equal(rating.status, 201);
    const again = await call('POST', `/client/trips/${tripId}/rating`, { token: client, body: { score: 4 } });
    assert.equal(again.status, 400);
  });

  test('API-19 concurrencia: dos conductores aceptan el mismo viaje -> uno 200 y otro 409', async () => {
    const client = await login('cliente@uber.com', 'cliente123');
    const carlos = await login('conductor@uber.com', 'conductor123');
    const laura = await login('laura@uber.com', 'conductor123');
    const req = await call('POST', '/client/ride-requests', { token: client, body: ROUTE });
    const id = req.body.ride_request.id;

    const results = await Promise.all([
      call('POST', `/driver/ride-requests/${id}/accept`, { token: carlos }),
      call('POST', `/driver/ride-requests/${id}/accept`, { token: laura }),
    ]);
    const statuses = results.map((r) => r.status).sort();
    assert.deepEqual(statuses, [200, 409]);
    const loser = results.find((r) => r.status === 409);
    assert.equal(loser.body.message, 'Lo sentimos, este servicio ya fue tomado por otro conductor o fue cancelado.');
  });

  test('API-20 calificar un viaje no finalizado -> 400', async () => {
    const client = await login('cliente@uber.com', 'cliente123');
    const driver = await login('conductor@uber.com', 'conductor123');
    const req = await call('POST', '/client/ride-requests', { token: client, body: ROUTE });
    const trip = await call('POST', `/driver/ride-requests/${req.body.ride_request.id}/accept`, { token: driver });
    const res = await call('POST', `/client/trips/${trip.body.trip.id}/rating`, { token: client, body: { score: 5, comment: '', has_incident: false } });
    assert.equal(res.status, 400);
  });
});

describe('3.5 Administrador', () => {
  test('API-21 dashboard con los KPIs del documento', async () => {
    const token = await login('admin@uber.com', 'admin123');
    const res = await call('GET', '/admin/dashboard', { token });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.stats, {
      total_clients: 3, total_drivers: 3, pending_drivers: 1, approved_drivers: 2,
      active_trips: 0, completed_trips: 2, cancelled_trips: 0, pending_requests: 0, total_revenue: 15800,
    });
  });

  test('API-22 filtrar conductores pendientes y aprobarlo; luego puede ponerse disponible', async () => {
    const admin = await login('admin@uber.com', 'admin123');
    const pending = await call('GET', '/admin/drivers?approval_status=pending', { token: admin });
    assert.equal(pending.body.drivers.length, 1);
    const andres = pending.body.drivers[0];
    assert.equal(andres.user.email, 'andres@uber.com');

    const patch = await call('PATCH', `/admin/drivers/${andres.id}/approval`, {
      token: admin, body: { approval_status: 'approved', admin_notes: 'Documentación de SOAT y licencia verificada.' },
    });
    assert.equal(patch.status, 200);
    assert.equal(patch.body.message, 'Estado del conductor actualizado a: approved');

    const driver = await login('andres@uber.com', 'conductor123');
    assert.equal((await call('PUT', '/driver/availability', { token: driver, body: { status: 'available' } })).status, 200);
  });

  test('API-23 crear tarifa activa la vuelve la tarifa pública', async () => {
    const admin = await login('admin@uber.com', 'admin123');
    const res = await call('POST', '/admin/fares', {
      token: admin,
      body: { name: 'Tarifa Hora Pico', base_fare: 4500, price_per_km: 1500, price_per_minute: 350, minimum_fare: 8000, surge_multiplier: 1.3, active: true },
    });
    assert.equal(res.status, 201);
    assert.equal((await call('GET', '/fares/active')).body.fare.name, 'Tarifa Hora Pico');
    assert.equal((await call('GET', '/admin/fares', { token: admin })).body.fares.length, 2);
  });

  test('API-24 viajes con filtros, reportes y auditoría', async () => {
    const admin = await login('admin@uber.com', 'admin123');
    const byDriver = await call('GET', '/admin/trips?driver_id=1&status=completed', { token: admin });
    assert.equal(byDriver.body.trips.length, 1);
    const byDate = await call('GET', '/admin/trips?date=2026-10-20', { token: admin });
    assert.equal(byDate.body.trips.length, 2);
    const reports = await call('GET', '/admin/reports', { token: admin });
    assert.equal(reports.body.revenue.total_revenue, 15800);
    const logs = await call('GET', '/admin/audit-logs', { token: admin });
    assert.equal(logs.body.logs[0].action, 'login');
  });

  test('API-25 un cliente no puede entrar al módulo admin -> 403', async () => {
    const token = await login('cliente@uber.com', 'cliente123');
    assert.equal((await call('GET', '/admin/dashboard', { token })).status, 403);
  });
});
