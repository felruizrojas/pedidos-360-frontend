import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { MensajeComando } from '../../../core/models/pedido.model';
import { MensajeriaPedido } from './mensajeria-pedido';

describe('MensajeriaPedido', () => {
  const url = `${environment.apiBaseUrl}/api/orders/15/messages`;
  const pasos: MensajeComando[] = [
    { comando: 'email', type: 'OrderStatusChanged', estado: 'ENVIADO', motivo: null, usuarioNombre: 'Olga', usuarioRol: 'Operador', comandoEventId: 'e-1', fecha: '2026-10-20T15:00:00Z' },
    { comando: 'kitchen', type: 'KitchenTicketRequested', estado: 'ENVIADO', motivo: null, usuarioNombre: 'Olga', usuarioRol: 'Operador', comandoEventId: 'e-2', fecha: '2026-10-20T15:00:00Z' },
    { comando: 'email', type: 'OrderStatusChanged', estado: 'PROCESADO', motivo: null, usuarioNombre: null, usuarioRol: null, comandoEventId: 'e-1', fecha: '2026-10-20T15:00:01Z' },
    { comando: 'kitchen', type: 'KitchenTicketRequested', estado: 'EN_DLQ', motivo: 'Expiró sin que nadie lo consumiera (TTL): quedó en la DLQ', usuarioNombre: null, usuarioRol: null, comandoEventId: 'e-2', fecha: '2026-10-20T15:01:00Z' },
  ];

  it('muestra cada comando con su último estado, el actor y el motivo de la falla', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(MensajeriaPedido);
    fixture.componentRef.setInput('pedidoId', 15);
    fixture.detectChanges();

    http.expectOne(url).flush(pasos);
    fixture.detectChanges();

    const items = Array.from(fixture.nativeElement.querySelectorAll('li') as NodeListOf<HTMLElement>).map((li) => li.textContent ?? '');
    expect(items).toHaveLength(2);
    expect(items[0]).toContain('Correo al cliente');
    expect(items[0]).toContain('Procesado');
    expect(items[0]).toContain('Acción de Olga (Operador)');
    expect(items[1]).toContain('Ticket de cocina');
    expect(items[1]).toContain('En la DLQ');
    expect(items[1]).toContain('Motivo: Expiró sin que nadie lo consumiera');
    http.verify();
  });
});
