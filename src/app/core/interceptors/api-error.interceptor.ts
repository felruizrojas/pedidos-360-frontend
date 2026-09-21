import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../models/api-error.model';

function mensajePorDefecto(status: number): string {
  switch (status) {
    case 400:
      return 'Los datos enviados no son válidos.';
    case 401:
      return 'Tu sesión expiró. Inicia sesión nuevamente.';
    case 403:
      return 'No tienes permisos para realizar esta acción.';
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
          error.status === 400 && typeof cuerpo?.mensaje === 'string'
            ? cuerpo.mensaje
            : mensajePorDefecto(error.status),
        detalles,
      };
      return throwError(() => apiError);
    }),
  );
