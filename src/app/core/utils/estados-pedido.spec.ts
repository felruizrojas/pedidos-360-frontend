import { EstadoPedido } from '../models/pedido.model';
import {
  ESTADOS_PEDIDO,
  TRANSICIONES,
  esEstadoPedido,
  esSoloCliente,
  puedeCrearPedidos,
  puedeEditar,
  puedeEliminar,
  puedeTransicionar,
  transicionesPermitidas,
} from './estados-pedido';

describe('estados-pedido', () => {
  const ADMIN = ['Admin'];
  const OPERADOR = ['Operador'];
  const CLIENTE = ['Cliente'];
  const SIN_ROL: string[] = [];

  it('define la máquina de estados de orders', () => {
    expect(TRANSICIONES).toEqual({
      CREADO: ['ACEPTADO', 'CANCELADO'],
      ACEPTADO: ['EN_PREPARACION', 'CANCELADO'],
      EN_PREPARACION: ['DESPACHADO', 'CANCELADO'],
      DESPACHADO: ['ENTREGADO'],
      ENTREGADO: [],
      CANCELADO: [],
    });
  });

  it('Operador y Admin pueden hacer todas las transiciones válidas', () => {
    for (const roles of [ADMIN, OPERADOR]) {
      for (const estado of ESTADOS_PEDIDO) {
        expect(transicionesPermitidas(estado, roles)).toEqual(TRANSICIONES[estado]);
      }
    }
  });

  it('rechaza transiciones inválidas aunque el rol sea Operador', () => {
    expect(puedeTransicionar('CREADO', 'DESPACHADO', OPERADOR)).toBe(false);
    expect(puedeTransicionar('CREADO', 'ENTREGADO', ADMIN)).toBe(false);
    expect(puedeTransicionar('DESPACHADO', 'CANCELADO', OPERADOR)).toBe(false);
    expect(puedeTransicionar('ENTREGADO', 'CANCELADO', ADMIN)).toBe(false);
    expect(puedeTransicionar('CANCELADO', 'CREADO', ADMIN)).toBe(false);
    expect(puedeTransicionar('ACEPTADO', 'CREADO', OPERADOR)).toBe(false);
  });

  it('el Cliente solo puede cancelar en CREADO', () => {
    expect(transicionesPermitidas('CREADO', CLIENTE)).toEqual(['CANCELADO']);
    expect(puedeTransicionar('CREADO', 'ACEPTADO', CLIENTE)).toBe(false);
    const otros: EstadoPedido[] = ['ACEPTADO', 'EN_PREPARACION', 'DESPACHADO', 'ENTREGADO', 'CANCELADO'];
    for (const estado of otros) {
      expect(transicionesPermitidas(estado, CLIENTE)).toEqual([]);
    }
  });

  it('sin rol no hay transiciones', () => {
    expect(transicionesPermitidas('CREADO', SIN_ROL)).toEqual([]);
  });

  it('un Cliente que además es Operador tiene las transiciones de Operador', () => {
    expect(transicionesPermitidas('ACEPTADO', ['Cliente', 'Operador'])).toEqual(['EN_PREPARACION', 'CANCELADO']);
    expect(esSoloCliente(['Cliente', 'Operador'])).toBe(false);
    expect(esSoloCliente(CLIENTE)).toBe(true);
  });

  it('crear y editar: Cliente y Operador; editar solo en CREADO', () => {
    expect(puedeCrearPedidos(CLIENTE)).toBe(true);
    expect(puedeCrearPedidos(OPERADOR)).toBe(true);
    expect(puedeCrearPedidos(ADMIN)).toBe(false);
    expect(puedeEditar('CREADO', CLIENTE)).toBe(true);
    expect(puedeEditar('CREADO', OPERADOR)).toBe(true);
    expect(puedeEditar('CREADO', ADMIN)).toBe(false);
    expect(puedeEditar('ACEPTADO', CLIENTE)).toBe(false);
    expect(puedeEditar('ACEPTADO', OPERADOR)).toBe(false);
  });

  it('eliminar: solo Admin y solo en CREADO o CANCELADO', () => {
    expect(puedeEliminar('CREADO', ADMIN)).toBe(true);
    expect(puedeEliminar('CANCELADO', ADMIN)).toBe(true);
    expect(puedeEliminar('ACEPTADO', ADMIN)).toBe(false);
    expect(puedeEliminar('ENTREGADO', ADMIN)).toBe(false);
    expect(puedeEliminar('CREADO', OPERADOR)).toBe(false);
    expect(puedeEliminar('CANCELADO', CLIENTE)).toBe(false);
  });

  it('reconoce los estados válidos', () => {
    expect(esEstadoPedido('EN_PREPARACION')).toBe(true);
    expect(esEstadoPedido('VOLANDO')).toBe(false);
    expect(esEstadoPedido(null)).toBe(false);
  });
});
