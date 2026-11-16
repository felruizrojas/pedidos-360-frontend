/**
 * Respuestas de ms-pedidos360-report (vía BFF, /api/report/**), calcadas de sus DTOs reales
 * (dto/*Response.java y los records de kpi/CalculadoraKpis y kpi/CalculadoraLeadTime).
 * Fechas como ISO-8601 (string). Montos en CLP con 2 decimales; minutos con 1 decimal.
 */

/** Valores de `range` que acepta report. */
export type RangoReporte = 'today' | 'last24h' | 'last7d' | 'last30d';

/** Rango efectivo. En active-states: desde = null y zonaHoraria = null (nombre "actual"). */
export interface RangoInfo {
  desde: string | null;
  hasta: string;
  zonaHoraria: string | null;
  nombre: string;
}

/** Lo que trae toda respuesta de report. */
export interface RespuestaReporte {
  rango: RangoInfo;
  generadoEn: string;
  /** occurredAt del último evento de orders.events procesado (frescura de los datos); null si aún no hay. */
  ultimoEventoProcesadoEn: string | null;
}

export interface Ventas {
  monto: number;
  cantidadPedidos: number;
  /** null si no hubo ventas. */
  ticketPromedio: number | null;
}

/** Con 0 muestras, todos los campos van en null. */
export interface ResumenLeadTime {
  promedioMin: number | null;
  p50Min: number | null;
  p90Min: number | null;
  minMin: number | null;
  maxMin: number | null;
  muestras: number;
}

export type EstadoActivo = 'CREADO' | 'ACEPTADO' | 'EN_PREPARACION' | 'DESPACHADO';
export type ConteoEstadosActivos = Record<EstadoActivo, number>;

export interface Kpis extends RespuestaReporte {
  ventas: Ventas;
  pedidosCreados: number;
  pedidosEntregados: number;
  pedidosCancelados: number;
  /** % de los pedidos creados en el rango que hoy están cancelados; null si no hubo creados. */
  tasaCancelacion: number | null;
  clientesActivos: number;
  leadTime: ResumenLeadTime;
  estadosActivos: ConteoEstadosActivos;
  totalActivos: number;
}

export type Granularidad = 'HORA' | 'DIA';

export interface PuntoVentas {
  /** Inicio del bucket con el offset de la zona del reporte, p. ej. "2026-11-13T13:00:00-03:00". */
  hora: string;
  /** "13-11 13:00" (HORA) o "2026-11-13" (DIA). */
  etiqueta: string;
  pedidos: number;
  monto: number;
}

export interface VentasPorHora extends RespuestaReporte {
  granularidad: Granularidad;
  serie: PuntoVentas[];
}

export interface ConteoBucket {
  bucket: string;
  cantidad: number;
}

export interface PuntoLeadTimeDiario {
  dia: string;
  promedioMin: number | null;
  muestras: number;
}

export interface LeadTime extends RespuestaReporte {
  leadTime: ResumenLeadTime;
  /** Siempre los 6 buckets, en orden: <30m, 30-60m, 1-2h, 2-4h, 4-8h, >8h. */
  distribucion: ConteoBucket[];
  serie: PuntoLeadTimeDiario[];
}

/** Así viene en la respuesta (nombre del enum de Java); en el request va en minúscula. */
export type OrdenTop = 'CANTIDAD' | 'MONTO';
export type OrdenTopParam = 'cantidad' | 'monto';

export interface ProductoTop {
  productoId: number;
  productoNombre: string;
  cantidad: number;
  monto: number;
}

export interface TopProductos extends RespuestaReporte {
  orden: OrdenTop;
  limite: number;
  productos: ProductoTop[];
}

export interface PedidoActivo {
  pedidoId: number;
  estado: EstadoActivo;
  clienteNombre: string | null;
  creadoEn: string | null;
  /** null si no se conoce creadoEn. */
  minutosAbierto: number | null;
}

export interface EstadosActivos extends RespuestaReporte {
  estadosActivos: ConteoEstadosActivos;
  totalActivos: number;
  masAntiguos: PedidoActivo[];
}
