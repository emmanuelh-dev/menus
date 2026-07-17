# 10 · Migración de datos: Supabase → Postgres en el VPS

## Principio de secuencia (importante)

La base se muda **al final** (Etapa C del doc 08), no al principio. Razón: durante el switch del admin y del sitio Astro, el código viejo (Next/Astro) y el nuevo (Go) deben ver **la misma base viva** para que el rollback sea instantáneo y no haya split-brain. Mientras tanto, `DATABASE_URL` de Go apunta al Postgres de Supabase (que es Postgres normal); el día de la mudanza solo cambia esa variable.

```
Etapa A/B:  Next viejo ──┐
            Go ──────────┼──► Postgres (Supabase)
            Astro ───────┘
Etapa C:    Go ──────────────► Postgres (VPS)      ← todo lo demás ya pasa por Go
```

Cuando llega la Etapa C, **lo único que habla con la base es Go**: la mudanza es dump/restore + 1 variable de entorno.

## Migración de usuarios (el "dolor de cabeza" que no lo es)

Verificado contra producción (2026-07-12): **44 usuarios, todos email+password, cero OAuth, todos confirmados**. Supabase guarda los passwords como **bcrypt** en `auth.users.encrypted_password` — compatible con `golang.org/x/crypto/bcrypt` tal cual. Nadie pierde su contraseña ni su UUID.

Como las tablas nuevas de auth (doc 04) se crean **en la misma base de Supabase** durante la Etapa A, la migración es una sentencia:

```sql
INSERT INTO public.users (id, email, password_hash, name, whatsapp, business_name, role, metadata, created_at, last_sign_in_at)
SELECT
  id,
  lower(email),
  encrypted_password,                                -- bcrypt $2a$10$..., compatible directo
  raw_user_meta_data->>'name',
  raw_user_meta_data->>'whatsapp',
  raw_user_meta_data->>'business_name',
  CASE WHEN lower(email) = ANY(string_to_array(lower('{{ADMIN_EMAILS}}'), ',')) THEN 'admin' ELSE 'user' END,
  raw_user_meta_data,
  created_at,
  last_sign_in_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;
```

Se ejecuta desde el SQL Editor de Supabase (o psql con el password de la base). Verificaciones post-import:

```sql
-- paridad de conteo y de ownership
SELECT (SELECT count(*) FROM auth.users) AS supabase, (SELECT count(*) FROM public.users) AS go;
SELECT count(*) FROM places p WHERE p.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = p.user_id);  -- debe ser 0
-- formato de hashes (todos deben empezar con $2a$ o $2b$)
SELECT count(*) FROM public.users WHERE password_hash IS NOT NULL AND password_hash !~ '^\$2[ab]\$';
```

Prueba de fuego antes del switch de auth: login en Go con una cuenta real (la tuya) y con una cuenta de prueba creada en el flujo viejo. Si un hash exótico no valida (no debería: todos son email+password), ese usuario cae al flujo de `password_reset` — el mecanismo ya existe en el doc 04.

**Congelar registros nuevos** el día del switch de auth (ventana de minutos): registro deshabilitado en el admin viejo → corre el INSERT (es idempotente por `ON CONFLICT`) → switch. Usuarios creados después del switch ya nacen en `public.users`.

## Mudanza física de la base (Etapa C)

### Preparación del VPS (puede hacerse semanas antes)
1. Contenedor `postgis/postgis:16` (PostGIS necesario por `shipping_zones.area`) con volumen persistente, **sin puerto público** (solo red interna de Docker). Ver doc 07.
2. Restore de prueba con un dump fresco + corrida completa del `parity.sh` y del backfill-check contra staging. Esto valida el procedimiento y da un entorno de staging real.

### Qué se muda y qué no
- **Se muda:** todo `public` (places, catalog_*, users, sessions, orders, order_items, customers, shipping_zones, reviews, states, municipalities, contact_notes, place_content_history, place_menu_visits, place_details, place_blocks…).
- **No se muda:** los schemas de Supabase (`auth`, `storage`, `realtime`, `extensions` internas). `auth.users` ya fue copiada a `public.users`; el resto es infraestructura de Supabase.
- **Extensiones requeridas en destino:** `postgis`, `pg_trgm` (si se usa para search), `pgcrypto` (gen_random_uuid).

### Procedimiento de cutover (ventana estimada: 15-30 min, horario valle)
1. `docker compose stop` de Go (o modo mantenimiento: `/healthz` en 503) — nadie escribe.
2. Dump desde Supabase (solo schema public, sin owners ni privileges de Supabase):
   ```bash
   pg_dump "$SUPABASE_DB_URL" --schema=public --no-owner --no-privileges -Fc -f menus.dump
   ```
3. Restore en el VPS:
   ```bash
   pg_restore -d "$VPS_DB_URL" --no-owner --clean --if-exists menus.dump
   ```
4. Validación automática (script `cmd/migrate-check`): conteo de filas por tabla origen vs destino, máximos de secuencias (`setval` correcto), spot-check de 5 places compilados (`Compile(Parse(x)) ≡ x` contra el destino), un login real.
5. Cambiar `DATABASE_URL` en el `.env` de Go → `docker compose up -d`.
6. QA de humo: login, dashboard, editar un item, crear orden de prueba, tracking, sitio público (que ya lee vía API Go).
7. Supabase queda **en pausa 2-4 semanas** como respaldo frío (no cancelar todavía). Cancelar cuando el mes cierre sin incidentes.

### Rollback de la Etapa C
Revertir `DATABASE_URL` a Supabase y `up -d`. Las escrituras hechas en el VPS durante la ventana se pierden — por eso el paso 1 congela escrituras ANTES del dump: si el cutover falla, no se escribió nada en ningún lado.

## Secuencias y detalles finos
- `places.id`, `orders.id`, etc. son identity/serial: `pg_restore` trae los valores; el script de validación confirma `last_value` de cada secuencia > max(id).
- `orders.uuid` y `tracking_id`: se preservan por el dump; los links de tracking enviados por WhatsApp siguen funcionando.
- Timezones: ambos lados `timestamptz` — sin conversión.
- Los IDs de sesión (`sessions`) se mudan también: nadie pierde su login por la mudanza.
