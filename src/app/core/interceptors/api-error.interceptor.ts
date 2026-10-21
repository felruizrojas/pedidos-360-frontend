import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../models/api-error.model';

/**
 * Códigos cuyo `mensaje` del back es útil para el usuario y se muestra tal cual: validación (400),
 * no encontrado (404) y conflicto de negocio (409: transición inválida, stock insuficiente, versión).
 * El resto (401/403/5xx) usa un mensaje propio para no exponer detalles internos.
 */
const STATUS_CON_MENSAJE_DEL_BACK = [400, 404, 409];

function mensajePorDefecto(status: number): string {
  switch (status) {
    case 400:
      return 'Los datos enviados no son válidos.';
    case 401:
      return 'Tu sesión expiró. Inicia sesión nuevamente.';
    case 403:
      return 'No tienes permisos para realizar esta acción.';
    case 404:
      return 'No se encontró lo que buscabas.';
    case 409:
      return 'La operación no se pudo completar por un conflicto con el estado actual.';
    case 0:
    case 502:
    case 503:
    case 504:
      return 'El servicio no está disponible. Inténtalo de nuevo en unos minutos.';
    default:
      return 'Ocurrió un error inesperado.';
  }
}

/** Normaliza los HttpErrorResponse a ApiError; el resto de errores (p. ej. MSAL) pasa intacto. */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }
      const cuerpo = error.error as { mensaje?: unknown; detalles?: unknown } | null;
      const detalles =
        cuerpo && typeof cuerpo.detalles === 'object' && cuerpo.detalles !== null
          ? (cuerpo.detalles as Record<string, string>)
          : undefined;
      const apiError: ApiError = {
        status: error.status,
        mensaje:
          STATUS_CON_MENSAJE_DEL_BACK.includes(error.status) && typeof cuerpo?.mensaje === 'string' && cuerpo.mensaje
            ? cuerpo.mensaje
            : mensajePorDefecto(error.status),
        detalles,
      };
      return throwError(() => apiError);
    }),
  );
