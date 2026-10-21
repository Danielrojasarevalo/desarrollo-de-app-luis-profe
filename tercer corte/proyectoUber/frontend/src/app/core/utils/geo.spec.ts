import { describe, expect, it } from 'vitest';

import { Fare } from '../models/api.models';
import { bearingDeg, calculateFare, estimateDurationMin, haversineKm, stepTowards } from './geo';

// Tarifa estándar de API_DOCUMENTATION.md (GET /fares/active)
const STANDARD: Fare = {
  name: 'Tarifa Estándar Urbana', base_fare: 3800, price_per_km: 1250, price_per_minute: 250,
  minimum_fare: 6500, surge_multiplier: 1, active: true,
};
const PARQUE_93 = { latitude: 4.6766, longitude: -74.0483 };
const ANDINO = { latitude: 4.6664, longitude: -74.0536 };

describe('utilidades geográficas', () => {
  it('FE-01 Haversine da 1.28 km entre Parque de la 93 y Andino (ejemplo del documento)', () => {
    expect(haversineKm(PARQUE_93, ANDINO)).toBeCloseTo(1.28, 2);
    expect(haversineKm(PARQUE_93, PARQUE_93)).toBe(0);
  });

  it('FE-02 la duración estimada a 20 km/h es 4 min y nunca menos de 1', () => {
    expect(estimateDurationMin(1.28)).toBe(4);
    expect(estimateDurationMin(0)).toBe(1);
  });

  it('FE-03 aplica la tarifa mínima cuando el cálculo es menor (6.400 -> 6.500)', () => {
    expect(calculateFare(STANDARD, 1.28, 4)).toBe(6500);
  });

  it('FE-04 calcula tarifa normal y con multiplicador de hora pico', () => {
    expect(calculateFare(STANDARD, 1.45, 6)).toBe(7113); // 3800 + 1812.5 + 1500
    expect(calculateFare({ ...STANDARD, surge_multiplier: 1.3 }, 5, 15)).toBe(17940); // (3800+6250+3750)·1.3
  });

  it('FE-05 stepTowards avanza la distancia pedida y no se pasa del destino', () => {
    const next = stepTowards(PARQUE_93, ANDINO, 0.5);
    expect(haversineKm(PARQUE_93, next)).toBeCloseTo(0.5, 1);
    expect(stepTowards(PARQUE_93, ANDINO, 10)).toEqual(ANDINO);
  });

  it('FE-06 el rumbo hacia el sur-suroeste está entre 180° y 270°', () => {
    const heading = bearingDeg(PARQUE_93, ANDINO);
    expect(heading).toBeGreaterThan(180);
    expect(heading).toBeLessThan(270);
  });
});
