import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular/lazy';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TEST_ACCOUNTS } from '../../core/data/places';
import { LoginPage } from './login.page';
import { LoginPageModule } from './login.module';

const API = 'http://127.0.0.1:8000/api';

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let page: LoginPage;
  let http: HttpTestingController;
  let toasts: string[];
  let nav: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    localStorage.clear();
    toasts = [];
    // Los toasts de Ionic se reemplazan por un doble que solo guarda el mensaje.
    const toastStub = {
      create: async (opts: { message: string }) => {
        toasts.push(opts.message);
        return { present: async () => undefined };
      },
    };
    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), LoginPageModule],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: ToastController, useValue: toastStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    page = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    // La navegación se espía: en la prueba no existen las páginas /client, /driver ni /admin.
    nav = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('FE-35 muestra las 4 cuentas del "Ingreso Rápido por Rol"', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Ingreso Rápido por Rol');
    for (const acc of TEST_ACCOUNTS) {
      expect(text).toContain(acc.login);
    }
  });

  it('FE-36 "Cargar" llena el formulario sin enviar nada', () => {
    page.loadAccount(TEST_ACCOUNTS[1]);
    expect(page.credentials).toEqual({ login: 'conductor@uber.com', password: 'conductor123' });
    http.expectNone(`${API}/auth/login`);
  });

  it('FE-37 "Entrar" inicia sesión y navega a la pantalla del rol', async () => {
    page.loadAccount(TEST_ACCOUNTS[3], true);
    http.expectOne(`${API}/auth/login`).flush({
      access_token: 'jwt', user: { id: 1, name: 'Admin Uber', email: 'admin@uber.com', role: 'admin' },
    });
    expect(nav).toHaveBeenCalledWith('/admin', { replaceUrl: true });
  });

  it('FE-38 credenciales inválidas muestran el mensaje del backend', async () => {
    page.credentials = { login: 'cliente@uber.com', password: 'mala' };
    page.submitLogin();
    http.expectOne(`${API}/auth/login`).flush(
      { success: false, message: 'Credenciales inválidas. Verifique su correo/teléfono y contraseña.' },
      { status: 401, statusText: 'Unauthorized' },
    );
    await Promise.resolve();
    expect(toasts).toContain('Credenciales inválidas. Verifique su correo/teléfono y contraseña.');
    expect(page.loading()).toBe(false);
  });

  it('FE-39 registro valida en el teléfono antes de llamar al backend', async () => {
    page.form = { ...page.form, name: 'Ana', email: 'ana@x.com', phone: '300', password: '123' };
    page.submitRegister();
    http.expectNone(`${API}/auth/register`);
    await Promise.resolve();
    expect(toasts[0]).toContain('al menos 8');
  });

  it('FE-40 un cliente se registra sin enviar campos de vehículo', () => {
    page.form = { ...page.form, name: 'Ana', email: 'ana@x.com', phone: '3001112233', password: 'password123', role: 'client' };
    page.submitRegister();
    const req = http.expectOne(`${API}/auth/register`);
    expect(req.request.body).toEqual({ name: 'Ana', email: 'ana@x.com', phone: '3001112233', password: 'password123', role: 'client' });
    req.flush({ access_token: 't', user: { id: 9, name: 'Ana', email: 'ana@x.com', role: 'client' } });
    expect(nav).toHaveBeenCalledWith('/client', { replaceUrl: true });
  });
});
