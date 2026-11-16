import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthState } from '../../core/services/auth-state';
import { pedidoEjemplo } from '../pedidos/pedidos-test-utils';
import { Inicio } from './inicio';

describe('Inicio', () => {
  let fixture: ComponentFixture<Inicio>;
  let http: HttpTestingController;
  const el = () => fixture.nativeElement as HTMLElement;
  const url = `${environment.apiBaseUrl}/api/orders`;

  async function crear(logueado: boolean, ...roles: string[]) {
    await TestBed.configureTestingModule({
      imports: [Inicio],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: AuthState,
          useValue: { estaLogueado: signal(logueado).asReadonly(), roles: signal(roles).asReadonly(), nombre: signal(null).asReadonly() },
        },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
  }

  /** El bloque es @defer: espera a que cargue y haga su petición. */
  async function esperarPeticion(): Promise<TestRequest> {
    for (let i = 0; i < 20; i++) {
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r, 0));
      const reqs = http.match((r) => r.url === url);
      if (reqs.length) {
        return reqs[0];
      }
    }
    throw new Error('No llegó la petición de pedidos');
  }

  async function esperar() {
    for (let i = 0; i < 5; i++) {
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  afterEach(() => http.verify());

  it('un visitante anónimo ve la landing sin ninguna llamada al backend', async () => {
    await crear(false);
    await esperar();
    http.expectNone(() => true);
    expect(el().querySelector('h1')!.textContent).toContain('Pedidos 360');
    expect(el().textContent).not.toContain('Tus últimos pedidos');
  });

  it('Admin u Operador: la landing queda igual (sin llamadas)', async () => {
    await crear(true, 'Admin', 'Operador');
    await esperar();
    http.expectNone(() => true);
    expect(el().textContent).not.toContain('Tus últimos pedidos');
  });

  it('un Cliente ve sus 3 últimos pedidos con estado y enlace al detalle', async () => {
    await crear(true, 'Cliente');
    const req = await esperarPeticion();
    expect(req.request.params.get('size')).toBe('3');
    req.flush({
      contenido: [
        pedidoEjemplo({ id: 3, estado: 'EN_PREPARACION', total: 1800 }),
        pedidoEjemplo({ id: 2, estado: 'CANCELADO', total: 1500 }),
        pedidoEjemplo({ id: 1, estado: 'ENTREGADO', total: 2700 }),
      ],
      pagina: 0, tamano: 3, totalElementos: 5, totalPaginas: 2,
    });
    await esperar();

    expect(el().textContent).toContain('Tus últimos pedidos');
    const enlaces = [...el().querySelectorAll('section a[href^="/pedidos/"]')];
    expect(enlaces.map((a) => a.getAttribute('href'))).toEqual(['/pedidos/3', '/pedidos/2', '/pedidos/1']);
    expect(enlaces[0].textContent).toContain('Pedido #3');
    expect(enlaces[0].textContent).toContain('1.800');
    expect(enlaces[0].textContent).toContain('En preparación');
  });

  it('un Cliente sin pedidos ve "Ir al catálogo"', async () => {
    await crear(true, 'Cliente');
    (await esperarPeticion()).flush({ contenido: [], pagina: 0, tamano: 3, totalElementos: 0, totalPaginas: 0 });
    await esperar();
    const enlace = [...el().querySelectorAll('a')].find((a) => a.textContent!.includes('Ir al catálogo'))!;
    expect(enlace.getAttribute('href')).toBe('/catalogo');
  });
});
