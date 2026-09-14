# HANDOFF — Cache en el edge (ISR) de menus.bysmax.com

**Fecha:** 2026-09-13
**Estado:** código listo, falta configurar secretos y desplegar.

## Control del ecosistema

Este es el registro canónico del trabajo que cruza los tres repositorios:

- [`menus`](https://github.com/emmanuelh-dev/menus): sitio público y Worker de Cloudflare.
- [`admin-menus`](https://github.com/emmanuelh-dev/admin-menus): panel de administración.
- [`menus-backend`](https://github.com/emmanuelh-dev/menus-backend): API Go y fuente de verdad de los datos.

Al cambiar un flujo compartido, registra aquí el alcance por repositorio, el
motivo, la validación realizada y los pasos aún pendientes. No copies este
estado en los otros repositorios: sus `AGENTS.md` sólo enlazan a este documento
para evitar que las bitácoras se desincronicen.

## Registro 2026-09-14 — Slugs inválidos

`/menus/null` y slugs sin ficha ya no lanzan un error de render en el Worker:
redirigen a `/menus` antes de cargar la ficha. Se validó con `astro check` y
build local. Falta desplegar para que deje de aparecer el 500 en producción.

## Contexto

El sitio corre en Cloudflare Workers. Las páginas del catálogo son
`prerender = false` (SSR) y ya ponían `Cache-Control: public, s-maxage=31536000`,
pero **Cloudflare no cachea respuestas de Worker por defecto**, así que cada
visita re-renderizaba y `/_image` refetchaba el origen. El `Vercel-Cache-Tag` y
la purga por tag (`purgeTags`) eran no-ops heredados de Vercel.

## Cambios (sin commitear)

| Archivo | Qué hace |
|---|---|
| `src/middleware.ts` (nuevo) | Cachea en el edge con `caches.default` toda respuesta GET 200 con `Cache-Control` público (`s-maxage`/`max-age`), excepto `/api/`, `no-store/private` y `Set-Cookie`. |
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
3. `wrangler deploy`.
4. Verificar: dos `curl` seguidos a `/menus` y a un `/_image?...` deben devolver
   `cf-cache-status: HIT` (y `age`). Si sale contenido viejo con `HIT`, la purga
   no entró (revisar secretos).

## Modelo elegido

ISR: la URL se genera en la primera visita y queda cacheada; la edición purga las
URLs afectadas. Sin rebuilds. Se descartó SSG+rebuild por webhook (más lento y no
soporta filtros por query params de `/menus`).

## Nota

`/menus` no puede ser estática (usa `page`/`tipo`/`sort` por query string). Con
caché en edge cada combinación se cachea por separado.
