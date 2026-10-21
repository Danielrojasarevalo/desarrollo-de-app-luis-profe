import { HttpErrorResponse } from '@angular/common/http';

/*
 * Convierte cualquier error HTTP en un mensaje para mostrar en un toast.
 * Sigue la tabla "Códigos de Respuesta HTTP Estándar" del documento:
 *  - 0   -> el servidor no responde (backend apagado o IP equivocada)
 *  - 422 -> Laravel envía { errors: { campo: ["mensaje"] } }; mostramos el primero
 *  - resto -> usamos "message" del cuerpo, o un texto según el código
 */
const STATUS_MESSAGES: Record<number, string> = {
  400: 'La operación no cumple una regla de negocio.',
  401: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  403: 'No tienes permiso para esta acción.',
  404: 'El recurso solicitado no existe.',
  409: 'Otro usuario modificó este registro al mismo tiempo.',
  422: 'Revisa los datos del formulario.',
};

export function apiErrorMessage(err: unknown): string {
  if (!(err instanceof HttpErrorResponse)) {
    return err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
  }
  if (err.status === 0) {
    return 'No se pudo conectar con el servidor. Verifica que el backend esté encendido y la URL sea correcta.';
  }
  const body = err.error as { message?: string; errors?: Record<string, string[]> } | null;
  if (err.status === 422 && body?.errors) {
    const first = Object.values(body.errors).flat()[0];
    if (first) {
      return first;
    }
  }
  return body?.message || STATUS_MESSAGES[err.status] || `Error ${err.status} del servidor.`;
}

// 6500 -> "$6.500 COP"
export function formatCop(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return `$${Math.round(value).toLocaleString('es-CO')} COP`;
}

// Traducción de los estados del viaje para mostrarlos al usuario.
export const STATUS_LABELS: Record<string, string> = {
  requested: 'Buscando conductor',
  assigned: 'Conductor asignado',
  driver_arrived: 'Conductor en el punto',
  in_progress: 'En viaje',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
  pending: 'Pendiente',
  approved: 'Aprobado',
  suspended: 'Suspendido',
  rejected: 'Rechazado',
  available: 'En línea',
  unavailable: 'Desconectado',
};

// Clase de color para .status-pill (verde = bien, amarillo = en espera, rojo = mal).
export function statusTone(status: string | undefined): string {
  switch (status) {
    case 'requested':
    case 'pending':
    case 'driver_arrived':
      return 'warn';
    case 'cancelled':
    case 'rejected':
    case 'suspended':
      return 'bad';
    case 'assigned':
    case 'in_progress':
      return 'info';
    default:
      return '';
  }
}
