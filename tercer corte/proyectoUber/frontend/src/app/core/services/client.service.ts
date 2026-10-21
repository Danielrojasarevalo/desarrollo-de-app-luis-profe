import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import {
  ActiveResponse, EstimateRequest, Fare, FareEstimate, MessageResponse, Rating,
  RatingRequest, RideRequest, RideRequestBody, Trip,
} from '../models/api.models';
import { ApiConfigService } from './api-config.service';

/*
 * MÓDULO CLIENTE (secciones 3.2 y 3.3)
 * Todos los métodos devuelven Observables; la página se suscribe y muestra el resultado.
 * El token lo agrega el interceptor, por eso aquí no aparece "Authorization".
 */
@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfigService);

  // GET /fares/active (pública)
  activeFare(): Observable<Fare> {
    return this.http.get<{ success: boolean; fare: Fare }>(this.api.url('/fares/active')).pipe(map((r) => r.fare));
  }

  // POST /client/estimate-fare
  estimateFare(body: EstimateRequest): Observable<FareEstimate> {
    return this.http
      .post<{ success: boolean; estimate: FareEstimate }>(this.api.url('/client/estimate-fare'), body)
      .pipe(map((r) => r.estimate));
  }

  // POST /client/ride-requests  -> 201, o 400 si ya hay un viaje activo
  requestRide(body: RideRequestBody): Observable<RideRequest> {
    return this.http
      .post<{ success: boolean; ride_request: RideRequest }>(this.api.url('/client/ride-requests'), body)
      .pipe(map((r) => r.ride_request));
  }

  // GET /client/active  -> se consulta cada pocos segundos para "seguimiento en tiempo real"
  active(): Observable<ActiveResponse> {
    return this.http.get<ActiveResponse>(this.api.url('/client/active'));
  }

  // POST /client/cancel/{id}
  cancel(id: number, reason: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(this.api.url(`/client/cancel/${id}`), { reason });
  }

  // GET /client/trips  (paginado: los viajes vienen en trips.data)
  trips(): Observable<Trip[]> {
    return this.http
      .get<{ success: boolean; trips: { data: Trip[] } }>(this.api.url('/client/trips'))
      .pipe(map((r) => r.trips.data));
  }

  // POST /client/trips/{id}/rating
  rate(tripId: number, body: RatingRequest): Observable<Rating> {
    return this.http
      .post<{ success: boolean; rating: Rating }>(this.api.url(`/client/trips/${tripId}/rating`), body)
      .pipe(map((r) => r.rating));
  }
}
