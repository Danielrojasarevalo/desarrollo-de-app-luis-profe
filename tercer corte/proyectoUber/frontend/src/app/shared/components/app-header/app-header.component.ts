import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

/*
 * ENCABEZADO DE LAS PANTALLAS CON SESIÓN
 * Barra verde con el título ("Uber Verde · Cliente") y botón "Cerrar sesión",
 * y debajo la tarjeta del usuario con su rol (como en el video: "ROL: CLIENT").
 */
@Component({
  selector: 'app-header',
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.scss'],
  standalone: false,
})
export class AppHeaderComponent {
  @Input() section = '';

  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    // Se navega al terminar la petición (éxito o error); clearSession ya se hizo en finalize.
    this.auth.logout().subscribe({
      complete: () => this.router.navigateByUrl('/login', { replaceUrl: true }),
      error: () => this.router.navigateByUrl('/login', { replaceUrl: true }),
    });
  }
}
