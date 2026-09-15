# HANDOFF — Cache en el edge (ISR) de menus.bysmax.com

**Fecha:** 2026-09-13
**Estado:** purga por URL lista; el intento de caché ISR en el Worker fue
retirado por incompatibilidad con Astro.

## Control del ecosistema

Este es el registro canónico del trabajo que cruza los tres repositorios:

- [`menus`](https://github.com/emmanuelh-dev/menus): sitio público y Worker de Cloudflare.
- [`admin-menus`](https://github.com/emmanuelh-dev/admin-menus): panel de administración.
- [`menus-backend`](https://github.com/emmanuelh-dev/menus-backend): API Go y fuente de verdad de los datos.

Al cambiar un flujo compartido, registra aquí el alcance por repositorio, el
motivo, la validación realizada y los pasos aún pendientes. No copies este
estado en los otros repositorios: sus `AGENTS.md` sólo enlazan a este documento
para evitar que las bitácoras se desincronicen.

## Registro 2026-09-14 — Analíticas de un lugar migradas a Go

El error "No se pudieron cargar las analíticas" en `admin-menus` venía de leer
visitas y reseñas de la copia vieja de Supabase, cuyo proyecto ya no resuelve.
Se migró esa lectura a Go:

- `menus-backend`: nuevo `GET /api/admin/place/{id}/insights` (dueño o admin),
  con paridad de rangos y cortes UTC respecto al handler anterior de Next.
  Corrige además el 500 de `GET /api/public/reviews`, que seleccionaba una
  columna `restaurant` inexistente en el esquema de Go (ahora emite `NULL`).
- `admin-menus`: `app/api/admin/place/[id]/insights/route.ts` pasó a ser proxy
  de `goFetch`; ya no consulta Supabase.

Validación local: `go build ./...` y `go vet` pasan; `npm run build` pasa.
`npm run lint` conserva errores heredados, sin nuevos.

Pendiente: ingesta de visitas y reseñas en la BD de Go. Hasta entonces el
endpoint responde `200` con ceros. Orden de despliegue: Go primero, luego
`admin-menus`.

## Registro 2026-09-14 — Ingesta de visitas del menú público

El panel mostraba visitas en cero pese a que `/menus/<slug>` renderiza bien. La
causa no era el visor de analíticas (ya leía de Go), sino que **nada escribía
`place_menu_visits`**: el commit `fca1de6` ("eliminar admin y features basadas
en Supabase") borró `src/pages/api/analytics/visit.ts` y el `<script>` de
`RestaurantLayout.astro`, y el reemplazo previsto en
`migration/11-api-publica-astro.md` (`POST /api/public/visits`) nunca se
implementó. El propio `insights.go` lo anunciaba: respondía `200` con ceros.

- `menus-backend`: nuevo `POST /api/public/visits` en `internal/api/visits.go`.
  Sin auth, inserta `place_id`, `visitor_id`, `path`, `user_agent` y `referer`
  (con fallback a los headers) y responde `204`. Un `place_id` inexistente
  (FK `23503`) devuelve `404`, no `500`.
- `menus`: el beacon de `RestaurantLayout.astro` (con el `menu_visitor_id` de
  `localStorage`) llama **directo** a
  `https://adminm.bysmax.com/api/public/visits` desde el navegador: cero hop por
  el Worker, sin ruta `/api/analytics/visit`. `referer`/`userAgent` van en el
  cuerpo porque el navegador no deja fijarlos como headers.
- `menus-backend`: `withPublicCORS` ahora contesta el preflight `OPTIONS` de
  `/api/public/*` y restringe las escrituras a `ALLOWED_ORIGINS` (refleja el
  origen permitido + `Vary: Origin`); las lecturas siguen abiertas con `*`.

Validación local: `go build ./...` y `go vet ./...` pasan; en `menus`,
`astro check` con 0 errores / 0 warnings y `npm run build` completo. El chunk
del layout y el manifest del Worker incluyen el script y la ruta.

Orden de despliegue: Go primero (`adminm.bysmax.com`), luego `menus`
(Cloudflare). `admin-menus` no cambia: su proxy a Go ya estaba.

Pendiente: rate limit / retención de `place_menu_visits`, y la ingesta de
reseñas (sigue sin ruta pública en Go; hoy `reviews` también se lee pero no se
escribe).

## Registro 2026-09-14 — Slugs inválidos

`/menus/null` y slugs sin ficha ya no lanzan un error de render en el Worker:
redirigen a `/menus` antes de cargar la ficha. Está desplegado y producción
responde `302` hacia `/menus`.

## Registro 2026-09-14 — Headers inmutables del Worker

Se retiró `src/middleware.ts`. El middleware de Cache API agregado para ISR
causaba `TypeError: Can't modify immutable headers` durante el render SSR de
rutas públicas. La corrección conserva los `Cache-Control` ya declarados y
evita que el Worker falle; no habilita caché SSR en el edge. Se validará con
`astro check`, build y solicitudes HTTP tras el despliegue.

## Registro 2026-09-14 — Recuperación del checkout público

La eliminación del checkout completo en el remoto fue una solución puntual al
error del Worker, no una decisión de producto. Se recuperó el flujo público
sobre la versión remota actual, conservando los colores configurados por tema:

- `menus` vuelve a montar el carrito para negocios que permiten carrito o
  entrega. Incluye datos de cliente, recogida o envío, selección de zona y
  dirección, efectivo/tarjeta/transferencia, CLABE, notas, creación de pedido,
  enlace de seguimiento y mensaje de WhatsApp.
- Las rutas públicas de `menus` son proxies de sesión hacia Go para pedidos,
  estado de pedido, sesión y zonas de envío; no reintroducen Supabase.
- `menus-backend` expone `GET /api/public/shipping-zones?place_id=...` y al
  crear un pedido valida la zona activa y calcula el envío con el precio
  configurado en PostgreSQL. También crea o actualiza el cliente por teléfono
  dentro de la misma transacción del pedido.

Validación local: `go test ./...` pasó. Las pruebas de integración de pedidos
requieren `TEST_DATABASE_URL`, por lo que se omiten cuando esa base no está
configurada. `npx astro check` pasó con 0 errores y 0 advertencias (quedan los
hints informativos ya existentes). Falta registrar el resultado de
`npm run build` pasó. El build conserva avisos heredados de fuentes que se
resuelven en tiempo de ejecución y de anotaciones de dependencias; no son
errores del checkout.

Pendiente de despliegue, en este orden:

1. Desplegar primero `menus-backend` con la migración operacional ya aplicada.
2. Desplegar `menus` y confirmar `PUBLIC_GO_API_URL` y
   `PUBLIC_GOOGLE_MAPS_API_KEY` en el Worker.
3. Probar en producción un pedido de recogida y uno de entrega: zona, precio
   del envío, cliente, WhatsApp y la página `/pedidos/<tracking_id>`.

Los commits de esta recuperación ya están publicados en GitHub (`menus`
`0f23836`; `menus-backend` `a0c5768`). Go fue desplegado en
`adminm.bysmax.com`: `/healthz` responde `{"ok":true}` y el endpoint de zonas
responde `200`. Falta publicar el Worker de Cloudflare de `menus`; este entorno
requiere autenticación de Wrangler o un `CLOUDFLARE_API_TOKEN` con permisos de
Worker para ejecutar ese paso.

## Contexto

El sitio corre en Cloudflare Workers. Las páginas del catálogo son
`prerender = false` (SSR) y ya ponían `Cache-Control: public, s-maxage=31536000`,
pero **Cloudflare no cachea respuestas de Worker por defecto**, así que cada
visita re-renderizaba y `/_image` refetchaba el origen. El `Vercel-Cache-Tag` y
la purga por tag (`purgeTags`) eran no-ops heredados de Vercel.

## Cambios de caché y purga

| Archivo | Qué hace |
|---|---|
| `public/_headers` (nuevo) | `/_astro/*` y `/fonts/*` → `public, max-age=31536000, immutable`. |
| `src/pages/api/revalidate.ts` | Purga real: mapea tags (`place-<slug>`, `places-all`) a URLs (`/menus/<slug>`, `/moteles/<slug>`, `/qr/<slug>` + hubs + sitemaps) y llama `purge_cache` de Cloudflare en lotes de 30. Lee `CF_ZONE_ID`/`CF_API_TOKEN` de `locals.runtime.env`. |
| `README.md` | Sección "Cache en Cloudflare: edge cache (ISR) + purge por URL". |

`astro check` (0 errores) y `astro build` pasan.

## Pendiente (mañana)

1. Crear API token en Cloudflare con permiso **Zone > Cache Purge > Purge**,
   scoped a `bysmax.com`.
2. Guardar secretos:
   ```sh
   npx wrangler secret put CF_ZONE_ID
   npx wrangler secret put CF_API_TOKEN
   ```
3. Desplegar los cambios de caché/purga.
4. Verificar que las rutas SSR respondan `200`; el Worker no ofrece caché ISR
   actualmente. Si se vuelve a evaluar, primero hay que probar la compatibilidad
   del adapter con la Cache API y los headers de Astro.

## Modelo elegido

La purga por URL queda disponible para una futura estrategia de caché. No hay
ISR activo ahora. Se descartó SSG+rebuild por webhook porque no soporta filtros
por query params de `/menus`.

## Nota

`/menus` no puede ser estática (usa `page`/`tipo`/`sort` por query string).
