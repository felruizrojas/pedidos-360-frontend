import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ActualizacionProducto, NuevoProducto, Producto } from '../models/producto.model';
import { CatalogoService } from './catalogo';

describe('CatalogoService', () => {
  let service: CatalogoService;
  let http: HttpTestingController;
  const url = `${environment.apiBaseUrl}/api/catalog/products`;
  const producto: Producto = { id: 1, nombre: 'A', descripcion: 'd', precio: 100, stock: 2 };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CatalogoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('obtiene la lista de productos', () => {
    let res: Producto[] | undefined;
    service.obtenerProductos().subscribe((r) => (res = r));
    const req = http.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush([producto]);
    expect(res).toEqual([producto]);
  });

  it('obtiene un producto por id', () => {
    let res: Producto | undefined;
    service.obtenerProductoPorId(1).subscribe((r) => (res = r));
    const req = http.expectOne(`${url}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(producto);
    expect(res).toEqual(producto);
  });

  it('crea un producto con POST', () => {
    const nuevo: NuevoProducto = { nombre: 'A', descripcion: 'd', precio: 100, stock: 2 };
    let res: Producto | undefined;
    service.crearProducto(nuevo).subscribe((r) => (res = r));
    const req = http.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(nuevo);
    req.flush(producto);
    expect(res).toEqual(producto);
  });

  it('actualiza precio y stock con PUT', () => {
    const cambios: ActualizacionProducto = { precio: 90, stock: 5 };
    let res: Producto | undefined;
    service.actualizarProducto(1, cambios).subscribe((r) => (res = r));
    const req = http.expectOne(`${url}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(cambios);
    req.flush({ ...producto, ...cambios });
    expect(res).toEqual({ ...producto, ...cambios });
  });

  it('elimina un producto con DELETE', () => {
    let completado = false;
    service.eliminarProducto(1).subscribe({ complete: () => (completado = true) });
    const req = http.expectOne(`${url}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(completado).toBe(true);
  });

  it('lista los eliminados con GET /eliminados', () => {
    let res: unknown;
    service.obtenerEliminados().subscribe((r) => (res = r));
    const req = http.expectOne(`${url}/eliminados`);
    expect(req.request.method).toBe('GET');
    req.flush([producto]);
    expect(res).toEqual([producto]);
  });

  it('restaura un producto con PUT /{id}/restaurar', () => {
    let res: unknown;
    service.restaurarProducto(1).subscribe((r) => (res = r));
    const req = http.expectOne(`${url}/1/restaurar`);
    expect(req.request.method).toBe('PUT');
    req.flush(producto);
    expect(res).toEqual(producto);
  });
});
