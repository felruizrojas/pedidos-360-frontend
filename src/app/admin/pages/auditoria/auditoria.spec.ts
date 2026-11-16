import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiErrorInterceptor } from '../../../core/interceptors/api-error.interceptor';
import { EventoAuditoria, PaginaAuditoria, ResumenAuditoria } from '../../../core/models/audit.model';
import { Auditoria } from './auditoria';
import { MENSAJE_AUDIT_NO_DISPONIBLE } from './auditoria-util';

const base = `${environment.apiBaseUrl}/api/audit`;

function evento(id: string, accion: string, ocurridoEn: string, cambios: Partial<EventoAuditoria> = {}): EventoAuditoria {
  return {
    eventId: id,
    accion,
    entidad: { tipo: 'PEDIDO', id: '42' },
    quien: { id: 'oid-juan', nombre: 'Juan Soto', email: 'juan@pedidos360.cl', rol: 'Operador' },
    que: { descripcion: `Pedido #42 ${accion}`, estadoAnterior: null, estadoNuevo: null, comentario: null },
    cuando: { ocurridoEn, recibidoEn: ocurridoEn },
    donde: { servicio: 'ms-pedidos360-orders', ip: '203.0.113.10', userAgent: 'Mozilla/5.0' },
    correlationId: 'req-1',
    ...cambios,
  };
}

const pagina = (contenido: EventoAuditoria[], total = contenido.length, numero = 0): PaginaAuditoria<EventoAuditoria> => ({
  contenido,
  pagina: numero,
  tamano: 20,
  totalElementos: total,
  totalPaginas: Math.ceil(total / 20),
});

const RESUMEN: ResumenAuditoria = {
  desde: '2026-11-12T16:00:00Z',
  hasta: '2026-11-13T16:00:00Z',
  total: 7,
  porAccion: [
    { clave: 'ORDER_STATUS_CHANGED', cantidad: 5 },
    { clave: 'ORDER_CREATED', cantidad: 2 },
  ],
  porRol: [{ clave: 'Operador', cantidad: 5 }],
  topActores: [{ id: 'oid-juan', nombre: 'Juan Soto', cantidad: 5 }],
};

