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
