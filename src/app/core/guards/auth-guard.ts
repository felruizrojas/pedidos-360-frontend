import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  // SIMULACIÓN: Este objeto representará al usuario conectado en el futuro (desde Azure AD)
  const currentUser = {
    name: 'Carlos Plaza',
    role: 'user' // Prueba cambiando a 'user', 'admin' o 'superAdmin'
  };

  // 1. Obtenemos los roles permitidos directamente desde la configuración de la ruta
  const expectedRoles = route.data?.['roles'] as Array<string>;

  // 2. Si la ruta no especificó roles requeridos, se considera pública o de libre acceso
  if (!expectedRoles || expectedRoles.length === 0) {
    return true;
  }

  // 3. Evaluamos si el rol del usuario actual está incluido en la lista de permitidos
  if (currentUser && expectedRoles.includes(currentUser.role)) {
    return true;
  }

  // 4. Si no tiene permisos, lo expulsamos a una zona segura
  console.warn(`Acceso denegado a ${state.url}. El rol '${currentUser.role}' no tiene autorización.`);
  router.navigate(['/catalogo']);
  return false;
};
