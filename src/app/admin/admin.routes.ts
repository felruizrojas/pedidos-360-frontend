import { Routes } from '@angular/router';
import { AdminLayout } from './layout/admin-layout';
import { Bienvenida } from './pages/bienvenida/bienvenida';
import { CatalogoAdmin } from './pages/catalogo-admin/catalogo-admin';
import { authGuard } from '../core/guards/auth-guard';

// Rutas hijas de /dashboard. app.routes.ts deja entrar a Admin y Operador; cada sección restringe su rol:
// catálogo y usuarios solo Admin, pedidos solo Operador.
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
        data: { roles: ['Admin'] },
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./pages/usuarios/usuarios').then((m) => m.Usuarios),
        title: 'Usuarios',
        canActivate: [authGuard],
        data: { roles: ['Admin'] },
      },
      // Mismas vistas que /pedidos; data.dashboard ajusta los enlaces y el contenedor al layout de administración.
      {
        path: 'pedidos',
        loadComponent: () => import('../pages/pedidos/lista-pedidos/lista-pedidos').then((m) => m.ListaPedidos),
        title: 'Administrar pedidos',
        canActivate: [authGuard],
        data: { dashboard: true, roles: ['Operador'] },
      },
      {
        path: 'pedidos/:id',
        loadComponent: () => import('../pages/pedidos/detalle-pedido/detalle-pedido').then((m) => m.DetallePedido),
        title: 'Detalle del pedido',
        canActivate: [authGuard],
        data: { dashboard: true, roles: ['Operador'] },
      },
    ],
  },
];
