# AGENTS.md — menus.bysmax.com

Sitio público (directorio de menús) en **Astro 5 + Tailwind 3**, desplegado en
**Cloudflare Workers**. Este archivo existe para que cualquier agente sepa las
reglas del runtime antes de tocar código.

## Stack y deploy

- Adapter: `@astrojs/cloudflare` con `imageService: 'passthrough'`.
- Config del Worker: `wrangler.jsonc` (name `menus`, main `./dist/_worker.js/index.js`,
  assets `./dist` con binding `ASSETS`, flags `nodejs_compat` +
  `global_fetch_strictly_public`, custom domain `menus.bysmax.com`).
- `output: 'static'`, pero **34 páginas son `prerender = false` (SSR)** porque
  dependen del API Go en vivo o de query params (`/menus/index` usa `page`,
  `tipo`, `sort`). No las vuelvas estáticas sin resolver eso.
- Comandos:
  ```sh
  npm run build          # astro build
  npx astro check        # 0 errores es el estado esperado
  npx wrangler deploy
  ```

### Publicación automática

Cuando el usuario diga **"súbelo"**, prepara y valida el cambio, luego usa
`git add`, `git commit` y `git push`. El despliegue de Cloudflare se activa
automáticamente con el push; no ejecutar `wrangler deploy` ni buscar tokens
salvo petición explícita de un despliegue manual o diagnóstico de fallo.

## Cosas del runtime Cloudflare que ya nos mordieron

1. **No cachea respuestas de Worker por defecto.** Un `Cache-Control:
   s-maxage=...` en una página SSR no implementa por sí solo caché en el edge.
   No añadas un middleware de Cache API sin comprobar que el adapter permite
   conservar mutables los headers de `Astro.response`.
2. **`eval` / `new Function` están prohibidos** ("Code generation from strings
   disallowed for this context"). No introduzcas librerías que compilen strings
   en runtime.
3. **sharp no corre en Workers.** Con `passthrough`, `/_image?...` sólo proxea la
   imagen original (no redimensiona). Hosts remotos fuera de `image.domains` /
   `image.remotePatterns` se sirven crudos. Cloudflare Image Resizing está
   deshabilitado en la zona (`/cdn-cgi/image/...` da 404).
4. **Assets hasheados** (`/_astro/*`, `/fonts/*`) necesitan `public/_headers` con
   `immutable`; sin eso vienen con `max-age=0, must-revalidate`.
5. **No hay purga por tag** salvo Enterprise. Se purga por URL con la API de
   Cloudflare desde `src/pages/api/revalidate.ts` (necesita `CF_ZONE_ID` y
   `CF_API_TOKEN` en runtime; sin ellos sólo loguea warning).
6. `_routes.json` se genera solo; `/_astro/*` se sirve por el binding `ASSETS`
   (excluido del Worker) y respeta `_headers`.

## Reglas de datos

- **La fuente de verdad es `admin-menus-go`** (`https://adminm.bysmax.com`).
  Todas las lecturas pasan por `src/lib/api.ts`. No hay Supabase en este repo.
- No reintroducir admin ni features de Supabase. El checkout público recuperado
  (carrito, pedidos, zonas, cliente y WhatsApp) usa exclusivamente Go y debe
  conservarse; los respaldos viven en `legacy-admin` y `legacy-full-backup`.
- Escribir fichas siempre por Go; ver README y `scripts/lib/places-go.js`.

## Ecosistema y bitácora canónica

Este proyecto trabaja con [`admin-menus`](https://github.com/emmanuelh-dev/admin-menus)
(panel) y [`menus-backend`](https://github.com/emmanuelh-dev/menus-backend)
(API Go y fuente de verdad). El control compartido vive sólo en
[`HANDOFF.md`](./HANDOFF.md). Actualízalo cuando el cambio cruce repositorios o
afecte runtime, despliegue, caché o contratos con Go.

## Referencias

- `README.md` — contexto completo, sección de caché y pendientes.
- `HANDOFF.md` — trabajo en curso (caché en edge / ISR).
- No commitear secretos; van con `wrangler secret put`.

## Control de cambios

Para cambios que alteren runtime, despliegue, caché, contratos con Go o
configuración externa, actualiza `HANDOFF.md` en el mismo commit. Debe indicar
qué se hizo, por qué era necesario, qué se validó y qué sigue pendiente (incluidos
secretos, despliegue o verificación en producción). No declares una tarea
terminada si sólo quedó compilada o subida: distingue código, push y deploy.
