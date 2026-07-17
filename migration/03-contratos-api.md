# 03 · Contratos de API (paridad 1:1)

Go debe servir **exactamente estas rutas con estos shapes**. Fuente de verdad: `admin-menus/app/api/**/route.ts` (referenciado por endpoint). La normalización (doc 09) **no altera ninguno de estos contratos**: los GET devuelven la proyección `content` y los PUT/POST que reciben `content` lo parsean a tablas y recompilan la proyección en la misma transacción. Los endpoints granulares nuevos están especificados en el doc 09. Convenciones globales:

- Errores: `{"error": "<mensaje>"}` con el status indicado. Mensajes en el idioma del original (mezcla ES/EN: copiarlos tal cual).
- Auth: `🔒` = requiere usuario (401 si no), `👑` = además ownership o admin, `🌐` = público.
- "admin" = email en `ADMIN_EMAILS` (doc 04).
- Timestamps: RFC3339 como los emite PostgREST.

---

## Places

### `GET /api/places` 🔒 — `app/api/places/route.ts` + `lib/api/places.ts`
Query: `page=1`, `limit=20`, `sort=updated_at`, `order=desc`, `search`
- No-admin: solo `user_id = uid`. Search: `name ILIKE %s% OR short_name ILIKE %s%`.
- Orden: `sort` dinámico + `id ASC` secundario. Paginación por rango.
- **200** `{"data": [Place...], "count": <total>}`. Cada Place lleva `state_slug` (de `states.slug` si viene embebido; hoy queda `undefined` porque el select no embebe states: replicar con `null`/omitir).
- Si no hay usuario: `{"data":[],"count":0}` (200, no 401 — así lo hace el original).

### `GET /api/places/{id}` 🔒👑 — `app/api/places/[id]/route.ts:79`
- No-admin: filtro `user_id = uid`. No encontrado → **404** `{"error":"Place not found"}`.
- **200** → el objeto Place plano (sin envolver).

### `PUT /api/places/{id}` 🔒👑 — `app/api/places/[id]/route.ts:5`
Body: `{"content": Content?, "place": {"name"?: string, "image"?: string}?}`
- Verifica ownership (404 `Place not found or access denied` si falla).
- Update parcial: `updated_at = now()`, `content` si viene, `name`/`image` con trim si vienen. Si no hay nada que actualizar → **400** `{"error":"Nothing to update"}`.
- **200** `{"success": true}`.

### `DELETE /api/places/{id}` 🔒👑 — `app/api/places/[id]/route.ts:112`
- Ownership igual que PUT. **200** `{"success":true}` (ver original para shape exacto del final).

### `POST /api/places` 🔒 — **nuevo** (reemplaza server action `app/actions/places.ts:createPlace`)
Body: `{"name": string, "type": string, "state_id"?: number, "municipality_id"?: number, "content"?: Content}`
- Genera `short_name` = slug del name (lowercase, sin acentos NFD, `[^a-z0-9]+`→`-`, trim `-`).
- Inserta con `user_id = uid`. **201** `{"data": Place}`.
- Cubre también `createServicio` (`app/actions/servicios.ts`): el frontend arma el `content.semantic_data` (phone, whatsapp, address, hours, areas, additional_features, is_mobile) y manda el mismo POST. Validación mínima en Go: `name` ≥ 2 chars, `type` no vacío.

### `PUT /api/places/{id}/owner` 🔒 admin-only — **nuevo** (reemplaza `updatePlaceUser`)
Body: `{"user_id": string}` → reasigna dueño. **200** `{"success":true}`. 403 si no es admin.

### `GET /api/restaurants/{id}` 🔒 — `app/api/restaurants/[id]/route.ts`
- **Sin check de ownership** en el original (solo login). Mantener paridad.
- **200** `{"data": Place}` · 404 `{"error":"Restaurante no encontrado"}`.

