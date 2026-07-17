# 04 · Autenticación y autorización (auth propia en Go)

**Decisión:** Supabase desaparece por completo. Go es el proveedor de identidad: emite sesiones, valida credenciales y administra usuarios. Los usuarios existentes se migran desde `auth.users` **conservando UUID y hash de contraseña** (Supabase usa bcrypt: nadie pierde su password, ver doc 10).

## Esquema de auth (tablas nuevas)

```sql
CREATE TABLE users (
  id             uuid PRIMARY KEY,            -- MISMO uuid que auth.users (places.user_id ya apunta aquí)
  email          text NOT NULL UNIQUE,        -- guardar lowercase
  password_hash  text,                        -- bcrypt ($2a$...), NULL si solo magic-link
  name           text,
  whatsapp       text,
  business_name  text,
  role           text NOT NULL DEFAULT 'user',-- user|staff|admin (reemplaza app_metadata.role)
  metadata       jsonb,                       -- resto de user_metadata migrada, por si acaso
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_sign_in_at timestamptz
);

CREATE TABLE sessions (
  token       text PRIMARY KEY,              -- 32 bytes random, base64url (se guarda HASHEADO: sha256)
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,          -- 30 días, sliding: se extiende al usarse
  impersonated_by uuid REFERENCES users(id), -- NULL salvo sesiones de impersonate
  user_agent  text,
  ip          text
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE auth_tokens (                   -- magic links y reset de contraseña
  token      text PRIMARY KEY,               -- hasheado igual que sessions
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose    text NOT NULL CHECK (purpose IN ('magic_link','password_reset')),
  expires_at timestamptz NOT NULL,           -- 15 min
  used_at    timestamptz
);
```

Sesión **opaca en tabla** (no JWT): revocable al instante, sin secretos que rotar, y el costo de un SELECT por request es irrelevante a esta escala. Los tokens se guardan hasheados (sha256) para que un dump de la tabla no regale sesiones.

## Cookie

- Nombre: `bm_session`. Valor: el token en claro (solo el cliente lo tiene).
- `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`.
- La emite Go en login/register/magic-link; la borra logout.
- Con el rewrite de Next (doc 06) la cookie es first-party del dominio del admin: viaja sola.

## Middleware en Go

1. Leer `Authorization: Bearer <token>` (tests/clientes) o cookie `bm_session`.
2. `sha256(token)` → lookup en `sessions` con `expires_at > now()`; cargar `users`.
3. Sliding: si quedan <15 días, extender `expires_at` (update asíncrono, best-effort).
4. Contexto: `AuthUser{ID, Email, Name, Whatsapp, BusinessName, Role, IsAdmin}`.
5. `IsAdmin` = `role == 'admin'` **o** email ∈ `ADMIN_EMAILS` (paridad con `lib/admin.ts`; el env sigue mandando).

## Endpoints de auth (reemplazan GoTrue y los server actions de Next)

| Endpoint | Contrato |
|---|---|
| `POST /api/auth/login` | body `{email, password, turnstileToken?}`. Verifica Turnstile (si `TURNSTILE_SECRET_KEY` está configurada; en dev pasa sin token — paridad con `app/auth/actions.ts`), bcrypt compare, crea sesión, `Set-Cookie`. 200 `{user}` · 401 `{"error":"Credenciales inválidas"}` |
| `POST /api/auth/register` | body `{email, password, name?, whatsapp, business_name, turnstileToken?}` — validaciones del zod actual (password ≥6, whatsapp ≥8, business_name ≥2). Crea user (uuid nuevo) + sesión. 201 `{user}` · 409 email duplicado |
| `POST /api/auth/logout` | borra la sesión + `Set-Cookie` expirada. 200 `{"success":true}` |
| `GET /api/auth/me` | **mantiene el shape actual** para no tocar la UI: `{"user": {"id","email","user_metadata":{"name","whatsapp","business_name"},"created_at","last_sign_in_at"} \| null, "isAdmin": false}`. El objeto `user_metadata` se fabrica desde las columnas |
| `POST /api/auth/update-profile` | body `{name?, whatsapp?}` → UPDATE users. 200 `{"success":true,"user":{...}}` |
| `POST /api/auth/magic-link` | body `{email}` → token en `auth_tokens` + email vía Resend (el sitio Astro ya usa Resend; plantilla portada de `menus/src/pages/api/auth/magic-link.ts`). Siempre 200 (no revelar si el email existe) |
| `GET /api/auth/magic?token=` | valida+quema token → crea sesión → redirect al dashboard |
| `POST /api/auth/reset-password` / `POST /api/auth/reset-password/confirm` | mismo mecanismo de `auth_tokens` con purpose `password_reset` |
| `POST /api/admin/impersonate` | admin-only. body `{user_id}` → crea sesión con `impersonated_by = admin.id` y setea cookie. Reemplaza el impersonate del admin viejo de Astro |

`bcrypt`: `golang.org/x/crypto/bcrypt`, cost 10 (el mismo de los hashes migrados; los nuevos también cost 10).

## Autorización por tabla (sin cambios de fondo)

La matriz se conserva; solo cambia la fuente del usuario:

| Tabla | Regla en Go |
|---|---|
| `places` | listar/leer/editar/borrar: `user_id = uid` salvo admin. Crear: `user_id = uid` forzado servidor-side |
| `catalog_*`, `place_details`, `place_blocks` | vía ownership del place asociado |
| `orders` | listado agregado: scoped a lugares del usuario. Por `place_id` explícito: sin check (paridad; endurecer en fase final) |
| `customers` | scoped vía órdenes de los lugares del usuario |
| `contact_notes` | **siempre** `user_id = uid` en SELECT/INSERT/DELETE |
| `place_content_history` | acceso solo tras verificar ownership del place asociado |
| `users`, `sessions` | solo admin lista usuarios; cada quien su perfil |
| `place_menu_visits`, `reviews`, `states`, `municipalities` | lectura libre autenticada; escritura de visits/reviews vía API pública (doc 11) |

## `GET /api/users` (simplificado)

Ya no hay GoTrue Admin API: es un query local.
- No-admin: array con solo el usuario actual (shape `SystemUser` del doc 02).
- Admin: `SELECT` de `users` + LEFT JOIN agregado de `places.name` por `user_id`. Mismos fallbacks de `full_name` que `lib/api/users.ts` (name → primer place → prefijo de email). `search` en SQL (`ILIKE` sobre email/name/business_name/whatsapp) o en memoria — da igual a esta escala.

## Cambios en los frontends (resumen; detalle en doc 06)

- **admin-menus:** se elimina `@supabase/ssr` y `@supabase/supabase-js`. Login/registro/logout llaman a los endpoints Go (vía el rewrite). El `middleware.ts` de Next deja de refrescar tokens de Supabase: solo verifica que exista cookie `bm_session` para el redirect a `/login` (la validación real la hace Go en cada API call; un 401 del API también dispara redirect client-side).
- **Sitio Astro:** su login/admin viejo usa Supabase Auth → queda apuntando al API público/auth de Go o se retira (ya está superseded; decidir en la fase Astro, doc 11).

## Qué desaparece

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` — todos los env de Supabase, en ambos frontends y en Go.
- El parseo de cookies `sb-*`: ya no existe.
- Nota transitoria: durante la construcción (antes del cutover de auth) el equipo puede seguir entrando al admin viejo con Supabase; las dos autenticaciones no se pisan porque usan cookies distintas.
