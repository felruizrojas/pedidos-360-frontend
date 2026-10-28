/** Aviso en la app (GET /api/orders/notifications): pedido cancelado, modificado o eliminado. */
export interface Notificacion {
  id: number;
  pedidoId: number;
  titulo: string;
  mensaje: string;
  /** ISO-8601 (UTC). */
  fecha: string;
  leida: boolean;
}
