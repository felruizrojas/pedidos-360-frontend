import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiErrorInterceptor } from '../../../core/interceptors/api-error.interceptor';
import { EstadosActivos, Kpis, LeadTime, TopProductos, VentasPorHora } from '../../../core/models/report.model';
import { INTERVALO_REFRESCO_MS, MENSAJE_NO_DISPONIBLE, Reportes } from './reportes';

const base = `${environment.apiBaseUrl}/api/report`;

const rango = { desde: '2026-11-13T03:00:00Z', hasta: '2026-11-13T16:00:00Z', zonaHoraria: 'America/Santiago', nombre: 'last24h' };
const comun = { rango, generadoEn: '2026-11-13T16:00:00Z', ultimoEventoProcesadoEn: new Date(Date.now() - 5 * 60_000).toISOString() };

const KPIS: Kpis = {
  ...comun,
  ventas: { monto: 4500, cantidadPedidos: 2, ticketPromedio: 2250 },
  pedidosCreados: 4,
  pedidosEntregados: 1,
  pedidosCancelados: 1,
  tasaCancelacion: 25,
  clientesActivos: 2,
  leadTime: { promedioMin: 85, p50Min: 80, p90Min: 130, minMin: 40, maxMin: 130, muestras: 3 },
  estadosActivos: { CREADO: 1, ACEPTADO: 0, EN_PREPARACION: 1, DESPACHADO: 0 },
  totalActivos: 2,
};
const VENTAS: VentasPorHora = {
  ...comun,
  granularidad: 'HORA',
  serie: [
    { hora: '2026-11-13T12:00:00-03:00', etiqueta: '13-11 12:00', pedidos: 0, monto: 0 },
    { hora: '2026-11-13T13:00:00-03:00', etiqueta: '13-11 13:00', pedidos: 2, monto: 4500 },
  ],
};
const LEAD: LeadTime = {
  ...comun,
  leadTime: KPIS.leadTime,
  distribucion: [
    { bucket: '<30m', cantidad: 0 },
    { bucket: '30-60m', cantidad: 1 },
    { bucket: '1-2h', cantidad: 1 },
    { bucket: '2-4h', cantidad: 1 },
    { bucket: '4-8h', cantidad: 0 },
    { bucket: '>8h', cantidad: 0 },
  ],
  serie: [{ dia: '2026-11-13', promedioMin: 85, muestras: 3 }],
};
const TOP: TopProductos = {
  ...comun,
  orden: 'CANTIDAD',
  limite: 5,
  productos: [
    { productoId: 1, productoNombre: 'Pan Amasado', cantidad: 5, monto: 3000 },
    { productoId: 4, productoNombre: 'Café Americano', cantidad: 1, monto: 1500 },
  ],
};
const ACTIVOS: EstadosActivos = {
  ...comun,
  rango: { desde: null, hasta: '2026-11-13T16:00:00Z', zonaHoraria: null, nombre: 'actual' },
  estadosActivos: KPIS.estadosActivos,
  totalActivos: 2,
  masAntiguos: [
    { pedidoId: 3, estado: 'EN_PREPARACION', clienteNombre: 'Beto', creadoEn: '2026-11-13T12:00:00Z', minutosAbierto: 180 },
    { pedidoId: 4, estado: 'CREADO', clienteNombre: 'Beto', creadoEn: '2026-11-13T15:30:00Z', minutosAbierto: 30 },
  ],
};

