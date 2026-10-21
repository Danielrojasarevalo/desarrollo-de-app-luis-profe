import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { Availability, LocationUpdate, PendingRequest, Trip } from '../models/api.models';
import { ApiConfigService } from './api-config.service';

/*
 * MÓDULO CONDUCTOR (sección 3.4)
 * Flujo de un viaje: accept -> arrive -> start -> complete.
 */
@Injectable({ providedIn: 'root' })
export class DriverService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfigService);

  // PUT /driver/availability  -> 403 si el conductor no está aprobado
  setAvailability(status: Availability): Observable<Availability> {
    return this.http
      .put<{ success: boolean; availability_status: Availability }>(this.api.url('/driver/availability'), { status })
      .pipe(map((r) => r.availability_status));
  }

  // GET /driver/ride-requests
  pendingRequests(): Observable<PendingRequest[]> {
    return this.http
      .get<{ success: boolean; requests: PendingRequest[] }>(this.api.url('/driver/ride-requests'))
      .pipe(map((r) => r.requests));
  }

  // POST /driver/ride-requests/{id}/accept  -> 409 si otro conductor lo tomó primero
  accept(requestId: number): Observable<Trip> {
    return this.tripAction(`/driver/ride-requests/${requestId}/accept`);
  }

  // POST /driver/trips/{id}/arrive
  arrive(tripId: number): Observable<Trip> {
    return this.tripAction(`/driver/trips/${tripId}/arrive`);
  }

  // POST /driver/trips/{id}/start
  start(tripId: number): Observable<Trip> {
    return this.tripAction(`/driver/trips/${tripId}/start`);
  }

  // POST /driver/trips/{id}/complete  { actual_distance_km, actual_duration_min }
  complete(tripId: number, actualDistanceKm: number, actualDurationMin: number): Observable<Trip> {
    return this.tripAction(`/driver/trips/${tripId}/complete`, {
      actual_distance_km: actualDistanceKm,
      actual_duration_min: actualDurationMin,
    });
  }

  // POST /driver/location
  sendLocation(body: LocationUpdate): Observable<unknown> {
    return this.http.post(this.api.url('/driver/location'), body);
  }

  private tripAction(path: string, body: object = {}): Observable<Trip> {
    return this.http.post<{ success: boolean; trip: Trip }>(this.api.url(path), body).pipe(map((r) => r.trip));
  }
}
