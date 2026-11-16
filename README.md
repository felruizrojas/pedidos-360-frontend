# pedidos-360-frontend

Frontend de **Pedidos360** (DSY1107). Angular 21 (standalone, signals, SPA) · MSAL Angular 5 · Tailwind 4.
Login con **Microsoft Entra ID** (OIDC Authorization Code + PKCE) y consumo del backend **solo a través del API Gateway**.

## Qué cubre de la evaluación
| Requisito | Implementación |
|---|---|
| Tenant IDaaS con usuarios | Entra ID, tenant `0bfad962-b91d-465a-b769-8e71565efe7d` (usuarios abajo) |
| Aplicación en el tenant | App SPA `72258f06-7c3b-4189-8f22-a0abdc893ae2` (redirect URIs local + Vercel) · App API `d80d5009-1b8a-49b2-a3da-08a8bbd00936` (scope `access_as_user`, App roles Admin/Operador/Cliente/Auditor) |
| OIDC Authorization Code + PKCE | `PublicClientApplication` + `loginRedirect` (MSAL genera `code_verifier`/`code_challenge`); sin flujo implícito |
| Login / logout | `pages/login` (`loginRedirect` / `logoutRedirect`), `auth-redirect` como redirect URI, sesión en `localStorage` |
| JWT en llamadas al backend | `MsalInterceptor`: `protectedResourceMap` `${apiBaseUrl}/api/*` → `api://…/access_as_user` (Bearer automático, renovación silenciosa) |
| Guards y roles | `authGuard`: `/catalogo` exige sesión; `/dashboard` exige rol `Admin`/`Operador`/`Auditor` y cada sección los roles de su entrada en `admin/admin-menu.ts` (misma fuente para menú, tarjetas y guards); `/pedidos` y `/pedidos/nuevo` solo Cliente (Admin/Operador gestionan en `/dashboard/pedidos`) (claim `roles` del access token de la API) |
| Pedidos (CRUD vía BFF) | `/pedidos`, `/pedidos/nuevo`, `/pedidos/:id` (Cliente) y `/dashboard/pedidos`, `/dashboard/pedidos/:id` (Admin/Operador) sobre `/api/orders/*`: carrito, listado paginado con filtros, detalle con historial, cambios de estado según rol (`estados-pedido.ts`), edición en CREADO y borrado lógico (Admin). El backend es la autoridad: sus 409 se muestran tal cual |
| Reportería (KPIs por streaming) | `/dashboard/reportes` (solo Admin, lazy): KPIs, `SalesChart`, `LeadTimeChart`, `TopProductsChart` y estados activos sobre `/api/report/*` del BFF, con gráficos SVG propios (`shared/components/bar-chart`), tabla alternativa accesible, refresco cada 30 s (pausable, se detiene con la pestaña oculta) y cada bloque con su propio estado de error |
| Auditoría (timeline) | `/dashboard/auditoria` (Admin y Auditor, lazy, solo lectura) sobre `/api/audit/*`: pestaña **Eventos** con los filtros del PDF (usuario, tipo de evento, desde/hasta, Nº de pedido), resumen de 24 h, tabla paginada y detalle con el payload; **Timeline de pedido** (quién/qué/cuándo/desde dónde, duración entre hitos y lead time); **Mensajes fallidos (DLT)** con stacktrace |
| Dashboard principal por rol | `/dashboard`: Admin ve KPIs de hoy (ventas, pedidos activos, clientes activos, lead time) y el resumen de auditoría; Operador, los pedidos pendientes y en curso; Auditor, el resumen de auditoría. Cliente en `/inicio`: sus 3 últimos pedidos con su estado |
| Manejo de errores | `apiErrorInterceptor` normaliza 400/401/403/404/409/0/502/503 a `ApiError` (400/404/409 con el `mensaje` del back) y la UI los muestra (`role="alert"`) |
| Consumo vía API Manager | `environment.ts` → `apiBaseUrl = https://u8thxu2opa.execute-api.us-east-1.amazonaws.com` |
| Despliegue en la nube | Vercel (SPA estática, `vercel.json`): deploy automático al hacer push a `main` desde la integración de Vercel con GitHub |

