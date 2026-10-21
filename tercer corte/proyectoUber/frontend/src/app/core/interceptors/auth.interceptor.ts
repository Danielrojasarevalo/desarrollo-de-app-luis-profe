import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

/*
 * INTERCEPTOR JWT
 * Se ejecuta antes de CADA petición HTTP:
 *  1. Agrega Accept: application/json (así Laravel responde errores en JSON y no en HTML).
 *  2. Si hay sesión, agrega "Authorization: Bearer <token>".
 *  3. Si el backend responde 401 (token vencido o inválido) borra la sesión y manda al login.
 *     En /auth/login un 401 solo significa "clave incorrecta", por eso ahí no se redirige.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.token();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return next(req.clone({ setHeaders: headers })).pipe(
    catchError((err: unknown) => {
      const isLoginCall = req.url.endsWith('/auth/login');
      if (err instanceof HttpErrorResponse && err.status === 401 && !isLoginCall && token) {
        auth.clearSession();
        router.navigateByUrl('/login');
      }
      return throwError(() => err);
    }),
  );
};
