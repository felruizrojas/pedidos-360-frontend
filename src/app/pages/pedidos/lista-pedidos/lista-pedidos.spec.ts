import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiErrorInterceptor } from '../../../core/interceptors/api-error.interceptor';
import { authStateCon, pedidoEjemplo } from '../pedidos-test-utils';
import { ListaPedidos } from './lista-pedidos';

describe('ListaPedidos', () => {
  const url = `${environment.apiBaseUrl}/api/orders`;
  let fixture: ComponentFixture<ListaPedidos>;
  let http: HttpTestingController;

  async function montar(...roles: string[]): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ListaPedidos],
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        authStateCon(...roles),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ListaPedidos);
    fixture.detectChanges();
  }

  const el = () => fixture.nativeElement as HTMLElement;
  afterEach(() => http.verify());

  it('pide la primera página y muestra los pedidos con estado y total', async () => {
    await montar('Operador');
    const req = http.expectOne((r) => r.url === url);
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.has('estado')).toBe(false);
    req.flush({ contenido: [pedidoEjemplo()], pagina: 0, tamano: 10, totalElementos: 1, totalPaginas: 1 });
    fixture.detectChanges();
    expect(el().querySelector('h1')?.textContent).toContain('Pedidos');
    expect(el().textContent).toContain('#15');
    expect(el().textContent).toContain('María Pérez');
    expect(el().textContent).toContain('Creado');
    expect(el().textContent).toMatch(/2[.,]700/);
  });

  it('un Cliente ve "Mis pedidos" sin la columna de cliente', async () => {
    await montar('Cliente');
    http.expectOne((r) => r.url === url).flush({ contenido: [pedidoEjemplo()], pagina: 0, tamano: 10, totalElementos: 1, totalPaginas: 1 });
    fixture.detectChanges();
    expect(el().querySelector('h1')?.textContent).toContain('Mis pedidos');
    expect(el().querySelector('thead')?.textContent).not.toContain('Cliente');
  });

  it('aplica los filtros de estado y fechas', async () => {
    await montar('Admin');
    http.expectOne((r) => r.url === url).flush({ contenido: [], pagina: 0, tamano: 10, totalElementos: 0, totalPaginas: 0 });
    fixture.detectChanges();

    const set = (sel: string, valor: string, evento = 'input') => {
      const campo = el().querySelector<HTMLInputElement | HTMLSelectElement>(sel)!;
      campo.value = valor;
      campo.dispatchEvent(new Event(evento));
    };
    set('#filtro-estado', 'ENTREGADO', 'change');
    set('#filtro-desde', '2026-10-01');
    set('#filtro-hasta', '2026-10-31');
    el().querySelector<HTMLButtonElement>('button[type="submit"]')!.click();

    const req = http.expectOne((r) => r.url === url);
    expect(req.request.params.get('estado')).toBe('ENTREGADO');
    expect(req.request.params.get('desde')).toBe('2026-10-01');
    expect(req.request.params.get('hasta')).toBe('2026-10-31');
    expect(req.request.params.get('page')).toBe('0');
    req.flush({ contenido: [], pagina: 0, tamano: 10, totalElementos: 0, totalPaginas: 0 });
    fixture.detectChanges();
    expect(el().textContent).toContain('No hay pedidos que coincidan con los filtros.');
  });

  it('rechaza un rango de fechas invertido sin llamar al back', async () => {
    await montar('Admin');
    http.expectOne((r) => r.url === url).flush({ contenido: [], pagina: 0, tamano: 10, totalElementos: 0, totalPaginas: 0 });
    fixture.detectChanges();
    const desde = el().querySelector<HTMLInputElement>('#filtro-desde')!;
    desde.value = '2026-10-31';
    desde.dispatchEvent(new Event('input'));
    const hasta = el().querySelector<HTMLInputElement>('#filtro-hasta')!;
    hasta.value = '2026-10-01';
    hasta.dispatchEvent(new Event('input'));
    el().querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();
    http.expectNone((r) => r.url === url);
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('no puede ser posterior');
  });

  it('muestra error de servicio con reintento', async () => {
    await montar('Operador');
    http.expectOne((r) => r.url === url).flush(null, { status: 503, statusText: 'x' });
    fixture.detectChanges();
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('no está disponible');
  });
});
