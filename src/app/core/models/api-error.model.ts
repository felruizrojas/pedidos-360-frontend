/** Error HTTP normalizado. `status` 0 = sin conexión / servicio inalcanzable. */
export interface ApiError {
  status: number;
  mensaje: string;
  /** Errores de validación 400 por campo: { campo: mensaje }. */
  detalles?: Record<string, string>;
}

export function esApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null && 'status' in error && 'mensaje' in error;
}
