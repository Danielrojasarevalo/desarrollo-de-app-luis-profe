import { HttpErrorResponse } from '@angular/common/http';
import { Component, ViewChild, computed, inject, signal } from '@angular/core';
import { ToastController } from '@ionic/angular/lazy';
import { Subscription, filter, interval, startWith, switchMap } from 'rxjs';

import { DEFAULT_CENTER, PLACES } from '../../core/data/places';
import {
  ApprovalStatus, Availability, Coordinates, PendingRequest, Trip,
} from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth.service';
import { DriverService } from '../../core/services/driver.service';
import { apiErrorMessage } from '../../core/utils/format';
import { bearingDeg, haversineKm, stepTowards } from '../../core/utils/geo';
import { RouteMapComponent } from '../../shared/components/route-map/route-map.component';

export const REQUESTS_INTERVAL_MS = 5000;
export const GPS_INTERVAL_MS = 3000;
// En simulación el carro avanza 50 m cada 3 s (= 60 km/h), rápido para la demo pero creíble.
const SIM_STEP_KM = 0.05;
const TRIP_KEY = 'uber.driverTrip';
const EARNINGS_KEY = 'uber.driverEarnings';

type GpsMode = 'sim' | 'real';

// Viaje en curso del conductor + coordenadas de la solicitud (para el mapa y la simulación).
export interface CurrentTrip {
  trip: Trip;
  request: PendingRequest;
  origin: Coordinates | null;
  destination: Coordinates | null;
  travelledKm: number;
}

/*
 * PÁGINA DEL CONDUCTOR (/driver)
 *  - Perfil: estado de aprobación, rating y vehículo (GET /auth/me)
 *  - Interruptor "Disponible" ................ PUT  /driver/availability (403 si no está aprobado)
 *  - Solicitudes pendientes cada 5 s ......... GET  /driver/ride-requests
 *  - Aceptar (manejo del 409 Conflict) ........ POST /driver/ride-requests/{id}/accept
 *  - Llegué / Iniciar / Finalizar ............. POST /driver/trips/{id}/arrive|start|complete
 *  - Transmisión GPS en vivo cada 3 s .......... POST /driver/location
 *    Modo "Simulación" mueve el carro hacia la recogida/destino; modo "GPS Real" usa el del celular.
 *  - Resumen de ingresos del día (guardado en el dispositivo)
 */
@Component({
  selector: 'app-driver',
  templateUrl: './driver.page.html',
  styleUrls: ['./driver.page.scss'],
  standalone: false,
})
export class DriverPage {
  private readonly auth = inject(AuthService);
  private readonly driver = inject(DriverService);
  private readonly toast = inject(ToastController);

  @ViewChild(RouteMapComponent) private map?: RouteMapComponent;

  // ===== Perfil y disponibilidad =====
  readonly user = this.auth.user;
  readonly approval = signal<ApprovalStatus | null>(this.auth.user()?.driver?.approval_status ?? null);
  readonly availability = signal<Availability>(this.auth.user()?.driver?.availability_status ?? 'unavailable');
  readonly vehicle = computed(() => this.user()?.driver?.vehicles?.[0] ?? null);
  readonly banner = signal<string | null>(null);

  // ===== Solicitudes y viaje =====
  readonly requests = signal<PendingRequest[]>([]);
  // Las llaves de localStorage llevan el id del conductor: si otro conductor entra
  // en el mismo celular no ve el viaje ni los ingresos del anterior.
  private readonly tripKey = `${TRIP_KEY}.${this.auth.user()?.id}`;
  private readonly earningsKey = `${EARNINGS_KEY}.${this.auth.user()?.id}`;
  readonly current = signal<CurrentTrip | null>(readTrip(this.tripKey));
  readonly busy = signal(false);
  readonly earnings = signal(readEarnings(this.earningsKey));

  // ===== GPS =====
  readonly position = signal<Coordinates>(DEFAULT_CENTER);
  readonly speedKmh = signal(0);
  readonly heading = signal(0);
  readonly gpsMode = signal<GpsMode>('sim');
  readonly transmitting = signal(false);
  readonly lastSent = signal<Date | null>(null);

  // Hacia dónde se mueve el carro: a la recogida si está asignado, al destino si va en viaje.
  readonly target = computed<Coordinates | null>(() => {
    const c = this.current();
    if (!c) {
      return null;
    }
    return c.trip.status === 'in_progress' ? c.destination : c.origin;
  });

  private requestsSub?: Subscription;
  private gpsSub?: Subscription;
  private watchId: number | null = null;

