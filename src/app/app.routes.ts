import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';
import { Catalogo } from './pages/catalogo/catalogo';
import { Dashboard } from './pages/dashboard/dashboard';
import { Login } from './pages/login/login';
import { authGuard } from './core/guards/auth-guard';
// 1. Nueva importación de tu componente puente
import { AuthRedirect } from './shared/components/auth-redirect/auth-redirect';

export const routes: Routes = [
  // Ruta por defecto que redirige a la bienvenida
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  
  // Rutas públicas accesibles por cualquier usuario
  { path: 'inicio', component: Inicio },
  { path: 'catalogo', component: Catalogo },
  { path: 'login', component: Login },
  
  // 🔄 2. Nueva ruta pública exclusiva para capturar las respuestas del popup de Azure
  { path: 'auth-redirect', component: AuthRedirect },

  // 🔒 Ruta protegida del Dashboard
  { 
    path: 'dashboard', 
    component: Dashboard,
    canActivate: [authGuard], 
    data: { roles: ['superAdmin', 'admin', 'operador'] } 
  },

  // 🔄 Comodín para redirigir cualquier URL rota o inexistente a inicio
  { path: '**', redirectTo: 'inicio' }
];
