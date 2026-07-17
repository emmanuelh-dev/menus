# 06 · El switch: cambios en admin-menus (frontend)

Objetivo: que apuntar al backend Go sea **una variable de entorno**. El dashboard React no se rediseña; solo se re-cablea lo que hoy habla con Supabase/route-handlers locales.

## 1. El rewrite (el switch propiamente)

`next.config.ts`:

```ts
async rewrites() {
  const goApi = process.env.GO_API_URL; // ej. https://api-admin.bysmax.com
  if (!goApi) return [];                 // sin la var, todo sigue local (rollback instantáneo)
  return [{ source: '/api/:path*', destination: `${goApi}/api/:path*` }];
}
```

- Todos los `fetch('/api/...')` del cliente (dashboard, POS, comanda, insights, contacts, etc.) pasan a Go **sin tocar una línea de componente**. Las cookies `sb-*` viajan porque el rewrite es proxy del mismo origen.
- Rollback = quitar `GO_API_URL` y redeploy. Los route handlers viejos se conservan durante la transición y se borran al final (fase F8).
- Excepción: si algún route handler debe permanecer en Next (ninguno identificado), se lista con rewrite específico antes del catch-all.

## 2. Server components que llaman `lib/api/*` directo (4 archivos)

Estos no pasan por `/api`, importan `lib/api/places.ts` y golpean Supabase desde el server component:

| Archivo | Hoy | Cambio |
|---|---|---|
| `app/(dashboard)/place/[id]/layout.tsx` | `getPlace(id)` | `fetch(`${GO_API_URL}/api/places/${id}`)` con header `Cookie` reenviado (`headers()` de next) |
| `app/(dashboard)/place/[id]/page.tsx` | `getPlace(id)` | igual |
| `app/(dashboard)/place/[id]/menu/page.tsx` | `getPlace(id)` | igual |
| `app/(dashboard)/place/[id]/insights/page.tsx` | `getPlace(id)` | igual |

Implementación: reescribir `lib/api/places.ts` para que `getPlaces`/`getPlace` hagan `fetch` al API Go (mismas firmas, mismos tipos de retorno) — así los 4 archivos no cambian. Helper común `lib/api/go.ts`:

```ts
import { headers } from 'next/headers';
export async function goFetch(path: string, init?: RequestInit) {
  const h = await headers();
  const base = process.env.GO_API_URL ?? '';
  return fetch(`${base}${path}`, {
    ...init,
    headers: { ...init?.headers, cookie: h.get('cookie') ?? '' },
    cache: 'no-store',
  });
}
```

## 3. Server actions → fetch al API Go

| Action | Reemplazo |
|---|---|
| `app/actions/places.ts:createPlace` | `POST /api/places` |
| `app/actions/places.ts:updatePlaceUser` | `PUT /api/places/{id}/owner` |
| `app/actions/places.ts:deletePlace` | `DELETE /api/places/{id}` |
| `app/actions/servicios.ts:createServicio` (y update si existe) | `POST /api/places` / `PUT /api/places/{id}` — el action arma el `content.semantic_data` igual que hoy (slug, parseo de areas/features) o esa lógica se muda a Go; decisión: **muda a Go** dentro de `POST /api/places` para que el action quede en un fetch de 5 líneas |
| `app/auth/actions.ts` (login, signup, signout, Turnstile) | Wrappers de `POST /api/auth/login` / `register` / `logout` (auth propia, doc 04). El `Set-Cookie` de Go pasa a través del rewrite; Turnstile se verifica en Go, así que el action solo reenvía el token del widget |

Los actions se conservan como wrappers (`'use server'` + `goFetch` + `revalidatePath`) para no tocar los formularios que los usan.

## 4. Componentes/páginas que usan el cliente Supabase directo (browser)

`app/(dashboard)/servicios/*`, `reviews/page.tsx`, `sidebar.tsx`, `(dashboard)/layout.tsx`, etc. usan `lib/supabase/client|server` para dos cosas:

1. **Sesión/usuario** (`auth.getUser()`) → cambia a `GET /api/auth/me` (mismo shape de user, doc 03). Un hook `useUser()` / helper server-side `getUser()` centraliza la llamada.
2. **Queries de datos** (`from('places')...`, `from('reviews')...`) → migrar a `fetch('/api/...')` contra los endpoints Go equivalentes. Inventariar en la fase F8 con `grep -rn "\.from('" app components`; cada query directa se mapea a un endpoint existente del doc 03 (si falta alguno, se añade al doc y a Go: p. ej. reviews list → `GET /api/admin/place/{id}` ya trae reviews, o nuevo `GET /api/reviews?place_id=`).

**Meta final:** `@supabase/supabase-js` y `@supabase/ssr` **salen del package.json**. Cero `.from(...)` y cero GoTrue en el frontend.

## 4b. Migración del editor a endpoints granulares (fase F9)

Tras el switch, el editor de menús deja de mandar el blob `content` completo y pasa a los endpoints granulares del doc 09 (`PUT /api/items/{id}`, `POST /api/sections/...`, `PUT /api/places/{id}/details`, etc.). Son los cambios de frontend aceptados a cambio de la normalización:

- El estado local del editor pasa de "un objeto content gigante" a colecciones por sección/item — mutaciones optimistas más simples.
- El POS/comanda usa `PUT /api/items/{id}/availability` para el toggle de disponible.
- El `PUT /api/places/{id}` con content completo sigue existiendo (lo usa el flujo IA y sirve de fallback), así que la migración del editor puede ser incremental, pantalla por pantalla.

## 5. Variables de entorno del frontend tras el switch

| Var | Estado |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | se **eliminan** (auth propia en Go) |
| `GO_API_URL` | **nueva** — activa el switch |
| `SUPABASE_SERVICE_ROLE_KEY` | se **elimina** del frontend (y de todos lados al morir Supabase) |
| `PUBLIC_GEMINI_API_KEY` | se elimina (vive en Go como `GEMINI_API_KEY`) |
| `TURNSTILE_SECRET_KEY` | se **muda a Go** (la verificación server-side ya no ocurre en Next); Next conserva solo la site key pública del widget |
| `ADMIN_EMAILS` | duplicada temporalmente (UI la usa para mostrar/ocultar secciones admin); fuente de verdad = Go (`/api/auth/me` podría devolver `isAdmin` real en F13) |

## 6. Middleware de Next

`middleware.ts` se **simplifica**: ya no refresca tokens de Supabase (no existen). Queda solo el redirect: sin cookie `bm_session` → `/login`; con cookie en `/login|/register` → `/`. La validación real de la sesión la hace Go en cada API call; un 401 del API dispara logout client-side (helper compartido en `lib/api/go.ts`).
