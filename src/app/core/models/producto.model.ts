export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  /** Solo en la administración: true si viene de /eliminados (borrado lógico, se puede deshacer). */
  eliminado?: boolean;
}

/** Datos que se envían al back para crear un producto (el id lo genera el back). */
export type NuevoProducto = Omit<Producto, 'id' | 'eliminado'>;

/** Campos editables de un producto existente (PUT): nombre y descripción quedan fijos. */
export type ActualizacionProducto = Pick<Producto, 'precio' | 'stock'>;
