// Configuración base (producción). `ng build --configuration development` la reemplaza
// por environment.development.ts (ver fileReplacements en angular.json).
export const environment = {
  production: true,
  tenantId: '0bfad962-b91d-465a-b769-8e71565efe7d',
  spaClientId: '72258f06-7c3b-4189-8f22-a0abdc893ae2',
  apiClientId: 'd80d5009-1b8a-49b2-a3da-08a8bbd00936',
  apiBaseUrl: 'https://u8thxu2opa.execute-api.us-east-1.amazonaws.com',
  redirectUri: 'https://52-71-122-5.sslip.io/auth-redirect',
  postLogoutRedirectUri: 'https://52-71-122-5.sslip.io',
  forzarAdminTemporal: false,
};