  // ===== Ciclo de vida de Ionic =====
  ionViewWillEnter(): void {
    // Refresca el perfil para conocer aprobación, rating y vehículo.
    this.auth.me().subscribe({
      next: (u) => {
        if (u.driver) {
          this.approval.set(u.driver.approval_status);
          this.availability.set(u.driver.availability_status ?? this.availability());
        }
      },
      error: () => undefined,
    });
    const origin = this.current()?.origin;
    if (origin) {
      this.position.set(origin);
    }
    this.startRequestsPolling();
  }

  ionViewWillLeave(): void {
    this.requestsSub?.unsubscribe();
    this.stopGps();
  }

  // ===== Disponibilidad =====
  toggleAvailability(checked: boolean, toggle?: { checked: boolean }): void {
    const next: Availability = checked ? 'available' : 'unavailable';
    this.driver.setAvailability(next).subscribe({
      next: (status) => {
        this.availability.set(status);
        this.approval.set(this.approval() ?? 'approved');
        this.showBanner(`Disponibilidad cambiada a: ${status === 'available' ? 'En línea' : 'Desconectado'}`);
        if (status === 'available') {
          this.loadRequests();
        } else {
          this.requests.set([]);
        }
      },
      error: (err) => {
        // 403: el backend dice por qué (ej. approval_status: pending) y el toggle vuelve a apagado.
        this.availability.set('unavailable');
        if (toggle) {
          toggle.checked = false;
        }
        if (err instanceof HttpErrorResponse && err.status === 403 && err.error?.approval_status) {
          this.approval.set(err.error.approval_status);
        }
        this.notify(apiErrorMessage(err), 'danger');
      },
    });
  }

  // ===== Solicitudes =====
  loadRequests(): void {
    this.driver.pendingRequests().subscribe({ next: (r) => this.requests.set(r), error: () => undefined });
  }

  accept(req: PendingRequest): void {
    this.busy.set(true);
    this.driver.accept(req.id).subscribe({
      next: (trip) => {
        this.busy.set(false);
        const origin = coordsOf(req, 'origin');
        this.setCurrent({ trip, request: req, origin, destination: coordsOf(req, 'destination'), travelledKm: 0 });
        this.requests.set([]);
        this.notify('Servicio aceptado. Dirígete al punto de recogida.', 'success');
        // Arranca la simulación unas cuadras antes del punto de recogida para que se vea el recorrido.
        if (origin && this.gpsMode() === 'sim') {
          this.position.set({ latitude: origin.latitude - 0.006, longitude: origin.longitude - 0.004 });
        }
        this.startGps();
      },
      error: (err) => {
        this.busy.set(false);
        // 409: otro conductor ganó la carrera (bloqueo lockForUpdate en el backend).
        this.notify(apiErrorMessage(err), err instanceof HttpErrorResponse && err.status === 409 ? 'warning' : 'danger');
        this.loadRequests();
      },
    });
  }

  // ===== Flujo del viaje =====
  arrive(): void {
    this.tripStep((id) => this.driver.arrive(id), 'Llegada registrada. El cliente fue notificado.');
  }

  start(): void {
    this.tripStep((id) => this.driver.start(id), 'Viaje iniciado. ¡Buen camino!');
  }