### `PUT /api/restaurants/{id}` 🔒 — legacy, update de fila completa
Body: objeto Place parcial. Reglas: si solo trae `content` → update directo; si no, `name` y `address` obligatorios (400 `El nombre y la dirección son obligatorios`). `content` null/undefined se elimina del payload. **Cuidado:** el original pasa el body casi entero a `update` — en Go, permitir solo columnas reales de `places` (whitelist del doc 02) y descartar el resto (`states`, `state_slug`, `reviewCount`, etc.).
- **200** `{"success": true, "data": Place}` con `states` embebido (`select *, states(*)`).

---

## Orders

### `GET /api/orders` 🔒 — `app/api/orders/route.ts`
Query: `place_id?`, `status?` (CSV → IN), `page=1`, `pageSize=50`
- Con `place_id`: filtra por ese lugar (⚠️ el original NO verifica ownership aquí; mantener, o endurecer en fase 2 con flag).
- Sin `place_id`: junta los `place_id` del usuario; si no tiene lugares → `{"orders":[],"totalOrders":0}`.
- Orden `created_at DESC`, rango de paginación.
- **200** `{"orders":[Order...],"totalOrders": n}`.

### `POST /api/orders` 🌐 — inserta el body tal cual (whitelist de columnas de `orders`), **201** `{"order": Order}`. Sin auth en el original (lo usa el POS y el sitio público).

### `GET /api/orders/{id}` 🌐 — `app/api/orders/[id]/route.ts`
- `{id}` es UUID (regex) → busca por `uuid`; si no, por `id`. Público: es la página de tracking.
- **200** `{"order": Order + places:{name,short_name,user_id}}` · 404 `{"error":"Order not found"}`.

### `PUT /api/orders/{id}` 🔒 — mismo matching uuid/id. Body → update directo (whitelist). **200** `{"order": Order+places}`.

---

## Customers

### `GET /api/customers` 🔒 — `app/api/customers/route.ts`
Query: `phone?`, `place_id?`, `search?`, `page=1`, `pageSize=50`
- Scope: teléfonos de clientes que han ordenado en lugares del usuario (`orders.customer_phone IN (select ... where place_id in mis lugares)`). En Go: un solo query con JOIN en vez de los 3 round-trips del original — mismo resultado.
- `search`: `name ILIKE OR phone ILIKE`. Orden `name ASC`.
- **200** `{"customers":[...],"totalCustomers": n}`. Vacíos → `{"customers":[],"totalCustomers":0}`.

### `POST /api/customers` 🌐 — upsert por `phone`: si existe, update de (name, email, default_address, default_lat, default_lng, default_colony) → **200** `{"customer"}`; si no, insert → **201** `{"customer"}`.

---

## Shipping zones

### `GET /api/shipping-zones?place_id=` 🌐 — 400 `place_id is required` si falta. **200** `{"zones":[...]}` orden `name`.
### `POST /api/shipping-zones` 🌐 — 400 si falta `place_id` en body. **201** `{"zone"}`.
### `PUT /api/shipping-zones/{id}` 🌐 — update body directo (whitelist). **200** `{"zone"}`.
### `DELETE /api/shipping-zones/{id}` 🌐 — **200** `{"success":true}`.
> ⚠️ Ninguno valida usuario en el original. Paridad primero; endurecimiento después (fase opcional F9). `area` (PostGIS): si el body la trae como GeoJSON, castear con `ST_GeomFromGeoJSON`; si no se usa, dejar NULL.

---

## Contacts (CRM)

### `GET /api/contacts` 🔒 — `app/api/contacts/route.ts` + `lib/api/customers.ts:getCustomers`
- `restaurantName`: nombre (o short_name) del primer lugar del usuario; fallback `"nuestro restaurante"`.
- `customers`: **derivados de orders** (últimas 1000 órdenes de los lugares del usuario, agrupadas por `customer_phone`):
  ```json
  {"id": "<phone>", "name": "...", "phone": "...", "total_orders": n,
   "total_spent": n, "last_order_date": "<created_at de la orden más reciente>",
   "status": "VIP|Regular|New"}
  ```
  Reglas de status: `>5 órdenes o >5000 gastado` → VIP; `>1 orden` → Regular; si no → New. `search` filtra por name/phone.
- **200** `{"customers":[...], "restaurantName": "..."}`.

