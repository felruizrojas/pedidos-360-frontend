import { ApiError, esApiError } from '../../../core/models/api-error.model';

export const MENSAJE_AUDIT_NO_DISPONIBLE = 'La auditoría no está disponible en este momento.';
export const TAMANO_PAGINA = 20;

/** 503/0 → aviso genérico; el resto (400, 404) con el mensaje del back. */
export function mensajeAuditoria(error: ApiError): string {
  return error.status === 0 || error.status >= 500 ? MENSAJE_AUDIT_NO_DISPONIBLE : error.mensaje;
}

export function aApiError(e: unknown): ApiError {
  return esApiError(e) ? e : { status: 0, mensaje: MENSAJE_AUDIT_NO_DISPONIBLE };
}

/**
 * Un input date ("2026-11-13") como instante del inicio/fin de ese día en la zona del navegador. audit leería una
 * fecha sola como día UTC (en Chile, de las 21:00 del día anterior a las 21:00).
 */
export function inicioDelDia(fecha: string | null): string | null {
  return fecha ? new Date(`${fecha}T00:00:00`).toISOString() : null;
}

export function finDelDia(fecha: string | null): string | null {
  return fecha ? new Date(`${fecha}T23:59:59.999`).toISOString() : null;
}

/** Nombre corto de una clase Java: "tools.jackson.core.exc.StreamReadException" → "StreamReadException". */
export function claseCorta(fqcn: string | null): string {
  return fqcn ? fqcn.substring(fqcn.lastIndexOf('.') + 1) : '—';
}
