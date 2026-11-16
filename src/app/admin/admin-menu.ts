import { Rol } from '../core/utils/user-roles';

/**
 * Menú lateral del dashboard: UNA sola fuente para los enlaces del AdminLayout, las tarjetas de Bienvenida y los
 * `data.roles` de admin.routes.ts (y del /dashboard de app.routes.ts), así nunca se contradicen.
 * Cada entrada solo la ve (y la puede abrir) quien tenga alguno de sus roles.
 */
export interface EntradaMenu {
  etiqueta: string;
  /** Segmento bajo /dashboard ('' = Inicio). */
  segmento: string;
  roles: readonly Rol[];
  /** Texto de la tarjeta en Bienvenida. */
  descripcion: string;
}

export const MENU_ADMIN: readonly EntradaMenu[] = [
  { etiqueta: 'Inicio', segmento: '', roles: ['Admin', 'Operador', 'Auditor'], descripcion: 'Resumen del panel.' },
  { etiqueta: 'Catálogo', segmento: 'catalogo', roles: ['Admin'], descripcion: 'Consulta los productos y agrega nuevos.' },
  {
    etiqueta: 'Usuarios',
    segmento: 'usuarios',
    roles: ['Admin'],
    descripcion: 'Revisa los usuarios de Azure, su rol y si ya iniciaron sesión.',
  },
  { etiqueta: 'Pedidos', segmento: 'pedidos', roles: ['Operador'], descripcion: 'Revisa los pedidos, cambia su estado y edítalos.' },
  {
    etiqueta: 'Reportes',
    segmento: 'reportes',
    roles: ['Admin'],
    descripcion: 'KPIs en tiempo real: ventas por hora, lead time, estados activos y productos más vendidos.',
  },
  {
    etiqueta: 'Auditoría',
    segmento: 'auditoria',
    roles: ['Admin', 'Auditor'],
    descripcion: 'Timeline de eventos: quién hizo qué, cuándo y desde dónde; y los mensajes fallidos de Kafka.',
  },
];

/** Quién entra a /dashboard: la unión de los roles de todas las entradas. */
export const ROLES_DASHBOARD: readonly Rol[] = [...new Set(MENU_ADMIN.flatMap((e) => e.roles))];

/** Roles de una entrada del menú, para usar en `data.roles` de la ruta. */
export function rolesDe(segmento: string): Rol[] {
  const entrada = MENU_ADMIN.find((e) => e.segmento === segmento);
  if (!entrada) {
    throw new Error(`No hay una entrada de menú para /dashboard/${segmento}`);
  }
  return [...entrada.roles];
}

/** Entradas que puede ver un usuario con estos roles. */
export function entradasVisibles(roles: readonly string[]): EntradaMenu[] {
  return MENU_ADMIN.filter((e) => e.roles.some((r) => roles.includes(r)));
}

export function rutaDe(entrada: EntradaMenu): string {
  return entrada.segmento ? `/dashboard/${entrada.segmento}` : '/dashboard';
}