describe('Auditoria (dashboard)', () => {
  let fixture: ComponentFixture<Auditoria>;
  let http: HttpTestingController;
  let router: Router;

  const el = () => fixture.nativeElement as HTMLElement;
  const boton = (texto: string) =>
    [...el().querySelectorAll('button')].find((b) => b.textContent!.trim() === texto) as HTMLButtonElement;
  const peticion = (ruta: string): TestRequest => http.expectOne((r) => r.url === `${base}${ruta}`);

  /** Las 3 peticiones de la pestaña Eventos al entrar. Devuelve la de /events. */
  function responderEventos(contenido: EventoAuditoria[], total = contenido.length): TestRequest {
    const req = peticion('/events');
    req.flush(pagina(contenido, total, Number(req.request.params.get('page') ?? 0)));
    return req;
  }

  async function navegar(queryParams: Record<string, string>): Promise<void> {
    await router.navigate([], { queryParams });
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Auditoria],
      providers: [provideHttpClient(withInterceptors([apiErrorInterceptor])), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(Auditoria);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function entrar(contenido: EventoAuditoria[] = [evento('e1', 'ORDER_CREATED', '2026-11-13T14:00:00Z')]): void {
    peticion('/event-types').flush([
      { accion: 'ORDER_STATUS_CHANGED', cantidad: 5 },
      { accion: 'ORDER_CREATED', cantidad: 2 },
    ]);
    peticion('/summary').flush(RESUMEN);
    responderEventos(contenido);
    fixture.detectChanges();
  }

  it('lista los eventos con badge por acción (neutro si es desconocida), quién y desde dónde, y el resumen', () => {
    entrar([
      evento('e1', 'ORDER_CREATED', '2026-11-13T14:00:00Z'),
      evento('e2', 'PRODUCT_CREATED', '2026-11-13T14:05:00Z', { entidad: { tipo: 'PRODUCTO', id: '7' } }),
    ]);
    const filas = [...el().querySelectorAll('tbody tr')];
    expect(filas).toHaveLength(2);
    expect(filas[0].textContent).toContain('Pedido creado');
    expect(filas[0].textContent).toContain('Juan Soto');
    expect(filas[0].textContent).toContain('Operador');
    expect(filas[0].textContent).toContain('ms-pedidos360-orders · 203.0.113.10');
    expect(filas[0].querySelector('span.rounded-full')!.className).toContain('bg-blue-100');
    expect(filas[1].textContent).toContain('PRODUCT_CREATED');
    expect(filas[1].querySelector('span.rounded-full')!.className).toContain('bg-gray-100');

    const resumen = el().querySelector('[data-bloque="resumen"]')!.textContent!;
    expect(resumen).toContain('7');
    expect(resumen).toContain('Cambio de estado');
    expect(resumen).toContain('Juan Soto');
    // Solo lectura
    expect(el().textContent).not.toMatch(/Editar|Eliminar|Borrar/);
  });

  it('los filtros pasan a la URL y a la petición (accion repetida, pedido como entidad, fechas del día local)', async () => {
    entrar();
    const escribir = (id: string, valor: string) => {
      const input = el().querySelector<HTMLInputElement>(id)!;
      input.value = valor;
      input.dispatchEvent(new Event('input'));
    };
    escribir('#filtro-usuario', 'soto');
    escribir('#filtro-desde', '2026-11-10');
    escribir('#filtro-hasta', '2026-11-13');
    escribir('#filtro-numero', '42');
    el().querySelector<HTMLInputElement>('[data-accion="ORDER_CREATED"]')!.click();
    el().querySelector<HTMLInputElement>('[data-accion="ORDER_STATUS_CHANGED"]')!.click();
    boton('Buscar').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toContain('usuario=soto');
    expect(router.url).toContain('accion=ORDER_CREATED&accion=ORDER_STATUS_CHANGED');
    expect(router.url).toContain('numero=42');

    const req = peticion('/events');
    const p = req.request.params;
    expect(p.get('usuario')).toBe('soto');
    expect(p.getAll('accion')).toEqual(['ORDER_CREATED', 'ORDER_STATUS_CHANGED']);
    expect(p.get('entityType')).toBe('PEDIDO');
    expect(p.get('entityId')).toBe('42');
    expect(p.get('desde')).toBe(new Date('2026-11-10T00:00:00').toISOString());
    expect(p.get('hasta')).toBe(new Date('2026-11-13T23:59:59.999').toISOString());
    expect(p.get('page')).toBe('0');
    expect(p.get('size')).toBe('20');
    req.flush(pagina([]));
    peticion('/summary').flush(RESUMEN);
    fixture.detectChanges();
    expect(el().textContent).toContain('No hay eventos que coincidan con los filtros.');

    boton('Limpiar').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(router.url).not.toContain('usuario');
    expect(peticion('/events').request.params.keys()).toEqual(['page', 'size']);
    // Sin fechas, el resumen vuelve a las últimas 24 h
    expect(peticion('/summary').request.params.keys()).toEqual([]);
  });

  it('pagina con el componente de paginación (page 0-based hacia audit)', async () => {
    entrar(Array.from({ length: 20 }, (_, i) => evento(`e${i}`, 'ORDER_CREATED', '2026-11-13T14:00:00Z')));
    // total 45 → 3 páginas
    await navegar({ pagina: '2' });
    const req = peticion('/events');
    expect(req.request.params.get('page')).toBe('1');
    req.flush(pagina([evento('x', 'ORDER_CREATED', '2026-11-13T14:00:00Z')], 45, 1));
    fixture.detectChanges();
    expect(el().querySelector('[aria-current="page"]')!.textContent!.trim()).toBe('2');

    el().querySelector<HTMLButtonElement>('[aria-label="Ir a la página 3"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(router.url).toContain('pagina=3');
    peticion('/events').flush(pagina([], 45, 2));
  });

  it('"Ver detalle" abre el panel con quién/qué/cuándo/dónde, correlationId y el payload formateado', () => {
    entrar();
    boton('Ver detalle').click();
    fixture.detectChanges();
    peticion('/events/e1').flush({
      ...evento('e1', 'ORDER_CREATED', '2026-11-13T14:00:00Z'),
      kafka: { topic: 'audit.timeline', particion: 1, offset: 4 },
      payload: { eventId: 'e1', action: 'ORDER_CREATED' },
    });
    fixture.detectChanges();
    const panel = el().querySelector('#detalle-evento')!;
    expect(panel.textContent).toContain('req-1');
    expect(panel.textContent).toContain('audit.timeline · partición 1 · offset 4');
    expect(panel.querySelector('pre')!.textContent).toContain('"action": "ORDER_CREATED"');
    expect(boton('Copiar')).toBeTruthy();
  });

  it('timeline de pedido: más antiguo primero, duración entre hitos, lead time y clic en el actor', async () => {
    entrar();
    await navegar({ tab: 'timeline', pedido: '42' });
    expect((el().querySelector('#timeline-pedido') as HTMLInputElement).value).toBe('42');
    peticion('/orders/42/timeline').flush([
      evento('t1', 'ORDER_CREATED', '2026-11-13T10:00:00Z', {
        quien: { id: 'oid-ana', nombre: 'Ana Pérez', email: null, rol: 'Cliente' },
        que: { descripcion: 'Pedido #42 creado', estadoAnterior: null, estadoNuevo: 'CREADO', comentario: null },
      }),
      evento('t2', 'ORDER_STATUS_CHANGED', '2026-11-13T10:05:00Z', {
        que: { descripcion: 'x', estadoAnterior: 'CREADO', estadoNuevo: 'ACEPTADO', comentario: 'Confirmado' },
      }),
      evento('t3', 'ORDER_STATUS_CHANGED', '2026-11-13T11:30:00Z', {
        que: { descripcion: 'x', estadoAnterior: 'ACEPTADO', estadoNuevo: 'ENTREGADO', comentario: null },
      }),
    ]);
    fixture.detectChanges();

    const hitos = [...el().querySelectorAll('[data-hito]')];
    expect(hitos).toHaveLength(3);
    expect(hitos[0].textContent).toContain('Pedido creado');
    expect(hitos[0].textContent).toContain('Ana Pérez');
    expect(hitos[0].querySelector('[data-duracion]')).toBeNull();
    expect(hitos[1].textContent).toContain('Aceptado');
    expect(hitos[1].textContent).toContain('Confirmado');
    expect(hitos[1].querySelector('[data-duracion]')!.textContent).toContain('+5 min');
    expect(hitos[2].querySelector('[data-duracion]')!.textContent).toContain('+1 h 25 min');
    expect(el().querySelector('[data-lead-time]')!.textContent).toContain('1 h 30 min');

    el().querySelector<HTMLButtonElement>('[aria-label="Ver los eventos de Ana Pérez"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(router.url).toContain('usuario=oid-ana');
    expect(router.url).not.toContain('tab=');
    peticion('/event-types').flush([]);
    expect(peticion('/events').request.params.get('usuario')).toBe('oid-ana');
    peticion('/summary').flush(RESUMEN);
  });

  it('timeline: un 404 muestra "No hay eventos de auditoría para el pedido #N"', async () => {
    entrar();
    await navegar({ tab: 'timeline', pedido: '999' });
    peticion('/orders/999/timeline').flush({ status: 404, mensaje: 'x' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(el().querySelector('[role="alert"]')!.textContent).toContain('No hay eventos de auditoría para el pedido #999');
  });

  it('pestaña DLT: tabla paginada con detalle expandible (stacktrace y payload)', async () => {
    entrar();
    await navegar({ tab: 'dlt' });
    expect(el().textContent).toContain('dead letter topic');
    const req = peticion('/dead-letters');
    expect(req.request.params.get('page')).toBe('0');
    req.flush({
      contenido: [
        {
          id: 7, topicOriginal: 'audit.timeline', particionOriginal: 1, offsetOriginal: 4, consumerGroup: 'audit-svc',
          clave: 'demo', excepcionClase: 'tools.jackson.core.exc.StreamReadException', excepcionMensaje: 'Unexpected character',
          fallidoEn: '2026-11-13T15:59:41Z', registradoEn: '2026-11-13T15:59:41Z',
          dlt: { topic: 'audit.timeline.audit-svc.DLT', particion: 1, offset: 0 }, payloadResumen: '{malo',
        },
      ],
      pagina: 0, tamano: 20, totalElementos: 1, totalPaginas: 1,
    });
    fixture.detectChanges();
    const fila = el().querySelector('tbody tr')!;
    expect(fila.textContent).toContain('audit.timeline');
    expect(fila.textContent).toContain('1 / 4');
    expect(fila.textContent).toContain('StreamReadException');

    boton('Ver detalle').click();
    fixture.detectChanges();
    peticion('/dead-letters/7').flush({
      id: 7, topicOriginal: 'audit.timeline', particionOriginal: 1, offsetOriginal: 4, timestampOriginal: null,
      consumerGroup: 'audit-svc', clave: 'demo', excepcionClase: 'x', excepcionMensaje: 'Unexpected character',
      stacktrace: 'tools.jackson.core.exc.StreamReadException: Unexpected\n\tat ...', fallidoEn: null,
      registradoEn: '2026-11-13T15:59:41Z', dlt: { topic: 'audit.timeline.audit-svc.DLT', particion: 1, offset: 0 }, payload: '{malo',
    });
    fixture.detectChanges();
    const pres = [...el().querySelectorAll('#dlt-7 pre')].map((p) => p.textContent);
    expect(pres[0]).toBe('{malo');
    expect(pres[1]).toContain('StreamReadException');
  });

  it('si audit responde 503, la pestaña muestra el aviso sin romper la página', () => {
    peticion('/event-types').flush(null, { status: 503, statusText: 'x' });
    peticion('/summary').flush(null, { status: 503, statusText: 'x' });
    peticion('/events').flush(null, { status: 503, statusText: 'x' });
    fixture.detectChanges();
    expect(el().querySelector('[role="alert"]')!.textContent).toContain(MENSAJE_AUDIT_NO_DISPONIBLE);
    expect(el().querySelector('[role="tablist"]')).not.toBeNull();
    expect(el().querySelector('form')).not.toBeNull();
  });
});
