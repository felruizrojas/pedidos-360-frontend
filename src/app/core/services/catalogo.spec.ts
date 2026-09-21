import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { NuevoProducto, Producto } from '../models/producto.model';
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
});
