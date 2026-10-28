import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { apiErrorMessage, formatCop, starIcons, statusTone } from './format';

describe('mensajes de error y formato', () => {
  it('FE-07 status 0 indica que el backend no responde', () => {
    const err = new HttpErrorResponse({ status: 0 });
    expect(apiErrorMessage(err)).toContain('No se pudo conectar');
  });

  it('FE-08 un 422 de Laravel muestra el primer error de validación', () => {
    const err = new HttpErrorResponse({
      status: 422,
      error: { message: 'Los datos enviados no son válidos.', errors: { email: ['El correo ya está registrado.'] } },
    });
    expect(apiErrorMessage(err)).toBe('El correo ya está registrado.');
  });

  it('FE-09 un 409 muestra el mensaje del backend (carrera entre conductores)', () => {
    const err = new HttpErrorResponse({
      status: 409,
      error: { success: false, message: 'Lo sentimos, este servicio ya fue tomado por otro conductor o fue cancelado.' },
    });
    expect(apiErrorMessage(err)).toBe('Lo sentimos, este servicio ya fue tomado por otro conductor o fue cancelado.');
  });

  it('FE-10 sin mensaje en el cuerpo usa el texto de la tabla de códigos', () => {
    expect(apiErrorMessage(new HttpErrorResponse({ status: 403, error: null }))).toBe('No tienes permiso para esta acción.');
  });

  it('FE-11 formatea pesos colombianos y colores de estado', () => {
    expect(formatCop(6500)).toBe('$6.500 COP');
    expect(formatCop(null)).toBe('—');
    expect(statusTone('requested')).toBe('warn');
    expect(statusTone('cancelled')).toBe('bad');
    expect(statusTone('completed')).toBe('');
  });

  it('FE-46 convierte el promedio en 5 estrellas (llenas, media y vacías)', () => {
    expect(starIcons(5)).toEqual(['star', 'star', 'star', 'star', 'star']);
    expect(starIcons(4.5)).toEqual(['star', 'star', 'star', 'star', 'star-half']);
    expect(starIcons(3.2)).toEqual(['star', 'star', 'star', 'star-outline', 'star-outline']);
    expect(starIcons(null)).toEqual(Array(5).fill('star-outline'));
  });
});
