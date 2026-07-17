# 11 · API pública en Go y migración del sitio Astro

Cuando la base viva en el VPS, el sitio Astro (Vercel) ya no puede usar `supabase-js`. Decisión: **el sitio consume un API público de Go** — una sola puerta a la base, caché HTTP fácil, y las escrituras públicas (visitas, reseñas, pedidos) quedan centralizadas y rate-limiteables.

## Inventario de lo que Astro consume hoy (verificado por grep)

**Lecturas** (~27 llamadas `from('places')` + states/municipalities en ~20 archivos): páginas de moteles por estado, restaurantes/menús por slug, servicios por estado/municipio, tienda (`/tienda/[name]/...`), cafeterías, sitemaps.

**Escrituras vía sus propios API routes** (`menus/src/pages/api/**`):
| Route Astro | Qué hace | Destino |
|---|---|---|
| `analytics/visit.ts` | inserta `place_menu_visits` | `POST /api/public/visits` |
| `restaurants/submit-review.ts` | inserta `reviews` (con Turnstile) | `POST /api/public/reviews` |
| `orders/*` | crear orden + tracking | ya existen (`POST /api/orders`, `GET /api/orders/{id}` — doc 03) |
| `shipping-zones/check.ts` | `is_point_in_shipping_zone` | `GET /api/public/shipping-zones/check` |
| `customers/*` | upsert cliente en checkout | ya existe (`POST /api/customers`) |
| `contacts/submit.ts` | formulario de contacto (Resend) | `POST /api/public/contact` (email vía Resend desde Go) o se queda en Astro si solo manda email |
| auth (login/register/magic-link/impersonate) del admin viejo | Supabase Auth | **se retira** — el admin viejo de Astro (`/admin/**`) queda deprecado; los usuarios usan admin-menus |
| `categories/*`, `menu-items/*`, `menus/*` (legacy) | tablas `menu_*` congeladas | **se retiran** con el admin viejo |
| `upload/index.ts` (Cloudinary), `openai-recommendation`, `revalidate` | no tocan la base | se quedan en Astro tal cual |

> El inventario fino (query por query) se hace en la fase F9 con `grep -rn "from('" menus/src`; cada query se mapea a un endpoint de abajo. Si aparece una que no encaja, se agrega al catálogo — no se hacen endpoints "select genérico".

## Catálogo de endpoints públicos (namespace `/api/public/*`, sin auth)

```
GET  /api/public/places?type=&state=&municipality=&featured=&limit=&offset=
       → lista para páginas de directorio (proyección content incluida u opcional ?fields=)
GET  /api/public/places/{slug}              → detalle por short_name (la página del negocio)
GET  /api/public/states                     → estados con conteo por type
GET  /api/public/municipalities?state_id=   → municipios
GET  /api/public/shipping-zones/check?place_id=&lat=&lng=&colony=
       → replica is_point_in_shipping_zone (la función SQL se muda con la base)
POST /api/public/visits    {place_id, visitor_id, path, referer}   + user_agent del header
POST /api/public/reviews   {place_id, rate, comment, ...} + verificación Turnstile en Go
POST /api/public/contact   {name, email, message, ...}    + Turnstile + Resend
```

Reglas del namespace público:
- **Solo lugares publicables**: los GET filtran lo que el sitio ya filtra hoy (paridad con las queries actuales de Astro; no exponer campos sensibles como `clabe` salvo donde el sitio ya lo usa).
- **Caché agresivo en lecturas**: `Cache-Control: public, s-maxage=300, stale-while-revalidate=3600`. Vercel/CDN cachea; el VPS respira. Las páginas Astro estáticas (SSG) golpean esto solo en build/ISR.
- **Rate limit** en las escrituras públicas (por IP, en Go, algo simple de token bucket en memoria).
- CORS: abierto para GET públicos; POST restringido a los orígenes del sitio (`ALLOWED_ORIGINS`).

## Cambios en el repo `menus` (Astro)

1. `src/lib/supabase.ts` se reemplaza por `src/lib/api.ts`: un cliente `fetch` tipado contra `PUBLIC_GO_API_URL` con los métodos del catálogo. Las páginas cambian `supabase.from('places')...` por `api.places.list({...})` — mecánico, archivo por archivo.
2. Los API routes de la tabla de arriba se convierten en proxies delgados o se eliminan (el frontend llama a Go directo; mantener proxy solo si hay secretos de por medio, p. ej. Turnstile se verifica en Go así que no hace falta proxy).
3. El admin viejo (`/admin/**`, `MenuLoader`, managers legacy) se retira o se deja detrás de un 410 — decisión operativa, ya está superseded por admin-menus.
4. Variables: desaparecen `SUPABASE_*`; entra `PUBLIC_GO_API_URL`.
5. `@supabase/supabase-js` sale del `package.json`.

## Orden recomendado dentro de la Etapa B

1. Implementar el catálogo público en Go (contra la base aún en Supabase — da igual, es Postgres).
2. Migrar Astro por secciones verificables: moteles → restaurantes/menus → servicios → tienda → sitemaps.
3. Cada sección migrada se compara en preview de Vercel contra producción (mismo HTML renderizado, diff visual).
4. Al terminar: cero `supabase-js` en Astro → luz verde para la Etapa C (mudanza física, doc 10).
