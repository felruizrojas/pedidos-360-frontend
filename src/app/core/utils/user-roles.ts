import { AccountInfo } from '@azure/msal-browser';
import { environment } from '../../../environments/environment';

/** Roles que el front reconoce (deben coincidir con los App roles de Azure). */
export type Rol = 'Admin' | 'Operador' | 'Cliente';

/**
 * Devuelve los roles del usuario a partir del claim `roles` del ID token.
 */
export function getUserRoles(account: AccountInfo | null | undefined): string[] {
  const roles = (account?.idTokenClaims?.['roles'] as string[] | undefined) ?? [];

  // TODO(roles): TEMPORAL. Mientras no haya App roles en Azure, `forzarAdminTemporal` (solo true en
  // development) trata a todo usuario logueado como Admin. Al crear y asignar los App roles,
  // poner la bandera en false en ambos environments y luego eliminar este bloque y la bandera.
  if (environment.forzarAdminTemporal && account) {
    return ['Admin'];
  }

  return roles;
}
