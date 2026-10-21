import { signal } from '@angular/core';
import { Pedido } from '../../core/models/pedido.model';
import { AuthState } from '../../core/services/auth-state';

/** AuthState falso con roles fijos (sin MSAL). */
export function authStateCon(...roles: string[]): { provide: typeof AuthState; useValue: Partial<AuthState> } {
  return { provide: AuthState, useValue: { roles: signal(roles).asReadonly(), nombre: signal('Test').asReadonly() } };
}

/** PedidoResponse de ejemplo del contrato de orders. */
export function pedidoEjemplo(cambios: Partial<Pedido> = {}): Pedido {
  return {
    id: 15,
    clienteId: '4f6c2a1e-1111-2222-3333-444455556666',
    clienteNombre: 'María Pérez',
    clienteEmail: 'maria@contoso.cl',
    direccionEntrega: 'Av. Providencia 1234, Santiago',
    estado: 'CREADO',
    total: 2700,
    stockDescontado: false,
    items: [
      { id: 31, productoId: 1, productoNombre: 'Pan Amasado', precioUnitario: 600, cantidad: 2, subtotal: 1200 },
      { id: 32, productoId: 4, productoNombre: 'Café Americano', precioUnitario: 1500, cantidad: 1, subtotal: 1500 },
    ],
    creadoEn: '2026-10-20T15:04:05.123Z',
    aceptadoEn: null,
    enPreparacionEn: null,
    despachadoEn: null,
    entregadoEn: null,
    canceladoEn: null,
    motivoCancelacion: null,
    version: 0,
    ...cambios,
  };
}
