import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';
import { Catalogo } from './pages/catalogo/catalogo';
import { Login } from './pages/login/login';
import { authGuard } from './core/guards/auth-guard';
// 1. Nueva importación de tu componente puente
import { AuthRedirect } from './shared/components/auth-redirect/auth-redirect';

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

  // 🔒 Pedidos: fuera de /dashboard (que es solo Admin/Operador) para que el Cliente también entre.
  // "nuevo" va antes de ":id". Carga diferida (como /dashboard). Lo que cada rol puede hacer dentro del
  // pedido lo decide orders.
  {
    path: 'pedidos',
    canActivate: [authGuard],
    data: { roles: ['Admin', 'Operador', 'Cliente'] },
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
        canActivate: [authGuard],
        data: { roles: ['Cliente', 'Operador'] },
      },
      {
        path: ':id',
        loadComponent: () => import('./pages/pedidos/detalle-pedido/detalle-pedido').then((m) => m.DetallePedido),
        title: 'Detalle del pedido',
      },
    ],
  },

  // 🔒 Ruta protegida del Dashboard
  { 
    path: 'dashboard', 
    loadChildren: () => import('./admin/admin.routes').then((m) => m.adminRoutes),
    canActivate: [authGuard], 
    data: { roles: ['Admin', 'Operador'] } 
  },

  // 🔄 Comodín para redirigir cualquier URL rota o inexistente a inicio
  { path: '**', redirectTo: 'inicio' }
];
