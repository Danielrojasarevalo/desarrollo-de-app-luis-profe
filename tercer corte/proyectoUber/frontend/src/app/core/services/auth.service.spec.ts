import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from './auth.service';

const API = 'http://127.0.0.1:8000/api';
const USER = { id: 2, name: 'Juan Pérez', email: 'cliente@uber.com', role: 'client' as const, status: 'active' };

// HttpTestingController intercepta las peticiones: así se prueba la URL, el método
// y el cuerpo exactos que se enviarían al backend Laravel, sin necesitar el servidor.
describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('FE-12 login envía {login, password} y guarda el token y el usuario', () => {
    let name = '';
    auth.login({ login: 'cliente@uber.com', password: 'cliente123' }).subscribe((u) => (name = u.name));

    const req = http.expectOne(`${API}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ login: 'cliente@uber.com', password: 'cliente123' });
    req.flush({ success: true, message: 'Inicio de sesión exitoso', access_token: 'jwt-123', token_type: 'bearer', expires_in: 3600, user: USER });

    expect(name).toBe('Juan Pérez');
    expect(auth.token()).toBe('jwt-123');
    expect(auth.isLoggedIn()).toBe(true);
    expect(localStorage.getItem('uber.token')).toBe('jwt-123');
  });

  it('FE-13 la sesión se recupera de localStorage al recargar la página', () => {
    localStorage.setItem('uber.token', 'guardado');
    localStorage.setItem('uber.user', JSON.stringify(USER));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    const fresh = TestBed.inject(AuthService);
    expect(fresh.isLoggedIn()).toBe(true);
    expect(fresh.user()?.email).toBe('cliente@uber.com');
  });

  it('FE-14 logout borra la sesión aunque el backend responda 401', () => {
    auth.login({ login: 'a', password: 'b' }).subscribe();
    http.expectOne(`${API}/auth/login`).flush({ access_token: 't', user: USER });

    auth.logout().subscribe({ error: () => undefined });
    http.expectOne(`${API}/auth/logout`).flush({ message: 'Token expirado' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('uber.token')).toBeNull();
  });

  it('FE-15 forgot-password envía email y new_password', () => {
    auth.forgotPassword('cliente@uber.com', 'nuevaClaveSegura123').subscribe();
    const req = http.expectOne(`${API}/auth/forgot-password`);
    expect(req.request.body).toEqual({ email: 'cliente@uber.com', new_password: 'nuevaClaveSegura123' });
    req.flush({ success: true, message: 'ok' });
  });

  it('FE-16 homeFor envía cada rol a su pantalla', () => {
    expect(auth.homeFor('client')).toBe('/client');
    expect(auth.homeFor('driver')).toBe('/driver');
    expect(auth.homeFor('admin')).toBe('/admin');
    expect(auth.homeFor(undefined)).toBe('/login');
  });
});
