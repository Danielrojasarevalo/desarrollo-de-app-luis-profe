import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, map, tap } from 'rxjs';

import {
  AuthResponse, LoginRequest, MessageResponse, RegisterRequest, Role, User,
} from '../models/api.models';
import { ApiConfigService } from './api-config.service';

const TOKEN_KEY = 'uber.token';
const USER_KEY = 'uber.user';

/*
 * AUTENTICACIÓN (sección 3.1 del documento)
 * - Guarda el JWT y el usuario en localStorage para que la sesión sobreviva a un F5.
 * - Expone el usuario como signal: las páginas se redibujan solas cuando cambia.
 * - El interceptor (auth.interceptor.ts) lee token() para mandar "Authorization: Bearer".
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfigService);

  private readonly tokenSignal = signal<string | null>(read(TOKEN_KEY));
  private readonly userSignal = signal<User | null>(parseUser(read(USER_KEY)));

  readonly token = this.tokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly isLoggedIn = computed(() => !!this.tokenSignal() && !!this.userSignal());

  // POST /auth/login  { login, password }  -> 200 con access_token
  login(body: LoginRequest): Observable<User> {
    return this.http.post<AuthResponse>(this.api.url('/auth/login'), body).pipe(
      tap((res) => this.saveSession(res.access_token, res.user)),
      map((res) => res.user),
    );
  }

  // POST /auth/register  -> 201 con access_token (queda logueado de una vez)
  register(body: RegisterRequest): Observable<User> {
    return this.http.post<AuthResponse>(this.api.url('/auth/register'), body).pipe(
      tap((res) => this.saveSession(res.access_token, res.user)),
      map((res) => res.user),
    );
  }

  // GET /auth/me  -> refresca los datos del usuario (ej. estado de aprobación del conductor)
  me(): Observable<User> {
    return this.http.get<{ success: boolean; user: User }>(this.api.url('/auth/me')).pipe(
      map((res) => res.user),
      tap((user) => this.saveSession(this.tokenSignal() ?? '', user)),
    );
  }

  // POST /auth/forgot-password  { email, new_password }
  forgotPassword(email: string, newPassword: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(this.api.url('/auth/forgot-password'), {
      email,
      new_password: newPassword,
    });
  }

  // POST /auth/logout  -> el backend pone el token en lista negra.
  // Aunque falle (token ya vencido) la sesión local se borra igual.
  logout(): Observable<unknown> {
    return this.http.post(this.api.url('/auth/logout'), {}).pipe(finalize(() => this.clearSession()));
  }

  clearSession(): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    remove(TOKEN_KEY);
    remove(USER_KEY);
  }

  // Ruta de inicio de cada rol.
  homeFor(role: Role | undefined): string {
    switch (role) {
      case 'admin':
        return '/admin';
      case 'driver':
        return '/driver';
      case 'client':
        return '/client';
      default:
        return '/login';
    }
  }

  private saveSession(token: string, user: User): void {
    this.tokenSignal.set(token);
    this.userSignal.set(user);
    write(TOKEN_KEY, token);
    write(USER_KEY, JSON.stringify(user));
  }
}

// localStorage puede lanzar error (modo privado); por eso se envuelve en try/catch.
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* sin persistencia */
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* nada que borrar */
  }
}

function parseUser(raw: string | null): User | null {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}