### `GET /api/contacts/notes?phone=` 🔒 — notas del contacto **del usuario** (`user_id = uid`), orden `created_at DESC`. **200** `{"notes":[...], "tableExists": true}`. 400 `Teléfono requerido` si falta phone.
### `POST /api/contacts/notes` 🔒 — body `{contact_phone, contact_name?, note_type?, content}`; 400 `Datos incompletos` si falta phone/content. Inserta con `user_id = uid`. Ver route.ts para shape de respuesta (devuelve la nota creada).
### `DELETE /api/contacts/notes?id=` 🔒 — borra solo si `user_id = uid` (ver `route.ts:99` para contrato exacto).
> El "ensureTable" del original (`tableExists`) se conserva como campo constante `true` — la tabla ya existe en producción.

---

## Users / Auth

### `GET /api/users` 🔒 — `app/api/users/route.ts` + `lib/api/users.ts`
Query: `search?`
- No-admin: devuelve array con **solo el usuario actual** (shape `SystemUser`, doc 02).
- Admin: query local a `users` + JOIN agregado de `places.name` por `user_id` (auth propia, doc 04); `full_name` = name || primer place || prefijo del email; `role` = columna `role` (admin si email ∈ ADMIN_EMAILS).
- **200** `[SystemUser...]` (array plano, sin envolver). `search` filtra email/full_name/business_name/whatsapp/places.

### `GET /api/auth/me` 🌐 — **200** `{"user": {...} | null, "isAdmin": false}`. Mantiene el shape del user de Supabase que la UI ya lee: `{id, email, user_metadata:{name,whatsapp,business_name}, created_at, last_sign_in_at}`, fabricado desde la tabla `users` (doc 04). Nunca 401: sin sesión → `{"user":null}`.

### `POST /api/auth/update-profile` 🔒 — body `{name?, whatsapp?}` → `UPDATE users`. **200** `{"success":true,"user":{...}}`.

### Auth propia (nuevos, reemplazan server actions y GoTrue) — contratos completos en doc 04
`POST /api/auth/login` · `POST /api/auth/register` · `POST /api/auth/logout` · `POST /api/auth/magic-link` · `GET /api/auth/magic` · `POST /api/auth/reset-password[/confirm]` · `POST /api/admin/impersonate`

---

## Insights

### `GET /api/admin/insights?range=7d|30d|24h|today` 🔒 — `app/api/admin/insights/route.ts`
Globales (sin filtro de lugar — lo usa el dashboard admin). Respuesta exacta:
```json
{
  "visits": {
    "today":     {"total": n, "unique": n},
    "yesterday": {"total": n, "unique": n},
    "week":      {"total": n, "unique": n},
    "daily": [{"date": "<ISO>", "total": n, "unique": n}, ...]
  },
  "rating": {"average": 4.3, "totalReviews": n},
  "recentComments": []
}
```
- Buckets: horas UTC si range es `24h`/`today` (today: solo horas transcurridas), días UTC si `7d`/`30d`. `unique` = visitor_id distintos. `average` = promedio de `reviews.rate > 0`, 1 decimal.
- **En Go: hacer la agregación en SQL** (`date_trunc` + `count(distinct visitor_id)`), no en memoria como el original. Mismo output.

### `GET /api/admin/place/{id}/insights?range=` 🔒👑 — igual que el anterior pero filtrado por `place_id`, con ownership (403 si no es admin ni dueño), y además `recentComments` = últimas 20 reviews del lugar (ver `route.ts` líneas 50-151 para el shape del mapeo).

### `GET /api/admin/place/{id}` 🔒👑 — **200** `{"place": Place + states(*), "reviews": [Review... DESC], "isAdmin": bool}` · 404/403 según original.

---

## IA

### `POST /api/ai/update-content` 🔒👑 y `POST /api/ai/rollback` 🔒👑 — ver [05-ai-gemini.md](05-ai-gemini.md).

---

## Rutas del sitio Astro que NO se migran

`menus/src/pages/api/**` (login, register, magic-link, impersonate, upload, analytics/visit, submit-review, revalidate, etc.) siguen viviendo en Vercel con el sitio público. No duplicarlas en Go.
