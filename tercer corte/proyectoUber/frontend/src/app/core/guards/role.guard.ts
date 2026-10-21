import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Role } from '../models/api.models';
import { AuthService } from '../services/auth.service';

/*
 * GUARD POR ROL (RBAC en el frontend)
 * - Sin sesión -> /login
 * - Con sesión pero otro rol -> a la pantalla de su propio rol
 * El backend igual valida el rol (403); esto solo evita mostrar pantallas que no aplican.
 */
export function roleGuard(role: Role): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.user();

    if (!auth.isLoggedIn() || !user) {
      return router.parseUrl('/login');
    }
    return user.role === role ? true : router.parseUrl(auth.homeFor(user.role));
  };
}

// En /login: si ya hay sesión se salta directo a la pantalla del rol.
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const user = auth.user();
  return auth.isLoggedIn() && user ? inject(Router).parseUrl(auth.homeFor(user.role)) : true;
};
