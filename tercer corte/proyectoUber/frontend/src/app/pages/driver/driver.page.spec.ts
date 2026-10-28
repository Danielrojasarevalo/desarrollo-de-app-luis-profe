import { describe, expect, it } from 'vitest';

import { DriverTrip, PendingRequest } from '../../core/models/api.models';
import { coordsOf, ratingBars, reviewsOf } from './driver.page';

const BASE: PendingRequest = {
  id: 2,
  origin_name: 'Parque de la 93',
  destination_name: 'Centro Comercial Andino',
  estimated_distance_km: 1.28,
  estimated_fare: 6500,
  client: { name: 'Juan Pérez', phone: '3001234567' },
};

describe('DriverPage · coordenadas de la solicitud', () => {
  it('FE-41 usa las coordenadas que envía el backend', () => {
    const req = { ...BASE, origin_latitude: 4.1, origin_longitude: -74.1 };
    expect(coordsOf(req, 'origin')).toEqual({ latitude: 4.1, longitude: -74.1 });
  });

  it('FE-42 si el backend solo envía el nombre (como en el documento), lo busca en los lugares conocidos', () => {
    expect(coordsOf(BASE, 'origin')).toEqual({ latitude: 4.6766, longitude: -74.0483 });
    expect(coordsOf(BASE, 'destination')).toEqual({ latitude: 4.6664, longitude: -74.0536 });
  });

  it('FE-43 un lugar desconocido devuelve null (el mapa no dibuja ruta)', () => {
    expect(coordsOf({ ...BASE, origin_name: 'Medellín' }, 'origin')).toBeNull();
  });
});

// Forma real de GET /driver/trips en el backend del profesor (un viaje calificado y uno cancelado).
const TRIPS: DriverTrip[] = [
  { id: 2, status: 'cancelled', client: { name: 'Juan Pérez' }, ratings: [] },
  {
    id: 1,
    status: 'completed',
    client: { name: 'Juan Pérez' },
    request: { origin_name: 'Parque de la 93', destination_name: 'Andino' },
    ratings: [{ id: 1, trip_id: 1, score: 5, comment: ' ¡Excelente conductor! ', created_at: '2026-10-20T21:12:53.000000Z' }],
  },
  {
    id: 3,
    status: 'completed',
    client: { name: 'María López' },
    ratings: [{ id: 2, trip_id: 3, score: 3, comment: null, created_at: '2026-10-22T10:00:00.000000Z' }],
  },
];

describe('DriverPage · calificaciones recibidas', () => {
  it('FE-44 junta las calificaciones de todos los viajes, de la más reciente a la más antigua', () => {
    const reviews = reviewsOf(TRIPS);
    expect(reviews.map((r) => r.id)).toEqual([2, 1]);
    expect(reviews[1]).toMatchObject({
      tripId: 1, score: 5, comment: '¡Excelente conductor!', clientName: 'Juan Pérez', initials: 'JP',
      origin: 'Parque de la 93', destination: 'Andino',
    });
    expect(reviews[0].comment).toBe('');
  });

  it('FE-45 cuenta cuántas reseñas hay por estrella y su porcentaje para las barras', () => {
    const bars = ratingBars(reviewsOf(TRIPS));
    expect(bars.map((b) => b.score)).toEqual([5, 4, 3, 2, 1]);
    expect(bars.find((b) => b.score === 5)).toEqual({ score: 5, count: 1, percent: 50 });
    expect(bars.find((b) => b.score === 4)).toEqual({ score: 4, count: 0, percent: 0 });
    expect(ratingBars([]).every((b) => b.percent === 0)).toBe(true);
  });
});
