export const environment = {
  production: false,
  tenantId: '0bfad962-b91d-465a-b769-8e71565efe7d',
  spaClientId: '72258f06-7c3b-4189-8f22-a0abdc893ae2',
  apiClientId: 'd80d5009-1b8a-49b2-a3da-08a8bbd00936',
  apiBaseUrl: 'http://localhost:8080',
  redirectUri: 'http://localhost:4200/auth-redirect',
  postLogoutRedirectUri: 'http://localhost:4200',
  // TEMPORAL: mientras no existan App roles en Azure, todo usuario logueado se trata como Admin.
  forzarAdminTemporal: true,
};
