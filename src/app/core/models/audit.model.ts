/**
 * Respuestas de ms-pedidos360-audit (vía BFF, /api/audit/**), calcadas de sus DTOs reales (dto/*Response.java).
 * Fechas como ISO-8601 (string).
 */

export interface EventoAuditoria {
  eventId: string;
  /** Texto libre: ORDER_CREATED, ORDER_STATUS_CHANGED, ORDER_UPDATED, ORDER_DELETED u otras futuras. */
  accion: string;
  entidad: { tipo: string; id: string };
  quien: { id: string | null; nombre: string | null; email: string | null; rol: string | null };
  que: { descripcion: string | null; estadoAnterior: string | null; estadoNuevo: string | null; comentario: string | null };
  cuando: { ocurridoEn: string; recibidoEn: string };
  donde: { servicio: string | null; ip: string | null; userAgent: string | null };
  correlationId: string | null;
}

export interface EventoAuditoriaDetalle extends EventoAuditoria {
  kafka: { topic: string | null; particion: number | null; offset: number | null };
  /** Mensaje original de audit.timeline como objeto JSON. */
  payload: unknown;
}

/** Mismo formato de página que orders (PaginaResponse). */
export interface PaginaAuditoria<T> {
  contenido: T[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
}

export interface TipoEvento {
  accion: string;
  cantidad: number;
}

export interface Conteo {
  /** Acción o rol (el rol puede venir null). */
  clave: string | null;
  cantidad: number;
}

export interface ResumenAuditoria {
  desde: string;
  hasta: string;
  total: number;
  porAccion: Conteo[];
  porRol: Conteo[];
  topActores: { id: string; nombre: string | null; cantidad: number }[];
}

export interface PosicionDlt {
  topic: string;
  particion: number;
  offset: number;
}

export interface MensajeFallido {
  id: number;
  topicOriginal: string | null;
  particionOriginal: number | null;
  offsetOriginal: number | null;
  consumerGroup: string | null;
  clave: string | null;
  excepcionClase: string | null;
  excepcionMensaje: string | null;
  fallidoEn: string | null;
  registradoEn: string;
  dlt: PosicionDlt;
  /** Primeros 200 caracteres del mensaje original. */
  payloadResumen: string | null;
}

export interface MensajeFallidoDetalle {
  id: number;
  topicOriginal: string | null;
  particionOriginal: number | null;
  offsetOriginal: number | null;
  timestampOriginal: string | null;
  consumerGroup: string | null;
  clave: string | null;
  excepcionClase: string | null;
  excepcionMensaje: string | null;
  stacktrace: string | null;
  fallidoEn: string | null;
  registradoEn: string;
  dlt: PosicionDlt;
  /** Texto: puede no ser JSON (justamente por eso falló). */
  payload: string | null;
}

/** Filtros de GET /api/audit/events (todos opcionales; vacíos se omiten). */
export interface FiltrosAuditoria {
  usuario?: string | null;
  /** Varias acciones: se envían como parámetro repetido (?accion=A&accion=B). */
  accion?: string[] | null;
  entityType?: string | null;
  entityId?: string | null;
  rol?: string | null;
  desde?: string | null;
  hasta?: string | null;
  correlationId?: string | null;
  page?: number | null;
  size?: number | null;
  sort?: 'asc' | 'desc' | null;
}

export interface FiltrosMensajesFallidos {
  topic?: string | null;
  desde?: string | null;
  hasta?: string | null;
  page?: number | null;
  size?: number | null;
}
