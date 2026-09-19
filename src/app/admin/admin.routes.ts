import { Routes } from '@angular/router';
import { AdminLayout } from './layout/admin-layout';
import { Bienvenida } from './pages/bienvenida/bienvenida';
import { CatalogoAdmin } from './pages/catalogo-admin/catalogo-admin';

// Rutas hijas de /dashboard. El acceso por rol lo controla authGuard en app.routes.ts.
export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminLayout,
    children: [
      { path: '', component: Bienvenida, title: 'Dashboard' },
      { path: 'catalogo', component: CatalogoAdmin, title: 'Administrar catálogo' },
    ],
  },
];
