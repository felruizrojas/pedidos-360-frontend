import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';
import { Catalogo } from './pages/catalogo/catalogo';
import { Login } from './pages/login/login';
import { authGuard } from './core/guards/auth-guard';
// 1. Nueva importación de tu componente puente
import { AuthRedirect } from './shared/components/auth-redirect/auth-redirect';
import { ROLES_DASHBOARD } from './admin/admin-menu';

export const routes: Routes = [
  // Ruta por defecto que redirige a la bienvenida
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  
  // Rutas públicas accesibles por cualquier usuario
  { path: 'inicio', component: Inicio },
  { path: 'login', component: Login },

  // 🔒 Catálogo: requiere sesión activa (sin restricción de rol específico)
  { path: 'catalogo', component: Catalogo, canActivate: [authGuard] },
  
  // 🔄 2. Nueva ruta pública exclusiva para capturar las respuestas del popup de Azure
  { path: 'auth-redirect', component: AuthRedirect },

  // 🔒 Pedidos del Cliente ("mis pedidos"). El Operador los gestiona en /dashboard/pedidos.
  // "nuevo" va antes de ":id". Carga diferida (como /dashboard). Lo que cada rol puede hacer dentro del
  // pedido lo decide orders.
  {
    path: 'pedidos',
    canActivate: [authGuard],
    data: { roles: ['Cliente'] },
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/pedidos/lista-pedidos/lista-pedidos').then((m) => m.ListaPedidos),
        title: 'Pedidos',
      },
      {
        path: 'nuevo',
        loadComponent: () => import('./pages/pedidos/nuevo-pedido/nuevo-pedido').then((m) => m.NuevoPedido),
        title: 'Nuevo pedido',
      },
      {
        path: ':id',
        loadComponent: () => import('./pages/pedidos/detalle-pedido/detalle-pedido').then((m) => m.DetallePedido),
        title: 'Detalle del pedido',
      },
    ],
  },

  // 🔒 Dashboard (Admin, Operador y Auditor; el Cliente no entra). Dentro, cada sección tiene su propio guard con los
  // roles de su entrada en admin-menu.ts (catálogo, usuarios y reportes Admin; pedidos Operador).
  {
    path: 'dashboard',
    loadChildren: () => import('./admin/admin.routes').then((m) => m.adminRoutes),
    canActivate: [authGuard],
    data: { roles: [...ROLES_DASHBOARD] }
  },

  // 🔄 Comodín para redirigir cualquier URL rota o inexistente a inicio
  { path: '**', redirectTo: 'inicio' }
];
