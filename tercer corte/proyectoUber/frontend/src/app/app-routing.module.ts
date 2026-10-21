import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

import { guestGuard, roleGuard } from './core/guards/role.guard';

// RUTAS DE LA APLICACIÓN. Cada página se carga de forma diferida (lazy loading)
// y está protegida por el rol que le corresponde (RBAC del documento).
// - /login  -> inicio de sesión, registro y "Ingreso rápido por rol"
// - /client -> pasajero: solicitar viaje, seguimiento, historial y calificación
// - /driver -> conductor: disponibilidad, solicitudes, viaje y GPS en vivo
// - /admin  -> administrador: métricas, conductores, tarifas, viajes, reportes y auditoría
const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadChildren: () => import('./pages/login/login.module').then((m) => m.LoginPageModule),
  },
  {
    path: 'client',
    canActivate: [roleGuard('client')],
    loadChildren: () => import('./pages/client/client.module').then((m) => m.ClientPageModule),
  },
  {
    path: 'driver',
    canActivate: [roleGuard('driver')],
    loadChildren: () => import('./pages/driver/driver.module').then((m) => m.DriverPageModule),
  },
  {
    path: 'admin',
    canActivate: [roleGuard('admin')],
    loadChildren: () => import('./pages/admin/admin.module').then((m) => m.AdminPageModule),
  },
  { path: '**', redirectTo: 'login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
