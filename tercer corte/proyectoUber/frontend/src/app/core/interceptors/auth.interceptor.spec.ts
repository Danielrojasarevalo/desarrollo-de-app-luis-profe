import { environment } from '../../../environments/environment';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

const USER = { id: 2, name: 'Juan', email: 'cliente@uber.com', role: 'client' as const };

describe('authInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => ctrl.verify());

  function loginAs(): AuthService {
    const auth = TestBed.inject(AuthService);
    auth.login({ login: 'x', password: 'y' }).subscribe();
    ctrl.expectOne(`${environment.apiUrl}/auth/login`).flush({ access_token: 'jwt-abc', user: USER });
    return auth;
  }

  it('FE-27 sin sesión solo agrega Accept: application/json', () => {
    http.get('/api/fares/active').subscribe();
    const req = ctrl.expectOne('/api/fares/active');
    expect(req.request.headers.get('Accept')).toBe('application/json');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('FE-28 con sesión agrega Authorization: Bearer <token>', () => {
    loginAs();
    http.get('/api/client/active').subscribe();
    const req = ctrl.expectOne('/api/client/active');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-abc');
    req.flush({});
  });

  it('FE-29 un 401 borra la sesión y redirige a /login', () => {
    const auth = loginAs();
    const nav = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    http.get('/api/client/trips').subscribe({ error: () => undefined });
    ctrl.expectOne('/api/client/trips').flush({ message: 'Token expirado' }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.isLoggedIn()).toBe(false);
    expect(nav).toHaveBeenCalledWith('/login');
  });

  it('FE-30 un 401 en /auth/login (clave mala) NO redirige', () => {
    const nav = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    http.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    ctrl.expectOne('/api/auth/login').flush({ message: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });
    expect(nav).not.toHaveBeenCalled();
  });
});