## Despliegue en Vercel
1. En Vercel: **Add New → Project** e importar este repo. `vercel.json` ya define build (`ng build`), carpeta de salida (`dist/pedidos-360-frontend/browser`), rewrites de SPA y headers `no-store` para rutas con sesión.
2. Con la URL asignada, reemplazar `<tu-proyecto>.vercel.app` en `src/environments/environment.ts`.
3. En Entra ID → App SPA → Authentication, agregar `https://<tu-proyecto>.vercel.app/auth-redirect` como redirect URI (tipo SPA).
4. En el API Gateway / BFF, permitir el origen `https://<tu-proyecto>.vercel.app` en CORS.

## Vistas
### Zona pública / tienda (navbar)
| Ruta | Acceso | Descripción |
|---|---|---|
| `/inicio` | público | Landing. Con sesión de **Cliente**, además "Tus últimos pedidos" (los 3 más recientes con estado y enlace; sin pedidos, "Ir al catálogo"). Para anónimos, Admin y Operador queda igual, sin llamadas al backend (el bloque se descarga con `import()` solo para el Cliente) |
| `/login` | público | Iniciar / cerrar sesión |
| `/catalogo` | sesión | Catálogo (GET `/api/catalog/products`), filtros y paginación. Cliente: "Agregar al pedido" con cantidad |
| `/pedidos` | Cliente | "Mis pedidos": listado paginado (`GET /api/orders`, el back filtra los suyos) con filtros por estado y fechas `desde`/`hasta`, badge de estado y total |
| `/pedidos/nuevo` | Cliente | Revisa el carrito, pide la dirección y crea el pedido (`POST`); muestra los 400 por campo, vacía el carrito y va al detalle |
| `/pedidos/:id` | Cliente | Detalle (ítems, total, dirección), timeline del historial (`/history`), botones de transición según rol y estado (`PUT /status`, motivo obligatorio al cancelar), edición en CREADO (`PUT`) y eliminar (Admin, `DELETE`) |

En la zona pública no hay enlaces ni llamadas a `/api/report` ni `/api/audit`.

