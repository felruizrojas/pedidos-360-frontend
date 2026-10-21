import { Routes } from '@angular/router';
import { AdminLayout } from './layout/admin-layout';
import { Bienvenida } from './pages/bienvenida/bienvenida';
import { CatalogoAdmin } from './pages/catalogo-admin/catalogo-admin';
import { Perfil } from './pages/perfil/perfil';

// Rutas hijas de /dashboard. El acceso por rol lo controla authGuard en app.routes.ts.
export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminLayout,
    children: [
      { path: '', component: Bienvenida, title: 'Dashboard' },
      { path: 'catalogo', component: CatalogoAdmin, title: 'Administrar catálogo' },
      // Mismas vistas que /pedidos; data.dashboard ajusta los enlaces y el contenedor al layout de administración.
      {
        path: 'pedidos',
        loadComponent: () => import('../pages/pedidos/lista-pedidos/lista-pedidos').then((m) => m.ListaPedidos),
        title: 'Administrar pedidos',
        data: { dashboard: true },
      },
      {
        path: 'pedidos/:id',
        loadComponent: () => import('../pages/pedidos/detalle-pedido/detalle-pedido').then((m) => m.DetallePedido),
        title: 'Detalle del pedido',
        data: { dashboard: true },
      },
      { path: 'perfil', component: Perfil, title: 'Mi perfil' },
    ],
  },
];
