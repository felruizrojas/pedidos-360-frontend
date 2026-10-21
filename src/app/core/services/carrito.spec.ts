import { TestBed } from '@angular/core/testing';
import { CANTIDAD_MAXIMA, CarritoService } from './carrito';

describe('CarritoService', () => {
  const CLAVE = 'pedidos360.carrito';
  const pan = { id: 1, nombre: 'Pan Amasado', precio: 600, stock: 10 };
  const cafe = { id: 4, nombre: 'Café Americano', precio: 1500, stock: 3 };

  function crear(): CarritoService {
    TestBed.resetTestingModule();
    return TestBed.inject(CarritoService);
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('agrega productos y calcula cantidad y total referencial', () => {
    const carrito = crear();
    carrito.agregar(pan, 2);
    carrito.agregar(cafe, 1);
    expect(carrito.items().map((i) => [i.productoId, i.cantidad])).toEqual([[1, 2], [4, 1]]);
    expect(carrito.cantidadTotal()).toBe(3);
    expect(carrito.totalReferencial()).toBe(2700);
    expect(carrito.vacio()).toBe(false);
  });

  it('suma la cantidad si el producto ya estaba, con tope en el stock', () => {
    const carrito = crear();
    carrito.agregar(cafe, 2);
    carrito.agregar(cafe, 5);
    expect(carrito.items()).toHaveLength(1);
    expect(carrito.items()[0].cantidad).toBe(3);
  });

  it('respeta el máximo por ítem de orders', () => {
    const carrito = crear();
    carrito.agregar({ ...pan, stock: 5000 }, 4000);
    expect(carrito.items()[0].cantidad).toBe(CANTIDAD_MAXIMA);
  });

  it('ignora cantidades inválidas', () => {
    const carrito = crear();
    carrito.agregar(pan, 0);
    carrito.agregar(pan, -1);
    carrito.agregar(pan, 1.5);
    expect(carrito.vacio()).toBe(true);
  });

  it('cambia la cantidad y quita con 0', () => {
    const carrito = crear();
    carrito.agregar(pan, 2);
    carrito.cambiarCantidad(1, 5);
    expect(carrito.items()[0].cantidad).toBe(5);
    carrito.cambiarCantidad(1, 0);
    expect(carrito.vacio()).toBe(true);
  });

  it('quita un producto y vacía', () => {
    const carrito = crear();
    carrito.agregar(pan, 1);
    carrito.agregar(cafe, 1);
    carrito.quitar(1);
    expect(carrito.items().map((i) => i.productoId)).toEqual([4]);
    carrito.vaciar();
    expect(carrito.vacio()).toBe(true);
    expect(carrito.totalReferencial()).toBe(0);
  });

  it('persiste en localStorage y lo recupera en una nueva instancia', () => {
    crear().agregar(pan, 2);
    expect(JSON.parse(localStorage.getItem(CLAVE)!)).toEqual([
      { productoId: 1, nombre: 'Pan Amasado', precio: 600, stock: 10, cantidad: 2 },
    ]);
    const otro = crear();
    expect(otro.cantidadTotal()).toBe(2);
  });

  it('descarta datos corruptos del storage', () => {
    localStorage.setItem(CLAVE, '{no es json');
    expect(crear().vacio()).toBe(true);
    localStorage.setItem(CLAVE, JSON.stringify([{ productoId: 'x' }, { productoId: 1, nombre: 'Pan', precio: 600, stock: 1, cantidad: 1 }]));
    expect(crear().items().map((i) => i.productoId)).toEqual([1]);
  });

  it('funciona en memoria si localStorage lanza error', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cuota');
    });
    const carrito = crear();
    expect(carrito.vacio()).toBe(true);
    carrito.agregar(pan, 1);
    expect(carrito.cantidadTotal()).toBe(1);
  });
});
