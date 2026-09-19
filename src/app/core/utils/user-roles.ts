import { AccountInfo } from '@azure/msal-browser';

/** Roles que el front reconoce (deben coincidir con los App roles de Azure). */
export type Rol = 'Admin' | 'Operador' | 'Cliente';

/**
 * Devuelve los roles del usuario a partir del claim `roles` del ID token.
 */
export function getUserRoles(account: AccountInfo | null | undefined): string[] {
  const roles = (account?.idTokenClaims?.['roles'] as string[] | undefined) ?? [];

  // TEMPORAL: mientras no haya App roles definidos en Azure, todo usuario logueado es Admin.
  // ELIMINAR este bloque (3 líneas) cuando los roles estén creados y asignados en Azure.
  if (account) {
    return ['Admin'];
  }

  return roles;
}
