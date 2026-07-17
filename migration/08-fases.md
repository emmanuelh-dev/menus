# 08 · Fases de implementación

Tres etapas, cada una con switch propio y reversible. Regla estructural: **la base se muda al final** (doc 10) — durante A y B, Go usa el Postgres de Supabase como Postgres normal, así el código viejo y el nuevo comparten la misma base viva y el rollback es instantáneo.

- **Etapa A** — backend Go + auth propia + switch del admin (F0-F8)
- **Etapa B** — API pública + migración del sitio Astro + editor granular (F9-F10)
- **Etapa C** — mudanza física de la base al VPS + limpieza (F11-F13)

Cada fase termina con sus criterios de aceptación en verde. No avanzar con criterios rojos. El repo nuevo es `admin-menus-go`.

## Disponibilidad de lo principal (ver · editar · mostrar)

**El sistema nunca deja de ser utilizable.** El admin actual y el sitio público siguen operando durante toda la construcción porque viejo y nuevo comparten la misma base viva. Solo hay dos ventanas breves: el import de usuarios (minutos, F1/F8) y la mudanza final (15-30 min, F11).

**Camino crítico para que Go opere "ver y editar menús" cuanto antes:** F0 → F1 → F2 → F3 → F7 (~7-9 días). El rewrite de Next soporta **switch parcial por ruta**: se activa solo para lo listo y el resto sigue en el backend viejo:

```ts
// next.config.ts — switch incremental (mismo GO_API_URL, rutas explícitas)
return [
  { source: '/api/auth/:path*',   destination: `${goApi}/api/auth/:path*` },
  { source: '/api/places/:path*', destination: `${goApi}/api/places/:path*` },
  { source: '/api/ai/:path*',     destination: `${goApi}/api/ai/:path*` },
  // orders/contacts/insights siguen en Next hasta F4-F6; al completar, catch-all /api/:path*
];
```

⚠️ Única regla del switch parcial: **sesión dual durante la transición**. Las rutas Go validan `bm_session` y las rutas Next viejas validan `sb-*`, así que mientras convivan, el login hace ambas cosas: el server action firma en Supabase (como hoy) **y además** llama `POST /api/auth/login` de Go — las dos cookies quedan puestas y cada backend valida la suya. Al completar F4-F6 se cambia al catch-all, se quita el login de Supabase y muere la cookie `sb-*`. (El import de usuarios de F1 es idempotente: se re-corre justo antes de retirar el registro viejo para arrastrar usuarios nuevos.)

---

## Etapa A · Backend + auth + switch del admin

### F0 · Fundaciones (½ día)
- [ ] Repo `admin-menus-go` con layout del doc 01, `go.mod`, `cmd/server` con `/healthz` + ping a DB.
- [ ] `internal/config` (falla al arrancar si falta env requerida) y `internal/httpx` (respond/decode, body limit 10 MB).
- [ ] Dockerfile + compose del doc 07 corriendo local (incluido el contenedor `db` como staging).
- [ ] 🔐 **Rotar la service role key** (hardcodeada en `menus/scripts/get-schema.js`) y actualizar Vercel + .env. Cambiar el script para leer de env.

**Aceptación:** `curl localhost:8080/healthz` → `{"ok":true}` contra la DB real (Supabase) y contra el staging local.

### F1 · Auth propia (2 días) ← doc 04
- [ ] Migración SQL: `users`, `sessions`, `auth_tokens` (se crean en el Postgres de Supabase, schema `public`).
- [ ] **Import de usuarios**: el `INSERT ... SELECT FROM auth.users` del doc 10 + las 3 queries de verificación (44 usuarios, hashes `$2a$`, cero huérfanos en `places.user_id`).
- [ ] Middleware de sesión (Bearer + cookie `bm_session`, sliding expiration, tokens hasheados).
- [ ] Endpoints: login (con Turnstile), register, logout, me, update-profile, magic-link, reset-password, impersonate.
- [ ] Emails transaccionales vía Resend (plantillas portadas del sitio Astro).

