/**
 * Contrato de pedidos de ms-pedidos360-orders (README de orders, "Contrato para otros servicios"),
 * expuesto tal cual por el BFF en /api/orders. Fechas ISO-8601 en UTC; montos con 2 decimales.
 */
export type EstadoPedido = 'CREADO' | 'ACEPTADO' | 'EN_PREPARACION' | 'DESPACHADO' | 'ENTREGADO' | 'CANCELADO';

export interface ItemPedido {
  id: number;
  productoId: number;
  productoNombre: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
}

export interface Pedido {
  id: number;
  clienteId: string;
  clienteNombre: string;
  clienteEmail: string;
  direccionEntrega: string;
  estado: EstadoPedido;
  total: number;
  stockDescontado: boolean;
  items: ItemPedido[];
  creadoEn: string;
  aceptadoEn: string | null;
  enPreparacionEn: string | null;
  despachadoEn: string | null;
  entregadoEn: string | null;
  canceladoEn: string | null;
  motivoCancelacion: string | null;
  version: number;
}

/** Un cambio de estado; estadoAnterior es null en la creación. */
export interface HistorialEstado {
  estadoAnterior: EstadoPedido | null;
  estadoNuevo: EstadoPedido;
  usuarioId: string;
  usuarioNombre: string;
  usuarioRol: string;
  fecha: string;
  comentario: string | null;
}

/** Listado paginado de orders (`pagina` es 0-based). */
export interface Pagina<T> {
  contenido: T[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
}

/** Solo producto y cantidad: el precio y el nombre los toma orders desde catalog. */
export interface ItemPedidoRequest {
  productoId: number;
  cantidad: number;
}

export interface CrearPedidoRequest {
  direccionEntrega: string;
  items: ItemPedidoRequest[];
}

/** Ambos opcionales (al menos uno). `items`, si viene, reemplaza todos los ítems. Solo en CREADO. */
export interface ActualizarPedidoRequest {
  direccionEntrega?: string;
  items?: ItemPedidoRequest[];
}

/** `comentario` opcional (máx. 500); al cancelar queda en `motivoCancelacion`. */
export interface CambiarEstadoRequest {
  status: EstadoPedido;
  comentario?: string;
}

/** Filtros del listado. `desde`/`hasta` aceptan fecha sola (`2026-10-01`) o instante ISO-8601. */
export interface FiltrosPedidos {
  estado?: EstadoPedido | null;
  desde?: string | null;
  hasta?: string | null;
  /** 0-based, igual que orders. */
  page?: number;
  size?: number;
}

/** Límites que valida orders (se replican en los formularios para fallar rápido). */
export const DIRECCION_MAX_LENGTH = 200;
export const COMENTARIO_MAX_LENGTH = 500;
