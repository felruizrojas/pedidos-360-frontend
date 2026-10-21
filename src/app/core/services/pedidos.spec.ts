import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { HistorialEstado, Pagina, Pedido } from '../models/pedido.model';
import { PedidosService } from './pedidos';

describe('PedidosService', () => {
  let service: PedidosService;
  let http: HttpTestingController;
  const url = `${environment.apiBaseUrl}/api/orders`;
  const pedido = { id: 15, estado: 'CREADO', total: 2700, items: [] } as unknown as Pedido;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PedidosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crea un pedido con POST /api/orders', () => {
    const body = { direccionEntrega: 'Av. Providencia 1234', items: [{ productoId: 1, cantidad: 2 }] };
    let res: Pedido | undefined;
    service.crearPedido(body).subscribe((r) => (res = r));
    const req = http.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(pedido);
    expect(res).toEqual(pedido);
  });

  it('obtiene un pedido con GET /api/orders/{id}', () => {
    service.obtenerPedido(15).subscribe();
    const req = http.expectOne(`${url}/15`);
    expect(req.request.method).toBe('GET');
    req.flush(pedido);
  });

  it('lista con todos los filtros como query params', () => {
    let res: Pagina<Pedido> | undefined;
    service
      .listarPedidos({ estado: 'ACEPTADO', desde: '2026-10-01', hasta: '2026-10-31', page: 2, size: 10 })
      .subscribe((r) => (res = r));
    const req = http.expectOne((r) => r.url === url);
    expect(req.request.method).toBe('GET');
    const params = req.request.params;
    expect(params.get('estado')).toBe('ACEPTADO');
    expect(params.get('desde')).toBe('2026-10-01');
    expect(params.get('hasta')).toBe('2026-10-31');
    expect(params.get('page')).toBe('2');
    expect(params.get('size')).toBe('10');
    const pagina: Pagina<Pedido> = { contenido: [pedido], pagina: 2, tamano: 10, totalElementos: 21, totalPaginas: 3 };
    req.flush(pagina);
    expect(res).toEqual(pagina);
  });

  it('omite los filtros vacíos o nulos (page 0 sí se envía)', () => {
    service.listarPedidos({ estado: null, desde: '', hasta: undefined, page: 0, size: 20 }).subscribe();
    const req = http.expectOne((r) => r.url === url);
    expect(req.request.params.keys()).toEqual(['page', 'size']);
    expect(req.request.urlWithParams).toBe(`${url}?page=0&size=20`);
    req.flush({ contenido: [], pagina: 0, tamano: 20, totalElementos: 0, totalPaginas: 0 });
  });

  it('lista sin filtros sin query string', () => {
    service.listarPedidos().subscribe();
    const req = http.expectOne(url);
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ contenido: [], pagina: 0, tamano: 20, totalElementos: 0, totalPaginas: 0 });
  });

  it('actualiza con PUT /api/orders/{id}', () => {
    service.actualizarPedido(15, { direccionEntrega: 'Los Leones 456' }).subscribe();
    const req = http.expectOne(`${url}/15`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ direccionEntrega: 'Los Leones 456' });
    req.flush(pedido);
  });

  it('cambia el estado con PUT /api/orders/{id}/status', () => {
    service.cambiarEstado(15, { status: 'CANCELADO', comentario: 'No estaba' }).subscribe();
    const req = http.expectOne(`${url}/15/status`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'CANCELADO', comentario: 'No estaba' });
    req.flush(pedido);
  });

  it('obtiene el historial con GET /api/orders/{id}/history', () => {
    let res: HistorialEstado[] | undefined;
    service.obtenerHistorial(15).subscribe((r) => (res = r));
    const req = http.expectOne(`${url}/15/history`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
    expect(res).toEqual([]);
  });

  it('elimina con DELETE /api/orders/{id}', () => {
    service.eliminarPedido(15).subscribe();
    const req = http.expectOne(`${url}/15`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
