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

  it('status 0 ante error de red', () => {
    let error!: ApiError;
    http.get('/x').subscribe({ error: (e) => (error = e) });
    ctrl.expectOne('/x').error(new ProgressEvent('error'));
    expect(error.status).toBe(0);
  });
});
