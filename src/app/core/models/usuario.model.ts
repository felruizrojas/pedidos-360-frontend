/**
 * Usuario de la aplicación (GET /api/users del BFF). Los datos vienen de Entra ID vía Microsoft Graph;
 * `activo` indica si inició sesión al menos una vez (registro de accesos del BFF).
 */
export interface Usuario {
  id: string;
  nombre: string | null;
  nombres: string | null;
  apellidos: string | null;
  /** Campo Email de Entra ID: adonde llegan las notificaciones. Null = se usa el de inicio de sesión. */
  email: string | null;
  /** Correo con el que inicia sesión (userPrincipalName). */
  usuarioPrincipal: string | null;
  roles: string[];
  /** Cuenta habilitada en Entra ID (puede iniciar sesión). */
  cuentaHabilitada: boolean | null;
  tipo: string | null;
  cargo: string | null;
  departamento: string | null;
  telefono: string | null;
  creadoEn: string | null;
  activo: boolean;
  primerAcceso: string | null;
  ultimoAcceso: string | null;
}
