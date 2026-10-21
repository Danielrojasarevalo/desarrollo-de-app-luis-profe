import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { AdminDriver, ApprovalStatus, DashboardStats, Fare, Trip, TripFilters } from '../models/api.models';
import { ApiConfigService } from './api-config.service';

export interface DashboardResponse {
  stats: DashboardStats;
  recent_trips: Trip[];
  recent_incidents: Record<string, unknown>[];
}

/*
 * MÓDULO ADMINISTRADOR (sección 3.5)
 * reports y audit-logs no tienen un formato definido en el documento,
 * así que se devuelven como objetos genéricos y la página los muestra tal cual.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfigService);

  // GET /admin/dashboard
  dashboard(): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse & { success: boolean }>(this.api.url('/admin/dashboard')).pipe(
      map((r) => ({ stats: r.stats, recent_trips: r.recent_trips ?? [], recent_incidents: r.recent_incidents ?? [] })),
    );
  }

  // GET /admin/drivers?approval_status=pending
  drivers(approvalStatus?: ApprovalStatus | ''): Observable<AdminDriver[]> {
    const params = approvalStatus ? new HttpParams().set('approval_status', approvalStatus) : undefined;
    return this.http
      .get<{ success: boolean; drivers: AdminDriver[] }>(this.api.url('/admin/drivers'), { params })
      .pipe(map((r) => r.drivers));
  }

  // PATCH /admin/drivers/{id}/approval
  setApproval(driverId: number, approvalStatus: ApprovalStatus, adminNotes: string): Observable<unknown> {
    return this.http.patch(this.api.url(`/admin/drivers/${driverId}/approval`), {
      approval_status: approvalStatus,
      admin_notes: adminNotes,
    });
  }

  // GET /admin/fares
  fares(): Observable<Fare[]> {
    return this.http
      .get<{ success: boolean; fares: Fare[] | { data: Fare[] } }>(this.api.url('/admin/fares'))
      .pipe(map((r) => unwrapList(r.fares)));
  }

  // POST /admin/fares
  createFare(fare: Fare): Observable<Fare> {
    return this.http
      .post<{ success: boolean; fare: Fare }>(this.api.url('/admin/fares'), fare)
      .pipe(map((r) => r.fare));
  }

  // GET /admin/trips?status=&driver_id=&client_id=&date=
  trips(filters: TripFilters = {}): Observable<Trip[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http
      .get<{ success: boolean; trips: Trip[] | { data: Trip[] } }>(this.api.url('/admin/trips'), { params })
      .pipe(map((r) => unwrapList(r.trips)));
  }

  // GET /admin/reports
  reports(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(this.api.url('/admin/reports'));
  }

  // GET /admin/audit-logs
  auditLogs(): Observable<Record<string, unknown>[]> {
    return this.http
      .get<{ logs?: unknown; audit_logs?: unknown }>(this.api.url('/admin/audit-logs'))
      .pipe(map((r) => unwrapList((r.logs ?? r.audit_logs ?? []) as Record<string, unknown>[])));
  }
}

// Laravel puede responder un arreglo simple o uno paginado ({ data: [...] }).
export function unwrapList<T>(value: T[] | { data: T[] } | null | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : value.data ?? [];
}
