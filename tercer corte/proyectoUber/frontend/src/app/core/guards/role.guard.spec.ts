import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { Role } from '../models/api.models';
import { guestGuard, roleGuard } from './role.guard';

function runGuard(guard: ReturnType<typeof roleGuard>): boolean | UrlTree {
  return TestBed.runInInjectionContext(
    () => guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as boolean | UrlTree,
  );
}

function setSession(role: Role | null): void {
  localStorage.clear();
  if (role) {
    localStorage.setItem('uber.token', 't');
    localStorage.setItem('uber.user', JSON.stringify({ id: 1, name: 'X', email: 'x@x.com', role }));
  }
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
}

describe('guards de rol', () => {
  beforeEach(() => setSession(null));

  it('FE-31 sin sesión, /client redirige a /login', () => {
    expect(String(runGuard(roleGuard('client')))).toBe('/login');
  });

  it('FE-32 un cliente puede entrar a /client', () => {
    setSession('client');
    expect(runGuard(roleGuard('client'))).toBe(true);
  });

  it('FE-33 un conductor que intenta /admin es enviado a /driver', () => {
    setSession('driver');
    expect(String(runGuard(roleGuard('admin')))).toBe('/driver');
  });

  it('FE-34 con sesión abierta, /login salta a la pantalla del rol', () => {
    setSession('admin');
    expect(String(runGuard(guestGuard))).toBe('/admin');
  });
});
