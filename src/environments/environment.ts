// Configuración base (producción). `ng build --configuration development` la reemplaza
// por environment.development.ts (ver fileReplacements en angular.json).
// TODO: reemplazar todos los valores <PLACEHOLDER> antes de desplegar.
export const environment = {
  production: true,
  tenantId: '0bfad962-b91d-465a-b769-8e71565efe7d',
  spaClientId: '72258f06-7c3b-4189-8f22-a0abdc893ae2',
  apiClientId: 'd80d5009-1b8a-49b2-a3da-08a8bbd00936',
  // PLACEHOLDER: URL base del AWS API Gateway (sin slash final)
  apiBaseUrl: 'https://<API_GATEWAY_ID>.execute-api.<region>.amazonaws.com/<stage>',
  // PLACEHOLDER: URL pública real del front
  redirectUri: 'https://<DOMINIO_FRONT>/auth-redirect',
  postLogoutRedirectUri: 'https://<DOMINIO_FRONT>',
  forzarAdminTemporal: false,
};
