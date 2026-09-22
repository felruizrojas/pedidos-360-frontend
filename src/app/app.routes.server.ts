import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Rutas que dependen de sesión/token de MSAL (solo existen en el navegador):
  // se renderizan 100% en el cliente, sin intentar SSR/prerender.
  {
    path: 'catalogo',
    renderMode: RenderMode.Client
  },
  {
    path: 'dashboard',
    renderMode: RenderMode.Client
  },
  {
    // Las hijas (/dashboard/catalogo, /dashboard/perfil, etc.) también deben
    // resolverse 100% en el cliente: dependen de la sesión MSAL y del guard
    // de roles, que no existen durante el render en el servidor.
    path: 'dashboard/**',
    renderMode: RenderMode.Client
  },
  {
    path: 'auth-redirect',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
