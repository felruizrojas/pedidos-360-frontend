import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { environment } from '../../../../environments/environment';
import { apiErrorInterceptor } from '../../../core/interceptors/api-error.interceptor';
import { Pagina, Pedido } from '../../../core/models/pedido.model';
import { AuthState } from '../../../core/services/auth-state';
import { pedidoEjemplo } from '../../../pages/pedidos/pedidos-test-utils';
import { Bienvenida } from './bienvenida';

const api = environment.apiBaseUrl;

const pagina = (contenido: Pedido[], total: number): Pagina<Pedido> => ({
  contenido, pagina: 0, tamano: 5, totalElementos: total, totalPaginas: 1,
});

describe('Bienvenida (inicio del dashboard por rol)', () => {
  let fixture: ComponentFixture<Bienvenida>;
  let http: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;
  const tick = () => new Promise((r) => setTimeout(r, 0));

  async function crear(...roles: string[]) {
    await TestBed.configureTestingModule({
      imports: [Bienvenida],
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MsalService, useValue: { instance: { getActiveAccount: () => null } } },
        {
          provide: AuthState,
          useValue: { roles: signal(roles).asReadonly(), nombre: signal('Test').asReadonly(), cargarRoles: () => Promise.resolve(roles) },
        },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Bienvenida);
    fixture.detectChanges();
    await tick(); // ngOnInit espera los roles
  }

  afterEach(() => http.verify());

  const kpisHoy = {
    rango: { desde: null, hasta: '', zonaHoraria: 'America/Santiago', nombre: 'today' },
    generadoEn: '', ultimoEventoProcesadoEn: null,
    ventas: { monto: 4500, cantidadPedidos: 2, ticketPromedio: 2250 },
    pedidosCreados: 4, pedidosEntregados: 1, pedidosCancelados: 1, tasaCancelacion: 25, clientesActivos: 3,
    leadTime: { promedioMin: 85, p50Min: 80, p90Min: 130, minMin: 40, maxMin: 130, muestras: 3 },
    estadosActivos: { CREADO: 1, ACEPTADO: 0, EN_PREPARACION: 1, DESPACHADO: 0 }, totalActivos: 2,
  };
  const resumen = { desde: '', hasta: '', total: 7, porAccion: [{ clave: 'ORDER_CREATED', cantidad: 7 }], porRol: [], topActores: [] };

  it('Admin ve los KPIs de hoy (ventas, pedidos activos, clientes activos, lead time) y la auditoría de 24 h', async () => {
    await crear('Admin');
    http.expectOne(`${api}/api/report/kpis?range=today`).flush(kpisHoy);
    http.expectOne(`${api}/api/audit/summary`).flush(resumen);
    fixture.detectChanges();

    const kpi = (t: string) => el().querySelector(`[data-kpi="${t}"]`)!.textContent!;
    expect(kpi('Ventas de hoy')).toContain('4.500');
    expect(kpi('Pedidos activos')).toContain('2');
    expect(kpi('Clientes activos')).toContain('3');
    expect(kpi('Lead time promedio')).toContain('1 h 25 min');
    expect(el().querySelector('[data-bloque="auditoria"]')!.textContent).toContain('7');
    expect(el().querySelector('a[href="/dashboard/reportes"]')).not.toBeNull();
    // Y las tarjetas de sus secciones
    expect(el().textContent).toContain('Catálogo');
    expect(el().textContent).toContain('Auditoría');
    expect(el().querySelector('[data-bloque="pedidos"]')).toBeNull();
  });

  it('un fallo de report no rompe la bienvenida: aviso discreto y el resto igual', async () => {
    await crear('Admin');
    http.expectOne(`${api}/api/report/kpis?range=today`).flush(null, { status: 503, statusText: 'x' });
    http.expectOne(`${api}/api/audit/summary`).flush(resumen);
    fixture.detectChanges();
    expect(el().querySelector('[data-bloque="kpis"]')!.textContent).toContain('No se pudieron cargar los indicadores');
    expect(el().querySelector('[data-bloque="kpis"] [role="alert"]')).toBeNull();
    expect(el().querySelector('[data-bloque="auditoria"]')!.textContent).toContain('7');
    expect(el().textContent).toContain('Bienvenido');
  });

  it('Operador ve pendientes de aceptar y en curso (una llamada por estado)', async () => {
    await crear('Operador');
    const porEstado = (estado: string) =>
      http.expectOne((r) => r.url === `${api}/api/orders` && r.params.get('estado') === estado && r.params.get('size') === '5');
    porEstado('CREADO').flush(pagina([pedidoEjemplo({ id: 20 }), pedidoEjemplo({ id: 19 })], 2));
    porEstado('ACEPTADO').flush(pagina([pedidoEjemplo({ id: 10, estado: 'ACEPTADO', creadoEn: '2026-11-13T10:00:00Z' })], 1));
    porEstado('EN_PREPARACION').flush(pagina([pedidoEjemplo({ id: 11, estado: 'EN_PREPARACION', creadoEn: '2026-11-13T12:00:00Z' })], 3));
    porEstado('DESPACHADO').flush(pagina([], 0));
    fixture.detectChanges();

    const pendientes = el().querySelector('[data-grupo="pendientes"]')!;
    expect(pendientes.textContent).toContain('(2)');
    expect(pendientes.querySelector('a')!.getAttribute('href')).toBe('/dashboard/pedidos/20');
    const enCurso = el().querySelector('[data-grupo="en-curso"]')!;
    expect(enCurso.textContent).toContain('(4)');
    // Más reciente primero entre estados
    expect([...enCurso.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual([
      '/dashboard/pedidos/11',
      '/dashboard/pedidos/10',
    ]);
    expect(el().querySelector('[data-bloque="kpis"]')).toBeNull();
    expect(el().querySelector('[data-bloque="auditoria"]')).toBeNull();
  });

  it('Auditor solo ve la auditoría (sin KPIs ni pedidos)', async () => {
    await crear('Auditor');
    http.expectOne(`${api}/api/audit/summary`).flush(resumen);
    http.expectNone((r) => r.url.includes('/api/report') || r.url.includes('/api/orders'));
    fixture.detectChanges();
    expect(el().querySelector('[data-bloque="auditoria"]')).not.toBeNull();
    expect(el().querySelector('[data-bloque="kpis"]')).toBeNull();
    expect(el().querySelector('[data-bloque="pedidos"]')).toBeNull();
    expect(el().textContent).not.toContain('Catálogo');
  });
});
