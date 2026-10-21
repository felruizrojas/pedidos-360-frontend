import { ApiError, esApiError } from '../../core/models/api-error.model';

/** Normaliza cualquier error (ApiError del interceptor u otro) a ApiError. */
export function aApiError(e: unknown): ApiError {
  return esApiError(e) ? e : { status: 0, mensaje: 'El servicio no está disponible. Inténtalo de nuevo.' };
}

/**
 * Mensaje para el usuario ante un error de pedidos. 400/404/409 traen el mensaje del back tal cual
 * (p. ej. "Stock insuficiente…" o "No se puede despachar un pedido que no fue aceptado…").
 */
export function mensajeErrorPedido(error: ApiError, accion: string): string {
  if (error.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (error.status === 403) return `No tienes permisos para ${accion}.`;
  if (error.status === 0 || error.status >= 500) return 'El servicio no está disponible. Inténtalo de nuevo en unos minutos.';
  return error.mensaje || `No se pudo ${accion}.`;
}
