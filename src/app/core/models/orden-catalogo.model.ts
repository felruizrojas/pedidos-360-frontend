/** Criterio de orden del listado de catálogo (público y dashboard comparten el mismo). */
export type OrdenCatalogo = 'ninguno' | 'precio-asc' | 'precio-desc';

export const ORDEN_CATALOGO_OPCIONES: { valor: OrdenCatalogo; etiqueta: string }[] = [
  { valor: 'ninguno', etiqueta: 'Ordenar por' },
  { valor: 'precio-asc', etiqueta: 'Precio: menor a mayor' },
  { valor: 'precio-desc', etiqueta: 'Precio: mayor a menor' },
];

export function esOrdenCatalogo(valor: string): valor is OrdenCatalogo {
  return valor === 'ninguno' || valor === 'precio-asc' || valor === 'precio-desc';
}
