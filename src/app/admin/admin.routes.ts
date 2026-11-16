import { Routes } from '@angular/router';
import { AdminLayout } from './layout/admin-layout';
import { Bienvenida } from './pages/bienvenida/bienvenida';
import { CatalogoAdmin } from './pages/catalogo-admin/catalogo-admin';
import { authGuard } from '../core/guards/auth-guard';
import { rolesDe } from './admin-menu';

// Rutas hijas de /dashboard. app.routes.ts deja entrar a ROLES_DASHBOARD; cada sección restringe sus roles con los
// mismos de su entrada en MENU_ADMIN (admin-menu.ts): catálogo, usuarios y reportes Admin; pedidos Operador;
// auditoría Admin y Auditor.
export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminLayout,
    children: [
      { path: '', component: Bienvenida, title: 'Dashboard' },
      {
        path: 'catalogo',
        component: CatalogoAdmin,
        title: 'Administrar catálogo',
        canActivate: [authGuard],
        data: { roles: rolesDe('catalogo') },
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./pages/usuarios/usuarios').then((m) => m.Usuarios),
        title: 'Usuarios',
        canActivate: [authGuard],
        data: { roles: rolesDe('usuarios') },
      },
      // Mismas vistas que /pedidos; data.dashboard ajusta los enlaces y el contenedor al layout de administración.
      {
        path: 'pedidos',
        loadComponent: () => import('../pages/pedidos/lista-pedidos/lista-pedidos').then((m) => m.ListaPedidos),
        title: 'Administrar pedidos',
        canActivate: [authGuard],
        data: { dashboard: true, roles: rolesDe('pedidos') },
      },
      {
        path: 'pedidos/:id',
        loadComponent: () => import('../pages/pedidos/detalle-pedido/detalle-pedido').then((m) => m.DetallePedido),
        title: 'Detalle del pedido',
        canActivate: [authGuard],
        data: { dashboard: true, roles: rolesDe('pedidos') },
      },
      {
        path: 'reportes',
        loadComponent: () => import('./pages/reportes/reportes').then((m) => m.Reportes),
        title: 'Reportes',
        canActivate: [authGuard],
        data: { roles: rolesDe('reportes') },
      },
      {
        path: 'auditoria',
        loadComponent: () => import('./pages/auditoria/auditoria').then((m) => m.Auditoria),
        title: 'Auditoría',
        canActivate: [authGuard],
        data: { roles: rolesDe('auditoria') },
      },
    ],
  },
];
