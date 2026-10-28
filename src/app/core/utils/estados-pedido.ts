import { EstadoPedido } from '../models/pedido.model';

/**
 * Máquina de estados de pedidos (la misma de orders) y permisos por rol para mostrar solo las acciones
 * válidas. El backend es la autoridad: si igual responde 409 o 403, la UI muestra su mensaje.
 */

export const ESTADOS_PEDIDO: EstadoPedido[] = [
  'CREADO',
  'ACEPTADO',
  'EN_PREPARACION',
  'DESPACHADO',
  'ENTREGADO',
  'CANCELADO',
];

export const TRANSICIONES: Record<EstadoPedido, EstadoPedido[]> = {
  CREADO: ['ACEPTADO', 'CANCELADO'],
  ACEPTADO: ['EN_PREPARACION', 'CANCELADO'],
  EN_PREPARACION: ['DESPACHADO', 'CANCELADO'],
  DESPACHADO: ['ENTREGADO'],
  ENTREGADO: [],
  CANCELADO: [],
};

export const ETIQUETA_ESTADO: Record<EstadoPedido, string> = {
  CREADO: 'Creado',
  ACEPTADO: 'Aceptado',
  EN_PREPARACION: 'En preparación',
  DESPACHADO: 'Despachado',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
};

/** Texto del botón que lleva a cada estado. */
export const ACCION_ESTADO: Record<EstadoPedido, string> = {
  CREADO: 'Volver a creado',
  ACEPTADO: 'Aceptar pedido',
  EN_PREPARACION: 'Pasar a preparación',
  DESPACHADO: 'Despachar pedido',
  ENTREGADO: 'Marcar como entregado',
  CANCELADO: 'Cancelar pedido',
};

/** Clases Tailwind del badge (contraste AA sobre fondo claro). */
export const COLOR_ESTADO: Record<EstadoPedido, string> = {
  CREADO: 'bg-gray-100 text-gray-800 ring-gray-300',
  ACEPTADO: 'bg-blue-100 text-blue-800 ring-blue-300',
  EN_PREPARACION: 'bg-amber-100 text-amber-800 ring-amber-300',
  DESPACHADO: 'bg-indigo-100 text-indigo-800 ring-indigo-300',
  ENTREGADO: 'bg-green-100 text-green-800 ring-green-300',
  CANCELADO: 'bg-red-100 text-red-800 ring-red-300',
};

export function esEstadoPedido(valor: unknown): valor is EstadoPedido {
  return typeof valor === 'string' && (ESTADOS_PEDIDO as string[]).includes(valor);
}

/** Actores de pedidos: Operador (gestiona todos) y Cliente (solo los suyos). Admin no participa. */
function esOperador(roles: readonly string[]): boolean {
  return roles.includes('Operador');
}

/** Solo Cliente (sin Operador): ve únicamente sus pedidos. */
export function esSoloCliente(roles: readonly string[]): boolean {
  return roles.includes('Cliente') && !esOperador(roles);
}

/**
 * Estados a los que el usuario puede llevar el pedido:
 * Operador, cualquier transición válida (nunca despachar sin aceptar); Cliente, solo cancelar en CREADO.
 */
export function transicionesPermitidas(estado: EstadoPedido, roles: readonly string[]): EstadoPedido[] {
  const validas = TRANSICIONES[estado] ?? [];
  if (esOperador(roles)) return validas;
  if (roles.includes('Cliente') && estado === 'CREADO') return validas.filter((e) => e === 'CANCELADO');
  return [];
}

export function puedeTransicionar(desde: EstadoPedido, hacia: EstadoPedido, roles: readonly string[]): boolean {
  return transicionesPermitidas(desde, roles).includes(hacia);
}

/** Crear pedidos: solo Cliente, porque el pedido queda a nombre de su cuenta (orders responde 403 al resto). */
export function puedeCrearPedidos(roles: readonly string[]): boolean {
  return roles.includes('Cliente');
}

/** Editar ítems y dirección: solo en CREADO; Cliente (sus pedidos) u Operador (cualquiera). */
export function puedeEditar(estado: EstadoPedido, roles: readonly string[]): boolean {
  return estado === 'CREADO' && (roles.includes('Cliente') || esOperador(roles));
}

/** Borrado lógico: solo Operador y solo en CREADO o CANCELADO. */
export function puedeEliminar(estado: EstadoPedido, roles: readonly string[]): boolean {
  return esOperador(roles) && (estado === 'CREADO' || estado === 'CANCELADO');
}