**Aceptación:** login en Go con tu cuenta real (password de siempre) y con una cuenta creada ayer en el flujo viejo. `GET /api/auth/me` devuelve el shape del doc 04. Logout revoca (el token deja de servir al instante). Tests: bcrypt compare con un hash real exportado, expiración, token corrupto.

### F2 · Esquema normalizado + compilador + backfill (2-3 días) ← doc 09
- [ ] Migración SQL: `place_blocks`, `catalog_sections`, `catalog_items`, `catalog_item_options`, `catalog_option_values`, `catalog_item_gallery`, `place_details`, `order_items`.
- [ ] `internal/content`: `Parse` / `Compile` con la invariante `Compile(Parse(x)) ≡ x`.
- [ ] Tests con contents reales (motel, restaurante con options/prices, servicio, menu_image+crops, basura de scraping).
- [ ] `cmd/backfill` idempotente con reporte OK/DIFF/ERROR; corrida completa sobre los 1064 places, 0 sin explicar.
- [ ] Archivar tablas legacy `menu_*` (dump) y declararlas congeladas.

**Aceptación:** backfill 0 ERROR / 0 DIFF sin explicar; invariante como test de CI con fixtures reales.

### F3 · Places (1-2 días)
- [ ] `GET/POST /api/places`, `GET/PUT/DELETE /api/places/{id}`, `PUT /api/places/{id}/owner`, `GET/PUT /api/restaurants/{id}` según doc 03.
- [ ] Toda escritura de content pasa por `internal/content` (filas + proyección, una transacción). `POST /api/places` crea su `place_details`.

**Aceptación:** `parity.sh` (misma request a Next local y Go local con la misma cookie de sesión → `diff <(jq -S) <(jq -S)`) en list/search/paginado/detail; un PUT de content deja proyección y filas `catalog_*` consistentes.
> Nota de paridad: desde F1 el admin viejo y Go usan cookies distintas (`sb-*` vs `bm_session`); `parity.sh` usa un helper que abre sesión en ambos con las mismas credenciales.

### F4 · Orders, Customers, Shipping zones (1-2 días)
- [ ] Los 10 endpoints del doc 03. `POST /api/orders`: filas `order_items` + proyección `orders.items` misma transacción; backfill de `order_items` históricos.
- [ ] Matching uuid/id, whitelists de columnas. Flujo POS completo contra Go (crear → comanda → status → tracking público).

**Aceptación:** paridad list/detail; `sum(order_items.line_total) + delivery = total` en órdenes nuevas.

### F5 · Contacts (CRM) + Users (1 día)
- [ ] `GET /api/contacts` (agregación VIP/Regular/New), `GET/POST/DELETE /api/contacts/notes` (filtro `user_id` SIEMPRE).
- [ ] `GET /api/users` (query local a `users` + JOIN places — ya sin GoTrue).

**Aceptación:** paridad con cuenta admin y no-admin (incluido el fallback "solo yo").

### F6 · Insights (1 día)
- [ ] Los 3 endpoints de insights (doc 03), agregación en SQL (`date_trunc` UTC + `count(distinct visitor_id)`), buckets idénticos (incluye `today` = horas transcurridas).

**Aceptación:** paridad numérica exacta; gráficos del dashboard idénticos.

### F7 · IA (2 días) ← doc 05
- [ ] Port de `lib/ai/gemini.ts` (SYSTEM_PROMPT literal, preprocess, strip/restore, sanitize, costos) con tests.
- [ ] Cliente Gemini REST con responseSchema; `POST /api/ai/update-content` (3 modos + límite $20) y `POST /api/ai/rollback`, guardando vía `internal/content`.

**Aceptación:** preview → diff sensato; saveOnly → guardado + historial + filas correctas; rollback restaura proyección Y tablas; el label `AI_GEN: cost:` acumula bien.

