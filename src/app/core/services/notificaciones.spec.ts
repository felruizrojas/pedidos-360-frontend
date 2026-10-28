import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Notificacion } from '../models/notificacion.model';
import { NotificacionesService } from './notificaciones';

describe('NotificacionesService', () => {
  let service: NotificacionesService;
  let http: HttpTestingController;
  const url = `${environment.apiBaseUrl}/api/orders/notifications`;
  const avisos: Notificacion[] = [
    { id: 2, pedidoId: 16, titulo: 'Pedido eliminado', mensaje: 'Tu pedido #16 fue eliminado.', fecha: '2026-10-20T15:10:00Z', leida: false },
    { id: 1, pedidoId: 15, titulo: 'Pedido cancelado', mensaje: 'Tu pedido #15 fue cancelado.', fecha: '2026-10-20T15:00:00Z', leida: true },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(NotificacionesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carga los avisos con GET /api/orders/notifications y cuenta los no leídos', () => {
    service.cargar();
    const req = http.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush(avisos);
    expect(service.notificaciones()).toEqual(avisos);
    expect(service.noLeidas()).toBe(1);
  });

  it('si la carga falla conserva la lista anterior', () => {
    service.cargar();
    http.expectOne(url).flush(avisos);
    service.cargar();
    http.expectOne(url).flush({ mensaje: 'caído' }, { status: 503, statusText: 'x' });
    expect(service.notificaciones()).toEqual(avisos);
  });

  it('marca todos como leídos con PUT /read', () => {
    service.cargar();
    http.expectOne(url).flush(avisos);
    service.marcarLeidas();
    const req = http.expectOne(`${url}/read`);
    expect(req.request.method).toBe('PUT');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(service.noLeidas()).toBe(0);
  });

  it('no llama al back si no hay avisos sin leer', () => {
    service.marcarLeidas();
    http.expectNone(`${url}/read`);
  });
});