  complete(): void {
    const c = this.current();
    if (!c) {
      return;
    }
    // Distancia real: lo recorrido en la simulación o, si no hubo, la distancia de la ruta.
    const routeKm = c.origin && c.destination ? haversineKm(c.origin, c.destination) : c.request.estimated_distance_km;
    const km = Math.round(Math.max(c.travelledKm, routeKm) * 100) / 100;
    const startedAt = c.trip.started_at ? new Date(c.trip.started_at).getTime() : Date.now();
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));

    this.busy.set(true);
    this.driver.complete(c.trip.id, km, minutes).subscribe({
      next: (trip) => {
        this.busy.set(false);
        this.addEarning(trip.final_fare ?? c.trip.estimated_fare ?? 0);
        this.setCurrent(null);
        this.stopGps();
        this.availability.set('available');
        this.notify(`Viaje finalizado. Tarifa: $${(trip.final_fare ?? 0).toLocaleString('es-CO')} COP`, 'success');
        this.loadRequests();
      },
      error: (err) => this.fail(err),
    });
  }

  // ===== GPS en vivo =====
  setGpsMode(mode: unknown): void {
    this.gpsMode.set(mode === 'real' ? 'real' : 'sim');
    if (this.transmitting()) {
      this.startGps();
    }
  }

  toggleGps(): void {
    if (this.transmitting()) {
      this.stopGps();
    } else {
      this.startGps();
    }
  }

  centerMap(): void {
    this.map?.centerOn(this.position());
  }

  private startGps(): void {
    this.stopGps();
    this.transmitting.set(true);
    if (this.gpsMode() === 'real') {
      this.watchRealGps();
    }
    this.gpsSub = interval(GPS_INTERVAL_MS).subscribe(() => {
      if (this.gpsMode() === 'sim') {
        this.simulateStep();
      }
      this.sendPosition();
    });
  }

  private stopGps(): void {
    this.gpsSub?.unsubscribe();
    this.gpsSub = undefined;
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.transmitting.set(false);
    this.speedKmh.set(0);
  }

  private watchRealGps(): void {
    if (!('geolocation' in navigator)) {
      this.notify('GPS no disponible; se usa la simulación.', 'warning');
      this.gpsMode.set('sim');
      return;
    }
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.position.set({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        this.speedKmh.set(Math.round((pos.coords.speed ?? 0) * 3.6 * 10) / 10);
        this.heading.set(pos.coords.heading ?? 0);
      },
      (err) => this.notify(`GPS: ${err.message}`, 'warning'),
      { enableHighAccuracy: true },
    );
  }

  private simulateStep(): void {
    const target = this.target();
    if (!target) {
      this.speedKmh.set(0);
      return;
    }
    const from = this.position();
    const next = stepTowards(from, target, SIM_STEP_KM);
    const moved = haversineKm(from, next);
    this.heading.set(bearingDeg(from, next));
    // velocidad = distancia / tiempo (km / horas)
    this.speedKmh.set(Math.round((moved / (GPS_INTERVAL_MS / 3600000)) * 10) / 10);
    this.position.set(next);
    const c = this.current();
    if (c?.trip.status === 'in_progress') {
      this.setCurrent({ ...c, travelledKm: c.travelledKm + moved });
    }
  }

  private sendPosition(): void {
    const p = this.position();
    this.driver.sendLocation({
      latitude: round(p.latitude),
      longitude: round(p.longitude),
      heading: this.heading(),
      speed: this.speedKmh(),
      trip_id: this.current()?.trip.id,
    }).subscribe({ next: () => this.lastSent.set(new Date()), error: () => undefined });
  }

  // ===== Utilidades =====
  private startRequestsPolling(): void {
    this.requestsSub?.unsubscribe();
    // Solo se consulta si está en línea y sin viaje en curso (si no, el backend respondería 403/400).
    this.requestsSub = interval(REQUESTS_INTERVAL_MS)
      .pipe(
        startWith(0),
        filter(() => this.availability() === 'available' && !this.current()),
        switchMap(() => this.driver.pendingRequests()),
      )
      .subscribe({ next: (r) => this.requests.set(r), error: () => undefined });
  }

  private tripStep(action: (id: number) => ReturnType<DriverService['arrive']>, message: string): void {
    const c = this.current();
    if (!c) {
      return;
    }
    this.busy.set(true);
    action(c.trip.id).subscribe({
      next: (trip) => {
        this.busy.set(false);
        this.setCurrent({ ...c, trip: { ...c.trip, ...trip } });
        this.notify(message, 'success');
      },
      error: (err) => this.fail(err),
    });
  }

  private setCurrent(value: CurrentTrip | null): void {
    this.current.set(value);
    try {
      if (value) {
        localStorage.setItem(this.tripKey, JSON.stringify(value));
      } else {
        localStorage.removeItem(this.tripKey);
      }
    } catch {
      /* sin persistencia */
    }
  }

  private addEarning(amount: number): void {
    const today = new Date().toDateString();
    const prev = this.earnings();
    const next = prev.date === today
      ? { date: today, total: prev.total + amount, trips: prev.trips + 1 }
      : { date: today, total: amount, trips: 1 };
    this.earnings.set(next);
    try {
      localStorage.setItem(this.earningsKey, JSON.stringify(next));
    } catch {
      /* sin persistencia */
    }
  }

  private showBanner(text: string): void {
    this.banner.set(text);
    setTimeout(() => this.banner.set(null), 2500);
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

// Coordenadas de la solicitud; si el backend no las envía se buscan por el nombre del lugar.
export function coordsOf(req: PendingRequest, kind: 'origin' | 'destination'): Coordinates | null {
  const lat = req[`${kind}_latitude`];
  const lon = req[`${kind}_longitude`];
  if (lat != null && lon != null) {
    return { latitude: lat, longitude: lon };
  }
  const name = req[`${kind}_name`];
  const place = PLACES.find((p) => p.name.startsWith(name) || name.startsWith(p.name.split(',')[0]));
  return place ? { latitude: place.latitude, longitude: place.longitude } : null;
}

function readTrip(key: string): CurrentTrip | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as CurrentTrip) : null;
  } catch {
    return null;
  }
}

function readEarnings(key: string): { date: string; total: number; trips: number } {
  const empty = { date: new Date().toDateString(), total: 0, trips: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
    return saved?.date === empty.date ? saved : empty;
  } catch {
    return empty;
  }
}

function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
