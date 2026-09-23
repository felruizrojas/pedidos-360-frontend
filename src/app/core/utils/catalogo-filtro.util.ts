import { Producto } from '../models/producto.model';
import { OrdenCatalogo } from '../models/orden-catalogo.model';
import { normalizarNombreProducto } from './producto-validators';

/**
 * Filtra por nombre (substring, sin distinguir mayúsculas/tildes de espacios extra) y
 * ordena por precio. Comparte lógica entre el catálogo público y el del dashboard.
 */
export function filtrarYOrdenarProductos(
  productos: Producto[],
  busqueda: string,
  orden: OrdenCatalogo,
): Producto[] {
  const termino = normalizarNombreProducto(busqueda);
  const filtrados = termino
    ? productos.filter((p) => normalizarNombreProducto(p.nombre).includes(termino))
    : productos;

  if (orden === 'precio-asc') {
    return [...filtrados].sort((a, b) => a.precio - b.precio);
  }
  if (orden === 'precio-desc') {
    return [...filtrados].sort((a, b) => b.precio - a.precio);
  }
  return filtrados;
}
