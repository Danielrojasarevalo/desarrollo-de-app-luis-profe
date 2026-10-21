import { describe, expect, it } from 'vitest';

import { PendingRequest } from '../../core/models/api.models';
import { coordsOf } from './driver.page';

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
