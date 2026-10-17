import { AccountInfo, IPublicClientApplication } from '@azure/msal-browser';
import { environment } from '../../../environments/environment';

/** Roles que el front reconoce (deben coincidir con los App roles de la API en Azure). */
export type Rol = 'Admin' | 'Operador' | 'Cliente';

/**
 * Devuelve los roles del usuario a partir del claim `roles` del access token de la API.
 *
 * Los App roles están definidos (y asignados) solo en el app registration de la API, así que
 * Entra los emite en el access token (`aud` = API) y no en el ID token de la SPA. Leerlos de
 * ahí deja una sola fuente de verdad: el front ve exactamente los mismos roles que el BFF.
 *
 * acquireTokenSilent usa el token cacheado mientras siga vigente, así que normalmente no hay
 * llamada de red. Si no se puede obtener el token (sin sesión, SSR, consentimiento pendiente)
 * se devuelve [] y el usuario queda sin roles.
 */
export async function getUserRoles(
  msal: IPublicClientApplication,
  account: AccountInfo | null | undefined,
): Promise<string[]> {
  if (!account) return [];

  try {
    const result = await msal.acquireTokenSilent({
      scopes: [`api://${environment.apiClientId}/access_as_user`],
      account,
    });
    const roles = decodeJwtPayload(result.accessToken)['roles'];
    return Array.isArray(roles) ? roles : [];
  } catch (err) {
    console.warn('No se pudieron obtener los roles del access token:', err);
    return [];
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}
