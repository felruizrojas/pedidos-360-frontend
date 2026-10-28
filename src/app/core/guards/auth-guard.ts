import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { AuthState } from '../services/auth-state';

export const authGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const msalService = inject(MsalService);
  const authState = inject(AuthState);

  // 1. Toda ruta que use este guard exige, como mínimo, sesión activa
  const account = msalService.instance.getActiveAccount();
  if (!account) {
    router.navigate(['/login']);
    return false;
  }

  // 2. Obtenemos los roles permitidos directamente desde la configuración de la ruta
  const expectedRoles = route.data?.['roles'] as Array<string>;

  // 3. Si la ruta no especificó roles, basta con estar autenticado (sin restricción de rol)
  if (!expectedRoles || expectedRoles.length === 0) {
    return true;
  }

  // 4. Evaluamos si alguno de los roles del usuario (claim del access token de la API) está permitido
  const userRoles = await authState.cargarRoles();
  if (userRoles.some((role) => expectedRoles.includes(role))) {
    return true;
  }

  // 5. Si no tiene permisos, lo expulsamos a una zona segura (dentro del dashboard, a su inicio:
  // Admin y Operador comparten /dashboard pero no sus secciones)
  console.warn(`Acceso denegado a ${state.url}. El usuario no tiene un rol autorizado.`);
  const enDashboard = state.url.startsWith('/dashboard/');
  router.navigate([enDashboard ? '/dashboard' : '/catalogo']);
  return false;
};
