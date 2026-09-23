// Configuración base (producción). `ng build --configuration development` la reemplaza
// por environment.development.ts (ver fileReplacements en angular.json).
// TEMPORAL: apiBaseUrl sigue apuntando directo al BFF en la EC2 (sin API Gateway todavía).
// OJO: como el frontend ya es HTTPS (nginx + Let's Encrypt), el navegador va a BLOQUEAR
// esta llamada por "mixed content" (página https intentando llamar a un endpoint http).
// El login con Azure va a funcionar igual; el catálogo va a mostrar "servicio no disponible"
// hasta que reemplacemos esto por la URL del API Gateway (que es https por defecto).
export const environment = {
  production: true,
  tenantId: '0bfad962-b91d-465a-b769-8e71565efe7d',
  spaClientId: '72258f06-7c3b-4189-8f22-a0abdc893ae2',
  apiClientId: 'd80d5009-1b8a-49b2-a3da-08a8bbd00936',
  apiBaseUrl: 'http://52.71.122.5:8080',
  redirectUri: 'https://52-71-122-5.sslip.io/auth-redirect',
  postLogoutRedirectUri: 'https://52-71-122-5.sslip.io',
  forzarAdminTemporal: false,
};
