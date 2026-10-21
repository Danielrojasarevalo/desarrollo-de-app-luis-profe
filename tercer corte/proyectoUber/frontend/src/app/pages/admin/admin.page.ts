import { Component, inject, signal } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular/lazy';

import { AdminDriver, ApprovalStatus, Fare, Trip, TripFilters } from '../../core/models/api.models';
import { AdminService, DashboardResponse } from '../../core/services/admin.service';
import { apiErrorMessage } from '../../core/utils/format';

type Tab = 'dashboard' | 'drivers' | 'fares' | 'trips' | 'reports' | 'audit';

/*
 * PÁGINA DEL ADMINISTRADOR (/admin)
 * Pestañas (ion-segment):
 *  - Panel ......... GET   /admin/dashboard (KPIs, viajes e incidencias recientes)
 *  - Conductores ... GET   /admin/drivers?approval_status=  +  PATCH /admin/drivers/{id}/approval
 *  - Tarifas ....... GET / POST /admin/fares
 *  - Viajes ........ GET   /admin/trips?status=&driver_id=&client_id=&date=
 *  - Reportes ...... GET   /admin/reports
 *  - Auditoría ..... GET   /admin/audit-logs
 * Cada pestaña carga sus datos la primera vez que se abre.
 */
@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: false,
})
export class AdminPage {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastController);
  private readonly alerts = inject(AlertController);

  readonly tab = signal<Tab>('dashboard');
  readonly loading = signal(false);

  readonly dashboard = signal<DashboardResponse | null>(null);
  readonly drivers = signal<AdminDriver[]>([]);
  readonly fares = signal<Fare[]>([]);
  readonly trips = signal<Trip[]>([]);
  readonly reports = signal<Record<string, unknown> | null>(null);
  readonly logs = signal<Record<string, unknown>[]>([]);

  driverFilter: ApprovalStatus | '' = '';
  tripFilters: TripFilters = { status: '', driver_id: '', client_id: '', date: '' };
  newFare: Fare = emptyFare();

  // Tarjetas del panel: etiqueta + campo de stats + ícono
  readonly kpis = [
    { key: 'total_clients', label: 'Clientes', icon: 'people' },
    { key: 'total_drivers', label: 'Conductores', icon: 'car-sport' },
    { key: 'pending_drivers', label: 'Por aprobar', icon: 'time' },
    { key: 'approved_drivers', label: 'Aprobados', icon: 'checkmark-circle' },
    { key: 'active_trips', label: 'Viajes activos', icon: 'navigate' },
    { key: 'completed_trips', label: 'Completados', icon: 'flag' },
    { key: 'cancelled_trips', label: 'Cancelados', icon: 'close-circle' },
    { key: 'pending_requests', label: 'Solicitudes', icon: 'trail-sign' },
  ] as const;

  ionViewWillEnter(): void {
    this.load(this.tab());
  }

  setTab(value: unknown): void {
    const tab = (value as Tab) ?? 'dashboard';
    this.tab.set(tab);
    this.load(tab);
  }

  load(tab: Tab): void {
    this.loading.set(true);
    const done = () => this.loading.set(false);
    const fail = (err: unknown) => {
      done();
      this.notify(apiErrorMessage(err), 'danger');
    };

    switch (tab) {
      case 'dashboard':
        this.admin.dashboard().subscribe({ next: (d) => { this.dashboard.set(d); done(); }, error: fail });
        break;
      case 'drivers':
        this.admin.drivers(this.driverFilter).subscribe({ next: (d) => { this.drivers.set(d); done(); }, error: fail });
        break;
      case 'fares':
        this.admin.fares().subscribe({ next: (f) => { this.fares.set(f); done(); }, error: fail });
        break;
      case 'trips':
        this.admin.trips(this.tripFilters).subscribe({ next: (t) => { this.trips.set(t); done(); }, error: fail });
        break;
      case 'reports':
        this.admin.reports().subscribe({ next: (r) => { this.reports.set(r); done(); }, error: fail });
        break;
      case 'audit':
        this.admin.auditLogs().subscribe({ next: (l) => { this.logs.set(l); done(); }, error: fail });
        break;
    }
  }

  // PATCH /admin/drivers/{id}/approval (pide una nota antes de enviar)
  async changeApproval(driver: AdminDriver, status: ApprovalStatus): Promise<void> {
    const labels: Record<string, string> = { approved: 'Aprobar', suspended: 'Suspender', rejected: 'Rechazar' };
    const alert = await this.alerts.create({
      header: `${labels[status]} a ${driver.user.name}`,
      inputs: [{ name: 'notes', type: 'textarea', placeholder: 'Notas del administrador', value: status === 'approved' ? 'Documentación de SOAT y licencia verificada.' : '' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: labels[status],
          handler: (data: { notes: string }) => {
            this.admin.setApproval(driver.id, status, data.notes ?? '').subscribe({
              next: () => {
                this.notify(`Conductor actualizado a: ${status}`, 'success');
                this.load('drivers');
              },
              error: (err) => this.notify(apiErrorMessage(err), 'danger'),
            });
          },
        },
      ],
    });
    await alert.present();
  }

  // POST /admin/fares
  createFare(): void {
    const f = this.newFare;
    if (!f.name || f.base_fare <= 0 || f.minimum_fare <= 0 || f.surge_multiplier <= 0) {
      this.notify('Completa el nombre y valores mayores a cero.', 'warning');
      return;
    }
    const body: Fare = {
      ...f,
      base_fare: Number(f.base_fare),
      price_per_km: Number(f.price_per_km),
      price_per_minute: Number(f.price_per_minute),
      minimum_fare: Number(f.minimum_fare),
      surge_multiplier: Number(f.surge_multiplier),
    };
    this.admin.createFare(body).subscribe({
      next: () => {
        this.notify('Tarifa configurada exitosamente', 'success');
        this.newFare = emptyFare();
        this.load('fares');
      },
      error: (err) => this.notify(apiErrorMessage(err), 'danger'),
    });
  }

  clearTripFilters(): void {
    this.tripFilters = { status: '', driver_id: '', client_id: '', date: '' };
    this.load('trips');
  }

  // ===== Ayudas para mostrar datos con formato desconocido (reportes, auditoría) =====
  statValue(key: string): number {
    const stats = this.dashboard()?.stats as unknown as Record<string, number> | undefined;
    return stats?.[key] ?? 0;
  }

  entries(obj: unknown): { key: string; value: unknown; nested: boolean }[] {
    if (!obj || typeof obj !== 'object') {
      return [];
    }
    return Object.entries(obj as Record<string, unknown>)
      .filter(([key]) => key !== 'success')
      .map(([key, value]) => ({ key, value, nested: value !== null && typeof value === 'object' }));
  }

  humanize(key: string): string {
    const text = key.replace(/_/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  logTitle(log: Record<string, unknown>): string {
    return String(log['action'] ?? log['event'] ?? log['description'] ?? 'Acción');
  }

  private async notify(message: string, color: string): Promise<void> {
    const t = await this.toast.create({ message, color, duration: 2600, position: 'top' });
    await t.present();
  }
}

function emptyFare(): Fare {
  return {
    name: '', base_fare: 3800, price_per_km: 1250, price_per_minute: 250,
    minimum_fare: 6500, surge_multiplier: 1, active: true,
  };
}
