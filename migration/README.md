# Migración admin-menus → Go (y salida completa de Supabase)

**Misión:** reemplazar todo el server-side de `admin-menus` (Next.js) por un servicio en **Go**, con **PostgreSQL propio en el mismo VPS** y **auth propia**. El dashboard Next/React se conserva y se apunta al nuevo backend vía un switch reversible. El sitio público (`menus`, Astro) migra sus lecturas/escrituras a un API público de Go. Al final, Supabase se cancela.

## Decisiones tomadas

| Decisión | Valor | Nota |
|---|---|---|
| Alcance | Solo backend en Go | El dashboard Next/React se queda; consume el API de Go |
| Deploy | VPS propio con Docker | **Go + PostgreSQL en el mismo servidor** (red interna Docker); Caddy da la cara |
| Base de datos | PostgreSQL propio en el VPS (PostGIS) | La mudanza física es la **última etapa** (doc 10): durante la construcción, Go usa el Postgres de Supabase como Postgres normal para que viejo y nuevo compartan la misma base viva |
| **Normalización** | **Desde el inicio** (doc 09) | Catálogo (secciones/items/opciones), `semantic_data` y líneas de pedido pasan a tablas; `places.content` se conserva como **proyección derivada** que Go recompila en cada escritura, así el sitio Astro y los contratos API no se rompen |
| Auth | **Propia en Go** (doc 04) | Sesiones opacas en cookie `bm_session`; los 44 usuarios se migran de `auth.users` conservando UUID y hash bcrypt (una sentencia SQL, doc 10). Supabase Auth desaparece |
| Sitio Astro | Consume API público de Go (doc 11) | Namespace `/api/public/*` con caché CDN; el admin viejo de Astro se retira |
| Mecanismo de switch | `rewrites()` en `next.config.ts`: `/api/:path*` → URL del servicio Go | El navegador nunca cambia de origen; cero CORS, cookies fluyen igual |

## Por qué el switch es seguro

El dashboard ya consume casi todo por `fetch('/api/...')` relativo (verificado en `app/(dashboard)/page.tsx` y clientes). Si Go replica **ruta por ruta y shape por shape** los contratos del Apéndice (doc 03), un rewrite de Next hace el cambio transparente. Lo único que no viaja por `/api` son los **server actions** (`app/actions/*.ts`, `app/auth/actions.ts`) y los **fetch server-side** (`lib/api/*.ts`); el doc 06 lista el cambio exacto para cada uno.

## Documentos

| Doc | Contenido |
|---|---|
| [01-arquitectura.md](01-arquitectura.md) | Stack Go, layout del proyecto, dependencias, configuración |
| [02-modelo-datos.md](02-modelo-datos.md) | Esquema real de las tablas (verificado contra Supabase) y structs Go |
| [03-contratos-api.md](03-contratos-api.md) | Contrato exacto de cada endpoint: método, ruta, query, body, respuesta, auth |
| [04-auth.md](04-auth.md) | Validación de JWT de Supabase en Go, cookies, admin, GoTrue Admin API |
| [05-ai-gemini.md](05-ai-gemini.md) | Port del asistente IA (update-content, preview, historial, rollback) |
| [06-switch-frontend.md](06-switch-frontend.md) | Cambios mínimos en admin-menus para apuntar a Go |
| [07-deploy.md](07-deploy.md) | Dockerfile, compose, proxy, variables de entorno, healthcheck |
| [08-fases.md](08-fases.md) | Fases de implementación con criterios de aceptación (checklist para ejecutar) |
| [09-normalizacion.md](09-normalizacion.md) | Esquema normalizado (`catalog_*`, `place_details`, `order_items`), compilador de proyección, backfill, endpoints granulares |
| [10-migracion-datos.md](10-migracion-datos.md) | Migración de usuarios (auth.users → users) y mudanza física Supabase → Postgres del VPS, cutover y rollback |
| [11-api-publica-astro.md](11-api-publica-astro.md) | API público `/api/public/*` y migración del sitio Astro |

## Fuera de alcance (no tocar)

- La UI del dashboard (POS, comanda, caja, arqueo, insights con recharts): se queda en React; solo cambia de dónde vienen los datos.
- El hosting de los frontends: Next y Astro siguen en Vercel.
- El diseño/HTML del sitio público: la migración de Astro (doc 11) cambia el origen de datos, no las páginas.
- Cloudinary (imágenes) y Resend (emails): se quedan como servicios; Resend pasa a llamarse desde Go donde toque.

## Regla de oro para la implementación

**El contrato lo definen los archivos actuales de `admin-menus/app/api/**` y este plan.** Ante cualquier duda de shape de respuesta, el route.ts original es la verdad. Cada endpoint migrado debe pasar la prueba de paridad del doc 08 (misma request → mismo JSON, mismos status codes) antes de marcar la fase como completa.