### Zona de administración (`AdminLayout`, menú lateral)
| Ruta | Acceso | Descripción |
|---|---|---|
| `/dashboard` | Admin / Operador / Auditor | Inicio según el rol (ver [Dashboard principal](#dashboard-principal)) + una tarjeta por cada sección que el rol puede abrir |
| `/dashboard/catalogo` | Admin | Productos vigentes y eliminados en la misma tabla: editar precio/stock (`PUT`), eliminar (`DELETE`, borrado lógico; la fila queda marcada "Eliminado") y "Deshacer" (`PUT /{id}/restaurar`) |
| `/dashboard/usuarios` | Admin | Usuarios de Entra ID con su rol y si iniciaron sesión (solo lectura) |
| `/dashboard/pedidos` y `/dashboard/pedidos/:id` | Operador | Las mismas vistas de listado y detalle dentro del layout de administración: todos los pedidos, cambios de estado y edición en CREADO |
| `/dashboard/reportes` | Admin | Panel de KPIs (ver [Reportes](#reportes)) |
| `/dashboard/auditoria` | Admin / Auditor | Timeline de auditoría (ver [Auditoría](#auditoría)) |

`vercel.json` ya responde con `Cache-Control: no-store` a todo `/dashboard(.*)`, incluidas reportes y auditoría.

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

## Auditoría
`/dashboard/auditoria` (Admin y Auditor, carga diferida, **solo lectura**: no hay botones de editar ni borrar). Consume del BFF `/api/audit/events`, `/events/{eventId}`, `/orders/{id}/timeline`, `/event-types`, `/summary`, `/dead-letters` y `/dead-letters/{id}`. La pestaña y los filtros van en la URL, así que se pueden compartir y recargar.

| Pestaña | URL | Qué muestra |
|---|---|---|
| **Eventos** | `?usuario=soto&accion=ORDER_CREATED&accion=ORDER_DELETED&desde=2026-11-01&hasta=2026-11-13&numero=42&pagina=2` | Tarjetas del resumen (eventos del rango por acción y usuarios más activos; sin fechas, últimas 24 h), filtros del PDF (usuario por nombre/correo/id, tipo de evento poblado desde `/event-types`, desde/hasta y Nº de pedido) con "Buscar" y "Limpiar", tabla paginada (fecha local, acción con badge de color y uno neutro para acciones desconocidas, quién con rol, qué, servicio · IP) y panel de detalle (quién/qué/cuándo/dónde, correlationId, posición en Kafka y payload JSON con botón copiar) |
| **Timeline de pedido** | `?tab=timeline&pedido=42` | Línea de tiempo vertical, más antiguo primero: acción, estado anterior → nuevo, actor y rol, fecha, IP, comentario y duración desde el hito anterior; al final el lead time total si llegó a ENTREGADO. Un clic en el actor abre Eventos filtrado por ese usuario. Si no hay eventos: "No hay eventos de auditoría para el pedido #42" |
| **Mensajes fallidos (DLT)** | `?tab=dlt&paginaDlt=2` | Qué es una DLT, y la tabla de mensajes que los consumidores de Kafka no pudieron procesar (tópico original, partición/offset, excepción, fecha) con detalle expandible (mensaje original y stacktrace) |

Las fechas de los filtros (`desde`/`hasta`) se envían como inicio y fin del día **local** (audit leería una fecha sola como día UTC). Si audit responde 503 o no responde, la pestaña muestra "La auditoría no está disponible en este momento" sin romper la página.

## Dashboard principal
`/dashboard` muestra, además de las tarjetas de sus secciones:
| Rol | Bloque | Datos |
|---|---|---|
| Admin | KPIs de hoy: ventas, pedidos activos, clientes activos y lead time promedio, con enlace a Reportes | `GET /api/report/kpis?range=today` |
| Admin y Auditor | Auditoría · últimas 24 h (total y por acción), con enlace a Auditoría | `GET /api/audit/summary` |
| Operador | Pedidos pendientes de aceptar (CREADO) y en curso (ACEPTADO, EN_PREPARACION, DESPACHADO): conteo y los 5 más recientes, cada uno enlazado a `/dashboard/pedidos/:id` | `GET /api/orders?estado=…&size=5`, una llamada por estado en paralelo (`forkJoin`): orders filtra por un solo estado |

Si report, audit u orders fallan, la bienvenida se muestra igual, con un aviso discreto en ese bloque.

## Entornos
| | Local (`ng serve`) | Vercel (`ng build`) |
|---|---|---|
| Archivo | `environment.development.ts` | `environment.ts` |
| `apiBaseUrl` | `http://localhost:8080` (BFF directo) | `https://u8thxu2opa.execute-api.us-east-1.amazonaws.com` (API Gateway) |
| `redirectUri` | `http://localhost:4200/auth-redirect` | `https://<tu-proyecto>.vercel.app/auth-redirect` |

> **Roles:** se toman del claim `roles` del **access token de la API** (App roles definidos y asignados en el app registration de la API: `Admin`, `Operador`, `Cliente` y `Auditor`), igual que el BFF. No hace falta definirlos en la SPA. Un usuario sin App role asignado no accede al dashboard.

## Menú del dashboard y roles
`admin/admin-menu.ts` es la **única** fuente: de ahí salen los enlaces del menú lateral (`AdminLayout`), las tarjetas de Inicio (`Bienvenida`), los `data.roles` de cada ruta de `admin.routes.ts`, los roles de `/dashboard` en `app.routes.ts` y el enlace "Dashboard" del navbar. Un rol que no tiene una sección tampoco ve su enlace, y si escribe la URL a mano el guard lo devuelve a `/dashboard` (un Cliente, a `/catalogo`). La zona pública (navbar) no enlaza ni llama a reportería ni auditoría.

| Sección | Ruta | Admin | Operador | Auditor |
|---|---|---|---|---|
| Inicio | `/dashboard` | sí | sí | sí |
| Catálogo | `/dashboard/catalogo` | sí | | |
| Usuarios | `/dashboard/usuarios` | sí | | |
| Pedidos | `/dashboard/pedidos` | | sí | |
| Reportes | `/dashboard/reportes` | sí | | |
| Auditoría | `/dashboard/auditoria` | sí | | sí |

### Crear y asignar el rol Auditor en Entra ID
El PDF define un actor **Auditor** para el módulo de Auditoría. Si el App role no existe, todo funciona igual con Admin.
1. Entra ID → **App registrations** → `api-pedidos360` (la **API**, `d80d5009-…`) → **App roles** → **Create app role**: *Display name* `Auditor`, *Allowed member types* **Users/Groups**, *Value* `Auditor` (exacto: es lo que llega en el claim `roles`), una descripción, y **Apply**.
2. Entra ID → **Enterprise applications** → `api-pedidos360` → **Users and groups** → **Add user/group** → elegir el usuario y el rol `Auditor` → **Assign**.
3. El usuario debe **cerrar sesión y volver a entrar** (el claim `roles` se lee del access token). En jwt.ms se ve `"roles": ["Auditor"]`.
4. El BFF ya lo acepta en `/api/audit/**` (con `ENFORCE_ROLES=true`) y audit en su `@PreAuthorize`; report lo rechaza (403), y el front no le muestra Reportes.

## Reportes
`/dashboard/reportes` (solo Admin, carga diferida) consume del BFF `GET /api/report/kpis`, `/sales-by-hour`, `/lead-time`, `/top-products` y `/active-states` (definiciones de cada KPI en el README de `ms-pedidos360-report`).
- **Rango**: Hoy · Últimas 24 h · 7 días · 30 días, en el query param `?rango=` (default `last24h`, que no se escribe en la URL). El orden del top va en `?orden=monto`.
- **Tarjetas**: ventas (CLP), pedidos con venta, ticket promedio, creados, entregados, % de cancelación, clientes activos, lead time promedio y p90 ("1 h 25 min").
- **Gráficos** (`admin/pages/reportes/components/`): `SalesChartComponent` (por hora, o por día si el rango supera 48 h; monto y n.º de pedidos en el tooltip), `LeadTimeChartComponent` (distribución por buckets con promedio, p50 y p90; el bucket del p50 en color intenso), `TopProductsChartComponent` (barras horizontales, cantidad/monto) y `EstadosActivosComponent` (conteo por estado y los pedidos abiertos más antiguos; en ámbar los de más de 2 h).
- Todos usan `shared/components/bar-chart` (SVG hecho a mano, sin librerías: un canvas no se puede inspeccionar en Vitest), con `<title>` por barra, estado vacío ("Sin datos en este rango") y botón **Ver como tabla**.
- **Tiempo real**: se refresca solo cada 30 s; se detiene con **Pausar**, al ocultar la pestaña (y refresca al volver) y al salir de la página. Muestra "Actualizado hh:mm:ss · último evento procesado hace X min" (`ultimoEventoProcesadoEn` de report: qué tan al día viene Kafka).
- **Errores por bloque**: si report responde 503 (o no responde), cada bloque muestra "La reportería no está disponible en este momento" sin romper el resto.
- Datos: `core/services/reportes.ts` y `core/models/report.model.ts` (calcados de los DTOs de report). Para el 06b ya quedan `core/services/auditoria.ts` y `core/models/audit.model.ts`. Formatos es-CL en `core/utils/formato.ts`.

## Ejecutar
```bash
npm ci
npm start                     # http://localhost:4200 (requiere BFF en :8080, catálogo :8081, pedidos :8082, report :8084 y audit :8085)
npm test -- --watch=false     # Vitest (sin backend)
npm run build                 # build producción en dist/pedidos-360-frontend/browser
```

## Usuarios de prueba (Entra ID)
| Rol | Correo | Contraseña |
|---|---|---|
| Admin | `<completar>@<tenant>.onmicrosoft.com` | `<completar>` |
| Operador | `<completar>@<tenant>.onmicrosoft.com` | `<completar>` |
| Cliente | `<completar>@<tenant>.onmicrosoft.com` | `<completar>` |
| Auditor (opcional) | `<completar>@<tenant>.onmicrosoft.com` | `<completar>` |

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
