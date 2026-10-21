import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AdminService, unwrapList } from './admin.service';
import { ApiConfigService } from './api-config.service';
import { ClientService } from './client.service';
import { DriverService } from './driver.service';

const API = 'http://127.0.0.1:8000/api';

// Verifica que cada método llame al endpoint, método HTTP y cuerpo del documento.
describe('servicios de la API', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('ClientService', () => {
    it('FE-17 estimate-fare devuelve solo el objeto "estimate"', () => {
      let km = 0;
      TestBed.inject(ClientService)
        .estimateFare({ origin_latitude: 4.6766, origin_longitude: -74.0483, destination_latitude: 4.6664, destination_longitude: -74.0536 })
        .subscribe((e) => (km = e.distance_km));
      const req = http.expectOne(`${API}/client/estimate-fare`);
      expect(req.request.method).toBe('POST');
      req.flush({ success: true, estimate: { distance_km: 1.28, duration_min: 4, estimated_fare: 6500, currency: 'COP', fare_breakdown: {} } });
      expect(km).toBe(1.28);
    });

    it('FE-18 historial: desempaqueta trips.data (paginación de Laravel)', () => {
      let count = 0;
      TestBed.inject(ClientService).trips().subscribe((t) => (count = t.length));
      http.expectOne(`${API}/client/trips`).flush({ success: true, trips: { data: [{ id: 1, status: 'completed' }] } });
      expect(count).toBe(1);
    });

    it('FE-19 cancelar y calificar usan el id en la URL', () => {
      const client = TestBed.inject(ClientService);
      client.cancel(7, 'Cambio de planes del usuario').subscribe();
      expect(http.expectOne(`${API}/client/cancel/7`).request.body).toEqual({ reason: 'Cambio de planes del usuario' });

      client.rate(1, { score: 5, comment: 'Excelente', has_incident: false }).subscribe();
      const req = http.expectOne(`${API}/client/trips/1/rating`);
      expect(req.request.body).toEqual({ score: 5, comment: 'Excelente', has_incident: false });
      req.flush({ success: true, rating: {} });
    });
  });

  describe('DriverService', () => {
    it('FE-20 availability usa PUT con {status}', () => {
      TestBed.inject(DriverService).setAvailability('available').subscribe();
      const req = http.expectOne(`${API}/driver/availability`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ status: 'available' });
      req.flush({ success: true, availability_status: 'available' });
    });

    it('FE-21 flujo accept -> arrive -> start -> complete', () => {
      const driver = TestBed.inject(DriverService);
      driver.accept(2).subscribe();
      driver.arrive(3).subscribe();
      driver.start(3).subscribe();
      driver.complete(3, 1.45, 6).subscribe();
      http.expectOne(`${API}/driver/ride-requests/2/accept`).flush({ trip: {} });
      http.expectOne(`${API}/driver/trips/3/arrive`).flush({ trip: {} });
      http.expectOne(`${API}/driver/trips/3/start`).flush({ trip: {} });
      const complete = http.expectOne(`${API}/driver/trips/3/complete`);
      expect(complete.request.body).toEqual({ actual_distance_km: 1.45, actual_duration_min: 6 });
      complete.flush({ trip: {} });
    });
  });

  describe('AdminService', () => {
    it('FE-22 drivers agrega ?approval_status solo si hay filtro', () => {
      const admin = TestBed.inject(AdminService);
      admin.drivers('pending').subscribe();
      http.expectOne(`${API}/admin/drivers?approval_status=pending`).flush({ drivers: [] });
      admin.drivers('').subscribe();
      http.expectOne(`${API}/admin/drivers`).flush({ drivers: [] });
    });

    it('FE-23 trips omite los filtros vacíos', () => {
      TestBed.inject(AdminService).trips({ status: 'completed', driver_id: '', client_id: 2, date: '' }).subscribe();
      http.expectOne(`${API}/admin/trips?status=completed&client_id=2`).flush({ trips: [] });
    });

    it('FE-24 approval usa PATCH con approval_status y admin_notes', () => {
      TestBed.inject(AdminService).setApproval(3, 'approved', 'Documentación verificada').subscribe();
      const req = http.expectOne(`${API}/admin/drivers/3/approval`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ approval_status: 'approved', admin_notes: 'Documentación verificada' });
      req.flush({});
    });

    it('FE-25 unwrapList acepta arreglo simple o paginado', () => {
      expect(unwrapList([1, 2])).toEqual([1, 2]);
      expect(unwrapList({ data: [3] })).toEqual([3]);
      expect(unwrapList(null)).toEqual([]);
    });
  });

  it('FE-26 la URL del servidor se puede cambiar (IP del backend) y se guarda', () => {
    const config = TestBed.inject(ApiConfigService);
    config.setBaseUrl('http://192.168.1.50:8000/api/');
    expect(config.url('/fares/active')).toBe('http://192.168.1.50:8000/api/fares/active');
    expect(localStorage.getItem('uber.apiUrl')).toBe('http://192.168.1.50:8000/api');
  });
});
