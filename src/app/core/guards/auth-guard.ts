import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const msalService = inject(MsalService);

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

  // 4. Evaluamos si alguno de los roles del usuario (claim del ID token) está permitido
  const userRoles = (account.idTokenClaims?.['roles'] as Array<string>) ?? [];
  if (userRoles.some((role) => expectedRoles.includes(role))) {
    return true;
  }

  // 5. Si no tiene permisos, lo expulsamos a una zona segura
  console.warn(`Acceso denegado a ${state.url}. El usuario no tiene un rol autorizado.`);
  router.navigate(['/catalogo']);
  return false;
};
