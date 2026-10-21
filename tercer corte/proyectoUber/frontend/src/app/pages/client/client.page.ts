import { Component, computed, inject, signal } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular/lazy';
import { Subscription, interval, startWith, switchMap } from 'rxjs';

import { PLACES, Place } from '../../core/data/places';
import {
  ActiveResponse, Coordinates, Fare, FareEstimate, RideRequestBody, Trip,
} from '../../core/models/api.models';
import { ClientService } from '../../core/services/client.service';
import { apiErrorMessage } from '../../core/utils/format';
import { calculateFare, estimateDurationMin, haversineKm } from '../../core/utils/geo';

// Cada cuánto se consulta GET /client/active para el seguimiento en tiempo real.
export const TRACKING_INTERVAL_MS = 5000;
const GPS_PLACE_NAME = 'Mi ubicación actual (GPS)';
// Orden de los estados para dibujar la barra de progreso del viaje.
const STEPS = ['requested', 'assigned', 'driver_arrived', 'in_progress'];

/*
 * PÁGINA DEL PASAJERO (/client)
 *  - Mapa con la ruta seleccionada y la ubicación del conductor
 *  - Solicitar viaje: GPS o lugares predefinidos, estimación y confirmación
 *  - Seguimiento del viaje activo cada 5 s (estado, conductor, vehículo)
 *  - Cancelar antes de iniciar el recorrido
 *  - Historial de viajes y calificación de 1 a 5 estrellas
 * El estado se guarda en signals: al cambiar, Angular redibuja sin necesitar zone.js.
 */
@Component({
  selector: 'app-client',
  templateUrl: './client.page.html',
  styleUrls: ['./client.page.scss'],
  standalone: false,
})
export class ClientPage {
  private readonly client = inject(ClientService);
  private readonly toast = inject(ToastController);
  private readonly alerts = inject(AlertController);

  readonly places = PLACES;
  readonly steps = STEPS;

  // ===== Formulario "Solicitar Viaje" =====
  readonly origin = signal<Place>(PLACES[0]);
  readonly destination = signal<Place>(PLACES[1]);
  readonly gpsPoint = signal<Coordinates | null>(null);
  readonly locating = signal(false);
  readonly fare = signal<Fare | null>(null);
  readonly estimate = signal<FareEstimate | null>(null);
  readonly busy = signal(false);

  // ===== Viaje activo e historial =====
  readonly active = signal<ActiveResponse | null>(null);
  readonly trips = signal<Trip[]>([]);
  readonly loadingTrips = signal(false);

  // ===== Calificación =====
  readonly ratingTrip = signal<Trip | null>(null);
  rating = { score: 5, comment: '', has_incident: false };

  private polling?: Subscription;

  // Vista previa calculada en el teléfono con la tarifa pública (antes de llamar al backend).
  readonly preview = computed(() => {
    const fare = this.fare();
    const km = haversineKm(this.origin(), this.destination());
    const min = estimateDurationMin(km);
    return { km, min, value: fare ? calculateFare(fare, km, min) : null };
  });

  // Puntos que se dibujan en el mapa: los del viaje activo o los del formulario.
  readonly mapOrigin = computed<Coordinates | null>(() => {
    const d = this.active()?.data;
    return d?.origin_latitude != null ? { latitude: d.origin_latitude, longitude: d.origin_longitude! } : this.origin();
  });
  readonly mapDestination = computed<Coordinates | null>(() => {
    const d = this.active()?.data;
    return d?.destination_latitude != null
      ? { latitude: d.destination_latitude, longitude: d.destination_longitude! }
      : this.destination();
  });
  readonly driverPoint = computed(() => this.active()?.data?.driver?.latest_location ?? null);

  readonly stepIndex = computed(() => STEPS.indexOf(this.active()?.data?.status ?? ''));
  readonly canCancel = computed(() => ['requested', 'assigned', 'driver_arrived'].includes(this.active()?.data?.status ?? ''));

  // ===== Ciclo de vida de Ionic: se activa al entrar a la página y se detiene al salir =====
  ionViewWillEnter(): void {
    this.client.activeFare().subscribe({ next: (f) => this.fare.set(f), error: () => this.fare.set(null) });
    this.loadTrips();
    this.startTracking();
  }

  ionViewWillLeave(): void {
    this.polling?.unsubscribe();
  }

  // ===== Selección de ruta =====
  selectOrigin(name: string): void {
    const place = PLACES.find((p) => p.name === name);
    if (place) {
      this.origin.set(place);
      this.gpsPoint.set(null);
      this.estimate.set(null);
    }
  }

  selectDestination(name: string): void {
    const place = PLACES.find((p) => p.name === name);
    if (place) {
      this.destination.set(place);
      this.estimate.set(null);
    }
  }

