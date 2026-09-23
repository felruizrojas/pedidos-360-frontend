# pedidos-360-frontend

Frontend de **Pedidos360** (DSY1107). Angular 21 (standalone, signals, SPA) · MSAL Angular 5 · Tailwind 4.
Login con **Microsoft Entra ID** (OIDC Authorization Code + PKCE) y consumo del backend **solo a través del API Gateway**.

## Qué cubre de la evaluación
| Requisito | Implementación |
|---|---|
| Tenant IDaaS con usuarios | Entra ID, tenant `0bfad962-b91d-465a-b769-8e71565efe7d` (usuarios abajo) |
| Aplicación en el tenant | App SPA `72258f06-7c3b-4189-8f22-a0abdc893ae2` (redirect URIs local + Vercel) · App API `d80d5009-1b8a-49b2-a3da-08a8bbd00936` (scope `access_as_user`, App roles Admin/Operador/Cliente) |
| OIDC Authorization Code + PKCE | `PublicClientApplication` + `loginRedirect` (MSAL genera `code_verifier`/`code_challenge`); sin flujo implícito |
| Login / logout | `pages/login` (`loginRedirect` / `logoutRedirect`), `auth-redirect` como redirect URI, sesión en `localStorage` |
| JWT en llamadas al backend | `MsalInterceptor`: `protectedResourceMap` `${apiBaseUrl}/api/*` → `api://…/access_as_user` (Bearer automático, renovación silenciosa) |
| Guards y roles | `authGuard`: `/catalogo` exige sesión; `/dashboard` exige rol `Admin`/`Operador` (claim `roles` del ID token) |
| Manejo de errores | `apiErrorInterceptor` normaliza 400/401/403/404/0/502/503 a `ApiError` y la UI los muestra (`role="alert"`) |
| Consumo vía API Manager | `environment.ts` → `apiBaseUrl = https://u8thxu2opa.execute-api.us-east-1.amazonaws.com` |
| Despliegue en la nube | Vercel (SPA estática, `vercel.json`): deploy automático al hacer push a `main` desde la integración de Vercel con GitHub |

## Despliegue en Vercel
1. En Vercel: **Add New → Project** e importar este repo. `vercel.json` ya define build (`ng build`), carpeta de salida (`dist/pedidos-360-frontend/browser`), rewrites de SPA y headers `no-store` para rutas con sesión.
2. Con la URL asignada, reemplazar `<tu-proyecto>.vercel.app` en `src/environments/environment.ts`.
3. En Entra ID → App SPA → Authentication, agregar `https://<tu-proyecto>.vercel.app/auth-redirect` como redirect URI (tipo SPA).
4. En el API Gateway / BFF, permitir el origen `https://<tu-proyecto>.vercel.app` en CORS.

## Vistas
| Ruta | Acceso | Descripción |
|---|---|---|
| `/inicio` | público | Landing |
| `/login` | público | Iniciar / cerrar sesión |
| `/catalogo` | sesión | Catálogo (GET `/api/catalog/products`), filtros y paginación |
| `/dashboard` | Admin / Operador | Bienvenida, perfil (claims del token) y alta de productos (POST) |

## Entornos
| | Local (`ng serve`) | Vercel (`ng build`) |
|---|---|---|
| Archivo | `environment.development.ts` | `environment.ts` |
| `apiBaseUrl` | `http://localhost:8080` (BFF directo) | `https://u8thxu2opa.execute-api.us-east-1.amazonaws.com` (API Gateway) |
| `redirectUri` | `http://localhost:4200/auth-redirect` | `https://<tu-proyecto>.vercel.app/auth-redirect` |

> **Roles (decisión actual):** `forzarAdminTemporal: true` en ambos entornos: todo usuario logueado se trata como Admin (hardcodeado). En una fase posterior Azure asignará los App roles y la bandera pasará a `false` para usar el claim `roles`; el guard y el backend (`ENFORCE_ROLES`) ya están preparados.

## Ejecutar
```bash
npm ci
npm start                     # http://localhost:4200 (requiere BFF en :8080 y catálogo en :8081)
npm test                      # Vitest
npm run build                 # build producción en dist/pedidos-360-frontend/browser
```

## Usuarios de prueba (Entra ID)
| Rol | Correo | Contraseña |
|---|---|---|
| Admin | `<completar>@<tenant>.onmicrosoft.com` | `<completar>` |
| Operador | `<completar>@<tenant>.onmicrosoft.com` | `<completar>` |
| Cliente | `<completar>@<tenant>.onmicrosoft.com` | `<completar>` |

## Pruebas manuales
**Navegador (flujo completo):** abrir la URL → Iniciar sesión → login en Entra ID → `/catalogo` carga productos. En DevTools → Network: la llamada a `/api/catalog/products` va al API Gateway con `Authorization: Bearer <JWT>` (el token se puede decodificar en jwt.ms: `aud`, `iss`, `scp=access_as_user`, `roles`).

**curl** (el HTML estático responde sin sesión; los datos requieren token):
```bash
# Local
curl -I http://localhost:4200/inicio              # 200
# Vercel
curl -I https://<tu-proyecto>.vercel.app/inicio    # 200 (rewrite a index.html)
```
Las pruebas de API con y sin token (local y API Gateway) están en el README de `ms-pedidos360-bff`; el `TOKEN` se copia desde DevTools como se describe arriba.
