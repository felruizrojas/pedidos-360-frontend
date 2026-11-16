/**
 * Etiqueta y color de cada acción de audit.timeline. La lista está abierta (audit guarda acciones nuevas tal cual):
 * una acción desconocida se muestra con su código y un color neutro.
 */
const ACCIONES: Record<string, { etiqueta: string; clases: string }> = {
  ORDER_CREATED: { etiqueta: 'Pedido creado', clases: 'bg-blue-100 text-blue-800 ring-blue-300' },
  ORDER_STATUS_CHANGED: { etiqueta: 'Cambio de estado', clases: 'bg-indigo-100 text-indigo-800 ring-indigo-300' },
  ORDER_UPDATED: { etiqueta: 'Pedido editado', clases: 'bg-amber-100 text-amber-900 ring-amber-300' },
  ORDER_DELETED: { etiqueta: 'Pedido eliminado', clases: 'bg-red-100 text-red-800 ring-red-300' },
};

const NEUTRO = 'bg-gray-100 text-gray-800 ring-gray-300';

export function etiquetaAccion(accion: string | null): string {
  return (accion && ACCIONES[accion]?.etiqueta) || accion || '—';
}

export function clasesAccion(accion: string | null): string {
  return (accion && ACCIONES[accion]?.clases) || NEUTRO;
}
