import { Injectable, computed, signal } from '@angular/core';

/** Línea del carrito. `precio` es referencial: orders lo recalcula desde catalog al crear el pedido. */
export interface ItemCarrito {
  productoId: number;
  nombre: string;
  precio: number;
  cantidad: number;
  /** Stock visto al agregar; tope de la cantidad en la UI (el back vuelve a validar al aceptar). */
  stock: number;
}

const CLAVE_STORAGE = 'pedidos360.carrito';
/** Mismo tope por ítem que valida orders. */
export const CANTIDAD_MAXIMA = 1000;

/** Carrito con signals, persistido en localStorage (si no está disponible, funciona solo en memoria). */
@Injectable({ providedIn: 'root' })
export class CarritoService {
  private readonly lineas = signal<ItemCarrito[]>(leer());

  readonly items = this.lineas.asReadonly();
  readonly cantidadTotal = computed(() => this.lineas().reduce((suma, i) => suma + i.cantidad, 0));
  readonly totalReferencial = computed(() => this.lineas().reduce((suma, i) => suma + i.precio * i.cantidad, 0));
  readonly vacio = computed(() => this.lineas().length === 0);

  /** Agrega el producto o suma la cantidad si ya estaba (con tope en el stock y en CANTIDAD_MAXIMA). */
  agregar(producto: { id: number; nombre: string; precio: number; stock: number }, cantidad: number): void {
    if (!Number.isInteger(cantidad) || cantidad <= 0) return;
    const actual = this.lineas();
    const existente = actual.find((i) => i.productoId === producto.id);
    const nueva = limitar((existente?.cantidad ?? 0) + cantidad, producto.stock);
    const linea: ItemCarrito = {
      productoId: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      stock: producto.stock,
      cantidad: nueva,
    };
    this.guardar(
      existente ? actual.map((i) => (i.productoId === producto.id ? linea : i)) : [...actual, linea],
    );
  }

  cambiarCantidad(productoId: number, cantidad: number): void {
    if (!Number.isInteger(cantidad)) return;
    if (cantidad <= 0) {
      this.quitar(productoId);
      return;
    }
    this.guardar(
      this.lineas().map((i) => (i.productoId === productoId ? { ...i, cantidad: limitar(cantidad, i.stock) } : i)),
    );
  }

  quitar(productoId: number): void {
    this.guardar(this.lineas().filter((i) => i.productoId !== productoId));
  }

  vaciar(): void {
    this.guardar([]);
  }

  private guardar(items: ItemCarrito[]): void {
    this.lineas.set(items);
    try {
      localStorage.setItem(CLAVE_STORAGE, JSON.stringify(items));
    } catch {
      // Modo privado, cuota llena o sin storage: el carrito sigue funcionando en memoria.
    }
  }
}

function limitar(cantidad: number, stock: number): number {
  const tope = stock > 0 ? Math.min(stock, CANTIDAD_MAXIMA) : CANTIDAD_MAXIMA;
  return Math.min(Math.max(cantidad, 1), tope);
}

function leer(): ItemCarrito[] {
  try {
    const crudo = localStorage.getItem(CLAVE_STORAGE);
    const datos: unknown = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(datos) ? datos.filter(esItemCarrito) : [];
  } catch {
    return [];
  }
}

function esItemCarrito(valor: unknown): valor is ItemCarrito {
  const i = valor as ItemCarrito;
  return (
    typeof i === 'object' && i !== null &&
    Number.isInteger(i.productoId) && typeof i.nombre === 'string' &&
    typeof i.precio === 'number' && Number.isInteger(i.cantidad) && i.cantidad > 0 &&
    typeof i.stock === 'number'
  );
}
