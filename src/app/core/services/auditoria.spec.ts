import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuditoriaService } from './auditoria';

describe('AuditoriaService', () => {
  const base = `${environment.apiBaseUrl}/api/audit`;
  let service: AuditoriaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuditoriaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('eventos: omite los filtros vacíos y repite accion', () => {
    service
      .eventos({
        usuario: 'soto',
        accion: ['ORDER_CREATED', 'ORDER_DELETED'],
        entityType: '',
        rol: null,
        desde: '2026-11-01',
        page: 0,
        size: 20,
      })
      .subscribe();
    const req = http.expectOne((r) => r.url === `${base}/events`);
    expect(req.request.params.getAll('accion')).toEqual(['ORDER_CREATED', 'ORDER_DELETED']);
    expect(req.request.params.get('usuario')).toBe('soto');
    expect(req.request.params.get('desde')).toBe('2026-11-01');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.has('entityType')).toBe(false);
    expect(req.request.params.has('rol')).toBe(false);
    expect(req.request.urlWithParams).toBe(
      `${base}/events?usuario=soto&accion=ORDER_CREATED&accion=ORDER_DELETED&desde=2026-11-01&page=0&size=20`,
    );
  });

  it('sin filtros pide /events sin query', () => {
    service.eventos().subscribe();
    http.expectOne(`${base}/events`);
  });

  it('rutas con id codifican el valor', () => {
    service.evento('abc 1').subscribe();
    http.expectOne(`${base}/events/abc%201`);
    service.timelinePedido(42).subscribe();
    http.expectOne(`${base}/orders/42/timeline`);
    service.timelineActor('oid-1', { desde: '2026-11-01', size: 5 }).subscribe();
    http.expectOne(`${base}/actors/oid-1/timeline?desde=2026-11-01&size=5`);
    service.mensajeFallido(7).subscribe();
    http.expectOne(`${base}/dead-letters/7`);
  });

  it('tipos de evento, resumen y mensajes fallidos', () => {
    service.tiposEvento().subscribe();
    http.expectOne(`${base}/event-types`);
    service.resumen().subscribe();
    http.expectOne(`${base}/summary`);
    service.resumen('2026-11-01', '2026-11-02').subscribe();
    http.expectOne(`${base}/summary?desde=2026-11-01&hasta=2026-11-02`);
    service.mensajesFallidos({ topic: 'audit.timeline', page: 1 }).subscribe();
    http.expectOne(`${base}/dead-letters?topic=audit.timeline&page=1`);
  });
});