### F8 · Switch del admin (1-2 días) ← doc 06
- [ ] Rewrite en `next.config.ts` (`GO_API_URL`), `lib/api/go.ts`, reescritura de `lib/api/places.ts`, actions → wrappers.
- [ ] **Auth swap**: fuera `@supabase/ssr`; login/register/logout contra Go; `middleware.ts` reducido a presencia de `bm_session`.
- [ ] Migrar los `.from(...)` directos de componentes a fetch (inventario con grep).
- [ ] Deploy Go al VPS; `GO_API_URL` en Preview → QA completo → Production.

**Aceptación:** recorrido QA completo en preview (login → dashboard → editar menú → IA → POS → comanda → contacts → users → insights → servicios). Desde aquí **nadie escribe `places.content` fuera del compilador** — verificar que el admin viejo de Astro esté fuera de uso.
**Rollback:** quitar `GO_API_URL` + revert del commit de auth swap.

---

## Etapa B · Sitio público + editor granular

### F9 · API pública + migración del Astro (3-5 días) ← doc 11
- [ ] Namespace `/api/public/*` completo (places, states, municipalities, visits, reviews con Turnstile, shipping check, contact) con caché `s-maxage` y rate limit en escrituras.
- [ ] `menus/src/lib/api.ts` (cliente tipado) y migración por secciones: moteles → restaurantes → servicios → tienda → sitemaps, cada una validada en preview con diff visual.
- [ ] Retirar el admin viejo de Astro (`/admin/**`) y sus API routes legacy.

**Aceptación:** cero `supabase-js` en el repo `menus`; Lighthouse/HTML de las páginas clave sin regresión; visitas y reseñas fluyen por Go.

### F10 · Endpoints granulares + migración del editor (2-3 días) ← doc 09
- [ ] Endpoints granulares (catalog, sections, items, availability, details, blocks/order).
- [ ] Editor de admin-menus migrado del PUT-blob a mutaciones granulares; toggle de disponibilidad en POS/comanda.

**Aceptación:** editar un item = una mutación de un item (verificable en logs); la proyección sigue idéntica a lo que renderiza el sitio público.

---

## Etapa C · Mudanza de la base + cierre

### F11 · Cutover de la base al VPS (1 día + ventana de 15-30 min) ← doc 10
- [ ] Restore de ensayo en staging + `cmd/migrate-check` en verde.
- [ ] Ventana: freeze → `pg_dump --schema=public` → `pg_restore` → validación → `DATABASE_URL` → smoke QA.
- [ ] Backups cron + offsite activos desde el día 1 (doc 07).

**Aceptación:** `migrate-check` en verde (conteos, secuencias, spot-check del compilador, login real); sitio y admin operando contra el VPS.
**Rollback:** revertir `DATABASE_URL` (no se escribió nada en ningún lado durante la ventana).

### F12 · Limpieza (½-1 día)
- [ ] Borrar `app/api/**` de admin-menus, `lib/api/*` viejos, `lib/ai/gemini.ts`, y todo rastro de `@supabase/*` en ambos frontends.
- [ ] Quitar env de Supabase en Vercel. READMEs actualizados (cómo correr local: Go + Postgres en compose, Next, Astro).
- [ ] Supabase en pausa 2-4 semanas → cancelar.

### F13 · Endurecimiento (post-switch, uno por uno)
- [ ] `GET /api/orders?place_id=` → exigir dueño/admin.
- [ ] `shipping_zones` CRUD → exigir dueño del place.
- [ ] `POST /api/orders` y `POST /api/public/*` → revisar rate limits con tráfico real.
- [ ] `PUT /api/restaurants/{id}` → exigir dueño/admin.
- [ ] `preview` de IA → ownership antes de gastar tokens.
- [ ] Renombrar columnas camelCase de `places` (ya nadie más que Go toca la base: ahora sí es barato).

---

## Estimación total

- Etapa A: ~10-13 días → el admin ya corre en Go.
- Etapa B: ~5-8 días → Supabase ya no tiene lectores.
- Etapa C: ~1-2 días → todo en el mismo servidor.

**Total: ~17-23 días** de implementación mecánica. Cada switch es independiente y reversible; se puede pausar entre etapas sin dejar nada roto.
