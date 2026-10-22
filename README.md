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
| Guards y roles | `authGuard`: `/catalogo` exige sesión; `/dashboard` exige rol `Admin`/`Operador`; `/pedidos` y `/pedidos/nuevo` solo Cliente (Admin/Operador gestionan en `/dashboard/pedidos`) (claim `roles` del access token de la API) |
| Pedidos (CRUD vía BFF) | `/pedidos`, `/pedidos/nuevo`, `/pedidos/:id` (Cliente) y `/dashboard/pedidos`, `/dashboard/pedidos/:id` (Admin/Operador) sobre `/api/orders/*`: carrito, listado paginado con filtros, detalle con historial, cambios de estado según rol (`estados-pedido.ts`), edición en CREADO y borrado lógico (Admin). El backend es la autoridad: sus 409 se muestran tal cual |
| Manejo de errores | `apiErrorInterceptor` normaliza 400/401/403/404/409/0/502/503 a `ApiError` (400/404/409 con el `mensaje` del back) y la UI los muestra (`role="alert"`) |
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
| `/catalogo` | sesión | Catálogo (GET `/api/catalog/products`), filtros y paginación. Cliente: "Agregar al pedido" con cantidad |
| `/pedidos` | Cliente | "Mis pedidos": listado paginado (`GET /api/orders`, el back filtra los suyos) con filtros por estado y fechas `desde`/`hasta`, badge de estado y total |
| `/pedidos/nuevo` | Cliente | Revisa el carrito, pide la dirección y crea el pedido (`POST`); muestra los 400 por campo, vacía el carrito y va al detalle |
| `/pedidos/:id` | Cliente | Detalle (ítems, total, dirección), timeline del historial (`/history`), botones de transición según rol y estado (`PUT /status`, motivo obligatorio al cancelar), edición en CREADO (`PUT`) y eliminar (Admin, `DELETE`) |
| `/dashboard` | Admin / Operador | Bienvenida y alta de productos (POST) |
| `/dashboard/catalogo` | Admin / Operador | Productos vigentes y eliminados en la misma tabla: editar precio/stock (`PUT`), eliminar (`DELETE`, borrado lógico; la fila queda marcada "Eliminado") y "Deshacer" (`PUT /{id}/restaurar`) |
| `/dashboard/pedidos` y `/dashboard/pedidos/:id` | Admin / Operador | Las mismas vistas de listado y detalle dentro del layout de administración: todos los pedidos, cambios de estado, edición en CREADO y eliminar (Admin) |

### Qué puede hacer cada rol en pedidos
| | Cliente | Operador | Admin |
|---|---|---|---|
| Crear (carrito) | sí | no (orders responde 403) | no (orders responde 403) |
| Ver | solo los suyos (`/pedidos`) | todos (`/dashboard/pedidos`) | todos (`/dashboard/pedidos`) |
| Editar ítems y dirección | sus pedidos en CREADO | en CREADO | en CREADO |
| Cambiar estado | solo cancelar en CREADO | toda transición válida | toda transición válida |
| Eliminar (borrado lógico) | no | no | en CREADO o CANCELADO |

Transiciones: CREADO → ACEPTADO / CANCELADO · ACEPTADO → EN_PREPARACION / CANCELADO · EN_PREPARACION → DESPACHADO / CANCELADO · DESPACHADO → ENTREGADO. La UI solo muestra los botones válidos (`core/utils/estados-pedido.ts`), pero si orders igual rechaza (409 por transición inválida o stock insuficiente al aceptar, 403 por rol) se muestra su mensaje.

El carrito (`core/services/carrito.ts`) vive en `localStorage` (`pedidos360.carrito`; si no está disponible funciona en memoria). Sus precios son referenciales: orders los recalcula con el catálogo al crear o editar el pedido.

## Entornos
| | Local (`ng serve`) | Vercel (`ng build`) |
|---|---|---|
| Archivo | `environment.development.ts` | `environment.ts` |
| `apiBaseUrl` | `http://localhost:8080` (BFF directo) | `https://u8thxu2opa.execute-api.us-east-1.amazonaws.com` (API Gateway) |
| `redirectUri` | `http://localhost:4200/auth-redirect` | `https://<tu-proyecto>.vercel.app/auth-redirect` |

> **Roles:** se toman del claim `roles` del **access token de la API** (App roles definidos y asignados en el app registration de la API: `Admin`, `Operador`, `Cliente`), igual que el BFF. No hace falta definirlos en la SPA. Un usuario sin App role asignado no accede al dashboard.

## Ejecutar
```bash
npm ci
npm start                     # http://localhost:4200 (requiere BFF en :8080, catálogo en :8081 y pedidos en :8082)
npm test -- --watch=false     # Vitest (sin backend)
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

**Pedidos (por rol):** Cliente agrega productos en `/catalogo` → Carrito → dirección → "Confirmar pedido" (queda en CREADO). Operador abre `/pedidos/:id` → "Aceptar pedido" (baja el stock en `/catalogo`) → "Pasar a preparación" → "Despachar pedido" → "Marcar como entregado"; el historial muestra cada cambio. Para ver un **409**, en otra pestaña cambiar el estado del mismo pedido y luego intentar una transición desde la pestaña desactualizada (o aceptar con más cantidad que el stock): aparece el mensaje de orders en un aviso rojo.

**curl** (el HTML estático responde sin sesión; los datos requieren token):
```bash
# Local
curl -I http://localhost:4200/inicio              # 200
# Vercel
curl -I https://<tu-proyecto>.vercel.app/inicio    # 200 (rewrite a index.html)
```
Las pruebas de API con y sin token (local y API Gateway) están en el README de `ms-pedidos360-bff`; el `TOKEN` se copia desde DevTools como se describe arriba.