describe('Reportes (dashboard)', () => {
  let fixture: ComponentFixture<Reportes>;
  let http: HttpTestingController;

  const el = () => fixture.nativeElement as HTMLElement;
  const bloque = (nombre: string) => el().querySelector(`[data-bloque="${nombre}"]`) as HTMLElement;
  const kpi = (titulo: string) => el().querySelector(`[data-kpi="${titulo}"]`)?.textContent?.replace(/\s+/g, ' ');

  function peticion(ruta: string): TestRequest {
    return http.expectOne((r) => r.url === `${base}/${ruta}`);
  }

  /** Responde las 5 peticiones del panel; `ruta: null` = 503. Devuelve el range con que se pidió. */
  function responderTodo(fallar: string[] = []): string | null {
    const respuestas: Record<string, object> = {
      kpis: KPIS,
      'sales-by-hour': VENTAS,
      'lead-time': LEAD,
      'top-products': TOP,
      'active-states': ACTIVOS,
    };
    let range: string | null = null;
    for (const [ruta, cuerpo] of Object.entries(respuestas)) {
      const req = peticion(ruta);
      if (ruta === 'kpis') {
        range = req.request.params.get('range');
      }
      if (fallar.includes(ruta)) {
        req.flush(null, { status: 503, statusText: 'Service Unavailable' });
      } else {
        req.flush(cuerpo);
      }
    }
    fixture.detectChanges();
    return range;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reportes],
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  function crear() {
    fixture = TestBed.createComponent(Reportes);
    fixture.detectChanges();
  }

  it('pinta los KPIs formateados (CLP, %, minutos) y los 4 gráficos', () => {
    crear();
    expect(responderTodo()).toBe('last24h');

    expect(kpi('Ventas')).toContain('4.500');
    expect(kpi('Ventas')).toContain('$');
    expect(kpi('Pedidos con venta')).toContain('2');
    expect(kpi('Ticket promedio')).toContain('2.250');
    expect(kpi('Pedidos creados')).toContain('4');
    expect(kpi('Cancelación')).toContain('25 %');
    expect(kpi('Clientes activos')).toContain('2');
    expect(kpi('Lead time promedio')).toContain('1 h 25 min');
    expect(kpi('Lead time p90')).toContain('2 h 10 min');

    expect(bloque('ventas').querySelectorAll('rect.barra')).toHaveLength(2);
    expect(bloque('lead-time').querySelectorAll('rect.barra')).toHaveLength(6);
    expect(bloque('top').querySelectorAll('rect.barra')).toHaveLength(2);
    expect(bloque('activos').textContent).toContain('#3');
    // > 2 h abierto → ámbar
    const filas = bloque('activos').querySelectorAll('tbody tr');
    expect(filas[0].getAttribute('data-atascado')).toBe('true');
    expect(filas[1].getAttribute('data-atascado')).toBe('false');

    const estado = el().querySelector('[role="status"][aria-live]')!.textContent!;
    expect(estado).toMatch(/Actualizado \d{2}:\d{2}:\d{2}/);
    expect(estado).toContain('último evento procesado hace 5 min');
  });

  it('cambiar el rango vuelve a pedir todo con el range nuevo y lo deja en la URL', async () => {
    crear();
    responderTodo();

    const boton = [...el().querySelectorAll('button')].find((b) => b.textContent!.trim() === '7 días')!;
    boton.click();
    fixture.detectChanges();
    expect(responderTodo()).toBe('last7d');
    expect(boton.getAttribute('aria-pressed')).toBe('true');

    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toContain('rango=last7d');
  });

  it('cambiar el orden del top solo vuelve a pedir top-products, con orden=monto', async () => {
    crear();
    responderTodo();

    [...bloque('top').querySelectorAll('button')].find((b) => b.textContent!.trim() === 'Monto')!.click();
    fixture.detectChanges();
    const req = peticion('top-products');
    expect(req.request.params.get('orden')).toBe('monto');
    req.flush({ ...TOP, orden: 'MONTO' });
    fixture.detectChanges();
    http.expectNone(`${base}/kpis`);
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toContain('orden=monto');
  });

  it('un bloque con 503 muestra su aviso y los demás siguen', () => {
    crear();
    responderTodo(['sales-by-hour']);

    expect(bloque('ventas').querySelector('[role="alert"]')!.textContent).toContain(MENSAJE_NO_DISPONIBLE);
    expect(bloque('lead-time').querySelector('[role="alert"]')).toBeNull();
    expect(bloque('lead-time').querySelectorAll('rect.barra')).toHaveLength(6);
    expect(kpi('Ventas')).toContain('4.500');
  });

  it('si fallan los KPIs se puede reintentar sin romper la página', () => {
    crear();
    responderTodo(['kpis']);
    const alerta = el().querySelector('section[aria-labelledby="titulo-kpis"] [role="alert"]')!;
    expect(alerta.textContent).toContain(MENSAJE_NO_DISPONIBLE);
    alerta.querySelector('button')!.click();
    responderTodo();
    expect(kpi('Ventas')).toContain('4.500');
  });

  it('se refresca cada 30 s, se puede pausar y deja de pedir al destruirse', () => {
    vi.useFakeTimers();
    crear();
    responderTodo();

    vi.advanceTimersByTime(INTERVALO_REFRESCO_MS);
    expect(responderTodo()).toBe('last24h');

    const pausa = [...el().querySelectorAll('button')].find((b) => b.textContent!.trim() === 'Pausar')!;
    pausa.click();
    fixture.detectChanges();
    vi.advanceTimersByTime(INTERVALO_REFRESCO_MS * 3);
    http.expectNone(`${base}/kpis?range=last24h`);
    expect(pausa.textContent!.trim()).toBe('Reanudar');

    pausa.click();
    fixture.detectChanges();
    vi.advanceTimersByTime(INTERVALO_REFRESCO_MS);
    responderTodo();

    fixture.destroy();
    vi.advanceTimersByTime(INTERVALO_REFRESCO_MS * 2);
    http.expectNone((r) => r.url.startsWith(base));
  });

  it('con la pestaña oculta no se refresca, y al volver pide de inmediato', () => {
    vi.useFakeTimers();
    crear();
    responderTodo();

    const visibilidad = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(INTERVALO_REFRESCO_MS * 2);
    http.expectNone((r) => r.url.startsWith(base));

    visibilidad.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    responderTodo();
    visibilidad.mockRestore();
  });
});