  // "Usar mi ubicación actual (GPS)": usa la geolocalización del navegador/celular como origen.
  useMyLocation(): void {
    if (!('geolocation' in navigator)) {
      this.notify('Este dispositivo no tiene GPS disponible.', 'warning');
      return;
    }
    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point = { latitude: round(pos.coords.latitude), longitude: round(pos.coords.longitude) };
        this.gpsPoint.set(point);
        this.origin.set({ name: GPS_PLACE_NAME, ...point });
        this.estimate.set(null);
        this.locating.set(false);
      },
      (err) => {
        this.locating.set(false);
        this.notify(`No se pudo obtener tu ubicación: ${err.message}`, 'warning');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  // POST /client/estimate-fare
  estimateFare(): void {
    this.busy.set(true);
    this.client.estimateFare(coords(this.origin(), this.destination())).subscribe({
      next: (e) => {
        this.estimate.set(e);
        this.busy.set(false);
      },
      error: (err) => this.fail(err),
    });
  }

  // POST /client/ride-requests
  requestRide(): void {
    if (this.origin().name === this.destination().name) {
      this.notify('El origen y el destino deben ser diferentes.', 'warning');
      return;
    }
    const body: RideRequestBody = {
      origin_name: this.origin().name,
      destination_name: this.destination().name,
      ...coords(this.origin(), this.destination()),
    };
    this.busy.set(true);
    this.client.requestRide(body).subscribe({
      next: () => {
        this.busy.set(false);
        this.estimate.set(null);
        this.notify('Solicitud creada. Buscando conductores disponibles...', 'success');
        this.refreshActive();
      },
      error: (err) => this.fail(err),
    });
  }

  // POST /client/cancel/{id}
  async cancelRide(): Promise<void> {
    const ride = this.active()?.data;
    if (!ride) {
      return;
    }
    const alert = await this.alerts.create({
      header: '¿Cancelar el viaje?',
      inputs: [{ name: 'reason', type: 'text', placeholder: 'Motivo', value: 'Cambio de planes del usuario' }],
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Sí, cancelar',
          role: 'destructive',
          handler: (data: { reason: string }) => {
            this.client.cancel(ride.id, data.reason || 'Sin motivo').subscribe({
              next: (res) => {
                this.notify(res.message, 'success');
                this.refreshActive();
                this.loadTrips();
              },
              error: (err) => this.fail(err),
            });
          },
        },
      ],
    });
    await alert.present();
  }

  // ===== Historial y calificación =====
  loadTrips(): void {
    this.loadingTrips.set(true);
    this.client.trips().subscribe({
      next: (t) => {
        this.trips.set(t);
        this.loadingTrips.set(false);
      },
      error: () => this.loadingTrips.set(false),
    });
  }

  openRating(trip: Trip): void {
    this.rating = { score: 5, comment: '', has_incident: false };
    this.ratingTrip.set(trip);
  }

  setScore(score: number): void {
    this.rating = { ...this.rating, score };
  }

  // POST /client/trips/{id}/rating
  sendRating(): void {
    const trip = this.ratingTrip();
    if (!trip) {
      return;
    }
    this.busy.set(true);
    this.client.rate(trip.id, this.rating).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.ratingTrip.set(null);
        this.trips.update((list) => list.map((t) => (t.id === trip.id ? { ...t, rating: r } : t)));
        this.notify('¡Gracias por calificar tu viaje!', 'success');
      },
      error: (err) => this.fail(err),
    });
  }

  // ===== Seguimiento en tiempo real =====
  refreshActive(): void {
    this.client.active().subscribe({ next: (a) => this.onActive(a), error: () => undefined });
  }

  private startTracking(): void {
    this.polling?.unsubscribe();
    this.polling = interval(TRACKING_INTERVAL_MS)
      .pipe(startWith(0), switchMap(() => this.client.active()))
      .subscribe({ next: (a) => this.onActive(a), error: () => undefined });
  }

  private onActive(a: ActiveResponse): void {
    const before = this.active();
    this.active.set(a.has_active ? a : null);
    // Si antes había viaje y ahora no, terminó (o se canceló): refrescamos el historial.
    if (before?.has_active && !a.has_active) {
      this.loadTrips();
      this.notify('Tu viaje terminó. ¡No olvides calificarlo!', 'success');
    }
  }

  private fail(err: unknown): void {
    this.busy.set(false);
    this.notify(apiErrorMessage(err), 'danger');
  }

  private async notify(message: string, color: string): Promise<void> {
    const t = await this.toast.create({ message, color, duration: 2600, position: 'top' });
    await t.present();
  }
}

function coords(o: Coordinates, d: Coordinates) {
  return {
    origin_latitude: o.latitude,
    origin_longitude: o.longitude,
    destination_latitude: d.latitude,
    destination_longitude: d.longitude,
  };
}

function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
