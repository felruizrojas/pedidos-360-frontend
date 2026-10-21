import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiError } from '../models/api-error.model';
import { apiErrorInterceptor } from './api-error.interceptor';

describe('apiErrorInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiErrorInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
  });

  function fallar(status: number, body: object | null = null): ApiError {
    let error!: ApiError;
    http.get('/x').subscribe({ error: (e) => (error = e) });
    ctrl.expectOne('/x').flush(body, { status, statusText: 'err' });
    return error;
  }

  it('normaliza 400 con detalles', () => {
    const e = fallar(400, { mensaje: 'Validación', detalles: { nombre: 'obligatorio' } });
    expect(e).toEqual({ status: 400, mensaje: 'Validación', detalles: { nombre: 'obligatorio' } });
  });

  it('normaliza 403 y 503', () => {
    expect(fallar(403).status).toBe(403);
    expect(fallar(503).mensaje).toContain('no está disponible');
  });

  it('409 usa el mensaje del back y conserva los detalles', () => {
    const e = fallar(409, {
      mensaje: 'No se puede despachar un pedido que no fue aceptado (estado actual: CREADO)',
      detalles: { estadoActual: 'CREADO', estadoSolicitado: 'DESPACHADO' },
    });
    expect(e.status).toBe(409);
    expect(e.mensaje).toBe('No se puede despachar un pedido que no fue aceptado (estado actual: CREADO)');
    expect(e.detalles).toEqual({ estadoActual: 'CREADO', estadoSolicitado: 'DESPACHADO' });
  });

  it('404 usa el mensaje del back; sin mensaje, uno por defecto', () => {
    expect(fallar(404, { mensaje: 'Pedido 99 no encontrado' }).mensaje).toBe('Pedido 99 no encontrado');
    expect(fallar(404).mensaje).toBe('No se encontró lo que buscabas.');
    expect(fallar(409).mensaje).toContain('conflicto');
  });

  it('503 no expone el mensaje del back', () => {
    const e = fallar(503, { mensaje: 'Servicio de catálogo no disponible' });
    expect(e.mensaje).toBe('El servicio no está disponible. Inténtalo de nuevo en unos minutos.');
  });

  it('status 0 ante error de red', () => {
    let error!: ApiError;
    http.get('/x').subscribe({ error: (e) => (error = e) });
    ctrl.expectOne('/x').error(new ProgressEvent('error'));
    expect(error.status).toBe(0);
  });
});
