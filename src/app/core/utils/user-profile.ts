import { AccountInfo } from '@azure/msal-browser';

/**
 * Extrae nombre y apellido de la cuenta MSAL a partir de los claims
 * `given_name` / `family_name` del ID token (disponibles desde que se
 * configuraron "First name" / "Last name" en Azure AD, con el scope
 * `profile` ya incluido por defecto).
 *
 * Si el token aún no trae esos claims (cuentas antiguas o sin perfil
 * completo en Azure), se hace fallback a partir de `account.name`
 * (el "display name"), partiendo la primera palabra como nombre y el
 * resto como apellido.
 */
export function getNombre(account: AccountInfo | null | undefined): string {
  const givenName = account?.idTokenClaims?.['given_name'] as string | undefined;
  if (givenName) return givenName;

  return account?.name?.split(' ')[0] ?? '';
}

export function getApellido(account: AccountInfo | null | undefined): string {
  const familyName = account?.idTokenClaims?.['family_name'] as string | undefined;
  if (familyName) return familyName;

  const partes = account?.name?.split(' ') ?? [];
  return partes.slice(1).join(' ');
}
