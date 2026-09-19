export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
}

/** Datos que se envían al back para crear un producto (el id lo genera el back). */
export type NuevoProducto = Omit<Producto, 'id'>;
