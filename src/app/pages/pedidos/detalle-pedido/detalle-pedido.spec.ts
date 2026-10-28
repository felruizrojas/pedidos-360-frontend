import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { apiErrorInterceptor } from '../../../core/interceptors/api-error.interceptor';
import { Pedido } from '../../../core/models/pedido.model';
import { authStateCon, pedidoEjemplo } from '../pedidos-test-utils';
import { DetallePedido } from './detalle-pedido';

describe('DetallePedido', () => {
  const url = `${environment.apiBaseUrl}/api/orders/15`;
  let fixture: ComponentFixture<DetallePedido>;
  let http: HttpTestingController;

  async function montar(roles: string[], pedido: Pedido): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [DetallePedido],
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '15' })) } },
        authStateCon(...roles),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DetallePedido);
    fixture.detectChanges();
    http.expectOne(url).flush(pedido);
    fixture.detectChanges();
    http.expectOne(`${url}/history`).flush([
      { estadoAnterior: null, estadoNuevo: 'CREADO', usuarioId: 'a', usuarioNombre: 'María Pérez', usuarioRol: 'Cliente',
        fecha: '2026-10-20T15:04:05.123Z', comentario: null },
    ]);
    fixture.detectChanges();
  }

  const el = () => fixture.nativeElement as HTMLElement;
  const botones = () => [...el().querySelectorAll('button')].map((b) => b.textContent!.trim());
  const boton = (texto: string) => [...el().querySelectorAll('button')].find((b) => b.textContent!.trim() === texto)!;

  afterEach(() => http.verify());

  it('muestra detalle, ítems, total e historial', async () => {
    await montar(['Operador'], pedidoEjemplo());
    const texto = el().textContent!;
    expect(texto).toContain('Pedido #15');
    expect(texto).toContain('Av. Providencia 1234, Santiago');
    expect(texto).toContain('Pan Amasado');
    expect(texto).toContain('Creado');
    expect(el().querySelectorAll('ol li')).toHaveLength(1);
  });

  it('Operador en CREADO: aceptar, cancelar, editar y eliminar; no puede despachar sin aceptar', async () => {
    await montar(['Operador'], pedidoEjemplo());
    expect(botones()).toEqual(
      expect.arrayContaining(['Aceptar pedido', 'Cancelar pedido', 'Editar pedido', 'Eliminar pedido']),
    );
    expect(botones()).not.toContain('Despachar pedido');
  });

  it('Cliente en CREADO: solo cancelar y editar', async () => {
    await montar(['Cliente'], pedidoEjemplo());
    expect(botones()).toContain('Cancelar pedido');
    expect(botones()).toContain('Editar pedido');
    expect(botones()).not.toContain('Aceptar pedido');
  });

  it('Cliente en ACEPTADO: sin acciones', async () => {
    await montar(['Cliente'], pedidoEjemplo({ estado: 'ACEPTADO' }));
    expect(el().textContent).not.toContain('Acciones');
  });

  it('Operador en CANCELADO: solo puede eliminar', async () => {
    await montar(['Operador'], pedidoEjemplo({ estado: 'CANCELADO' }));
    expect(botones()).toEqual(['Eliminar pedido']);
  });

  it('Admin no es actor de pedidos: sin acciones', async () => {
    await montar(['Admin'], pedidoEjemplo());
    expect(el().textContent).not.toContain('Acciones');
  });

  it('muestra el 409 de orders en un role="alert"', async () => {
    await montar(['Operador'], pedidoEjemplo());
    boton('Aceptar pedido').click();
    fixture.detectChanges();
    boton('Confirmar: Aceptar pedido').click();
    const req = http.expectOne(`${url}/status`);
    expect(req.request.body).toEqual({ status: 'ACEPTADO' });
    req.flush(
      { status: 409, mensaje: 'Stock insuficiente para "Pan Amasado" (id 1): solicitado 2, disponible 1',
        detalles: { productoId: 1, solicitado: 2, disponible: 1 } },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();
    const alerta = el().querySelector('[role="alert"]');
    expect(alerta?.textContent).toContain('Stock insuficiente para "Pan Amasado"');
  });

  it('cancelar exige motivo y lo envía como comentario', async () => {
    await montar(['Cliente'], pedidoEjemplo());
    boton('Cancelar pedido').click();
    fixture.detectChanges();
    boton('Confirmar: Cancelar pedido').click();
    fixture.detectChanges();
    expect(el().textContent).toContain('Indica el motivo de la cancelación.');
    http.expectNone(`${url}/status`);

    const motivo = el().querySelector<HTMLTextAreaElement>('#comentario')!;
    motivo.value = 'Me equivoqué de dirección';
    motivo.dispatchEvent(new Event('input'));
    boton('Confirmar: Cancelar pedido').click();
    const req = http.expectOne(`${url}/status`);
    expect(req.request.body).toEqual({ status: 'CANCELADO', comentario: 'Me equivoqué de dirección' });
    req.flush(pedidoEjemplo({ estado: 'CANCELADO', motivoCancelacion: 'Me equivoqué de dirección' }));
    fixture.detectChanges();
    http.expectOne(`${url}/history`).flush([]);
    fixture.detectChanges();
    expect(el().textContent).toContain('El pedido pasó a "Cancelado"');
  });

  it('pedido inexistente: mensaje de no encontrado', async () => {
    await TestBed.configureTestingModule({
      imports: [DetallePedido],
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '99' })) } },
        authStateCon('Cliente'),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DetallePedido);
    fixture.detectChanges();
    http.expectOne(`${environment.apiBaseUrl}/api/orders/99`).flush({ mensaje: 'Pedido 99 no encontrado' }, { status: 404, statusText: 'x' });
    fixture.detectChanges();
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('no existe o no tienes acceso');
  });
});
