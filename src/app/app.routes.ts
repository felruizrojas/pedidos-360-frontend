import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';
import { Catalogo } from './pages/catalogo/catalogo';
import { Dashboard } from './pages/dashboard/dashboard';
import { Login } from './pages/login/login';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  // Ruta por defecto que redirige a la bienvenida
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  
  // Rutas públicas accesibles por cualquier usuario
  { path: 'inicio', component: Inicio },
  { path: 'catalogo', component: Catalogo },
  { path: 'login', component: Login },

  // 🔒 Ruta protegida del Dashboard
  { 
    path: 'dashboard', 
    component: Dashboard,
    canActivate: [authGuard], // El guard evaluará los roles antes de cargar la vista
    data: { roles: ['superAdmin', 'admin', 'operador'] } // Roles que tienen permitido el acceso principal
  },

  // 🔄 Comodín para redirigir cualquier URL rota o inexistente a inicio
  { path: '**', redirectTo: 'inicio' }
];
