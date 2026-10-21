import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiErrorInterceptor } from '../../../core/interceptors/api-error.interceptor';
import { CarritoService } from '../../../core/services/carrito';
import { pedidoEjemplo } from '../pedidos-test-utils';
import { NuevoPedido } from './nuevo-pedido';

describe('NuevoPedido', () => {
  const url = `${environment.apiBaseUrl}/api/orders`;
  let fixture: ComponentFixture<NuevoPedido>;
  let http: HttpTestingController;
  let carrito: CarritoService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [NuevoPedido],
      providers: [provideHttpClient(withInterceptors([apiErrorInterceptor])), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    carrito = TestBed.inject(CarritoService);
  });

  afterEach(() => http.verify());

  const el = () => fixture.nativeElement as HTMLElement;
  function montar(): void {
    fixture = TestBed.createComponent(NuevoPedido);
    fixture.detectChanges();
  }
  function escribirDireccion(valor: string): void {
    const input = el().querySelector<HTMLInputElement>('#direccionEntrega')!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }
  const confirmar = () => el().querySelector<HTMLButtonElement>('button[type="submit"]')!.click();

  it('con el carrito vacío invita a ir al catálogo', () => {
    montar();
    expect(el().textContent).toContain('Tu carrito está vacío.');
  });

  it('exige la dirección antes de enviar', () => {
    carrito.agregar({ id: 1, nombre: 'Pan Amasado', precio: 600, stock: 10 }, 2);
    montar();
    confirmar();
    fixture.detectChanges();
    expect(el().textContent).toContain('La dirección de entrega es obligatoria.');
    http.expectNone(url);
  });

  it('crea el pedido, vacía el carrito y va al detalle', () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    carrito.agregar({ id: 1, nombre: 'Pan Amasado', precio: 600, stock: 10 }, 2);
    carrito.agregar({ id: 4, nombre: 'Café Americano', precio: 1500, stock: 3 }, 1);
    montar();
    expect(el().textContent).toMatch(/2[.,]700/);
    escribirDireccion('  Av. Providencia 1234, Santiago ');
    confirmar();

    const req = http.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      direccionEntrega: 'Av. Providencia 1234, Santiago',
      items: [{ productoId: 1, cantidad: 2 }, { productoId: 4, cantidad: 1 }],
    });
    req.flush(pedidoEjemplo(), { status: 201, statusText: 'Created' });
    expect(carrito.vacio()).toBe(true);
    expect(navegar).toHaveBeenCalledWith(['/pedidos', 15]);
  });

  it('muestra los errores 400 por campo', () => {
    carrito.agregar({ id: 99, nombre: 'Fantasma', precio: 1, stock: 1 }, 1);
    montar();
    escribirDireccion('Los Leones 456');
    confirmar();
    http.expectOne(url).flush(
      { mensaje: 'Error de validación', detalles: { 'items[0].productoId': 'El producto 99 no existe en el catálogo' } },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();
    expect(el().textContent).toContain('El producto 99 no existe en el catálogo');
    expect(carrito.vacio()).toBe(false);
  });
});
