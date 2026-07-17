# Estado de la migración

Última actualización: 2026-07-17 (sesión 3).

### Nota de reconciliación (commit `f41b779`)
Antigravity trabajó en paralelo sobre moteles y pusheó su propio `src/lib/api.ts` (commit `f41b779`, "feat: migrate motels pages to use public Go API client"). Al hacer merge se resolvió a favor de la versión de esta sesión para `src/lib/api.ts` y las 5 páginas de moteles: la de Antigravity pedía `GET /api/public/places?limit=200` fijo, que trunca (el inventario de moteles ya son 528 — justo el bug que se encontró y arregló en esta misma sesión, ver "Hallazgo real #3" más abajo). El resto de esta sesión (restaurantes, servicios, tienda, cafeterías, menus-digitales, sitemaps, qr, manifest, contacto) no tenía equivalente en el commit de Antigravity, así que no hubo conflicto ahí.

## ⚠️ Desviación aprobada del orden de fases (doc 08)

Por decisión explícita del usuario, se adelantó una porción de **F9 (API público, doc 11)** fuera de su lugar en el camino crítico (que lo ubica después de F3-F8). Motivo: priorizar que el sitio público sea "visitable" (lecturas) cuanto antes, aunque login/escritura del admin sigan sin terminar. Es seguro porque los endpoints públicos son **solo lectura**, no dependen de auth ni del backfill de `catalog_*` (leen `places.content` directo, igual que hacía Supabase). Detalle en la sección F9 más abajo.

## Fase actual: F2 · Esquema normalizado + compilador + backfill — EN CURSO (backfill terminó de correr; quedan 2 pendientes reales antes de cerrar, ver abajo). En paralelo, arrancó una porción de F9 (ver abajo).

Esta fue la fase que el prompt original marcó como la más delicada. Se encontraron **varios gaps reales entre los docs 02/09 y los datos de producción** (no hipotéticos: verificados con queries directas contra los 1064 places reales antes de escribir una sola línea de Go). Cada uno se reportó y se resolvió con aprobación explícita antes de tocar código, salvo los que eran arreglos de bugs propios del compilador (esos se corrigieron directo, documentados aquí).

### Hallazgos reales en el modelo de datos (aprobados antes de implementar)

1. **Claves top-level de `content` no documentadas**: `pos_config.tables` (layout de mesas del POS, 3 places, usado activamente por `TableManager.tsx`/`TablePOS.tsx`/`WaiterMode.tsx`/`CashControl.tsx`), `media_library` (biblioteca de imágenes del editor, 45 places), `gallery` top-level (9 places — **el propio doc05 lo referencia** como destino de `new_gallery_images` de la IA, pero doc02/09 nunca lo declaran). Ninguna existía en el tipo TS `Content` real. → **Resuelto**: columna nueva `place_details.content_extra jsonb` (catch-all, mismo patrón que `extra` en sections/items).
2. **Colisión de IDs de block/item entre places distintos**: `place_blocks.id`/`catalog_items.id` como PK global (tal como los especifica doc09 literal) truena en el primer INSERT duplicado — verificado: `block-1718380800000-1` se repite en 12 places, `new-item-1` en 10, etc. (cero duplicados *dentro* del mismo place). → **Resuelto**: `PRIMARY KEY (place_id, id)` en `place_blocks` y `catalog_items` en vez de PK global. Costo: los endpoints granulares de F10 (aún no implementados) deberán llevar `place_id` en el path.
3. **`view_settings` trae claves no documentadas**: `template`, `hide_category_images`, `show_categories_at_start` (hasta 48 places). → **Resuelto**: se persisten en la misma columna `content_extra`, bajo la subclave reservada `__view_settings_extra__` (no hizo falta otra columna).

### Bugs del compilador corregidos durante la validación (no eran "diffs aceptables", eran errores míos)

Antes de aceptar cualquier diff como "esperado", corrí el compilador contra los **1064 places reales** (Parse→Compile en memoria, sin tocar la base) y clasifiqué cada diferencia. Bajó de 1053/1064 con diff a **0 sin explicar** tras estos fixes reales:
- `description`/`image`/`category`/`slug` (sections e items) eran `string` en vez de `*string`: la distinción "ausente" vs "presente y vacío" es real y masiva en producción (item.description presente en 99.9% de los items; section.description en solo 16%) — con `string` plano, mi `omitempty` de más borraba la clave siempre que estaba vacía, aunque el original la trajera explícita.
- `features`/`options`/`gallery` (por item) y `blocks` (top-level): mismo problema pero con arrays — `nil` (ausente) vs `[]` no-nil (presente, vacío) es una distinción real de `encoding/json` que mi código colapsaba con `len(x)>0`. Afecta volumen grande: 987 items con `"features":[]`, 309 con `"options":[]`.
- `view_settings` solo capturaba `layout`/`show_prices`, tirando el resto (ver hallazgo 3 arriba).

### Decisiones de normalización aprobadas por el usuario (diffs esperados, no bugs)

- **`price` string→number siempre**: 42% de los items reales (12,007/28,464) traen `price` como string (`"277"`), siempre numérico limpio. Se coerciona siempre a number; la proyección nunca vuelve a emitir string. `catalog_items.price` es `numeric(10,2)`.
- **`available` siempre se emite** (no solo cuando es `false`): 100% de los valores explícitos reales son `true` (25,511/25,511); `NOT NULL boolean` no puede distinguir "ausente" de "true" tras pasar por la base.
- **`null` explícito == ausente**: `"reservation_url": null`, `"hours": null`, etc. (~500 casos reales) se tratan igual que la clave ausente — incluso en Postgres ambos son `NULL`, no hay diferencia funcional para ningún consumidor.
- **`semantic_data: {}` explícito se omite** al compilar (9 places reales) — incluso en Postgres ambos son `NULL`, no hay diferencia funcional para ningún consumidor.
- **`featured: false` explícito se pierde** (6 sections reales) — mismo motivo que `available`, pero footprint pequeño así que no se le puso puntero.
- **`gallery[].description` no tiene columna** (`catalog_item_gallery` no la declara en doc09): 3 casos reales, siempre `""`. Aceptado tal cual doc09.

### Gap conocido y documentado: `options`/`gallery` vacíos explícitos NO sobreviven un round-trip real por la DB

`Parse`/`Compile` en memoria SÍ preservan `options:[]`/`gallery:[]` explícitos (nil vs no-nil-vacío, ver arriba). Pero `catalog_item_options`/`catalog_item_gallery` son **tablas hijas**: cero filas no distingue "ausente" de "presente pero vacío" — es una limitación real del modelo relacional (doc09), no algo que se pueda arreglar sin otra columna. Después de `WriteDoc`→`ReadDoc`, estos casos (309 + 10 en producción) se leen siempre como ausentes. Es un diff esperado específicamente en el backfill (no en el compilador puro), documentado aquí en vez de "resuelto" con otra columna — footprint chico, cero diferencia funcional.

### Hecho
- `migrations/0002_catalog.sql`: `place_blocks`, `catalog_sections`, `catalog_items`, `catalog_item_options`, `catalog_option_values`, `catalog_item_gallery`, `place_details` (+`content_extra`), `order_items` — con las desviaciones aprobadas arriba. Aplicada contra Supabase real y Postgres local.
- `migrations/0003_place_blocks_opaque.sql`: `place_blocks.is_opaque boolean` — necesaria para que los bloques "basura de scraping real" (sin `id`/`data`, shape roto) puedan reproducirse byte a byte en `Compile` sin ambigüedad con un payload normal. Aplicada en ambos entornos.
- `internal/content`: `doc.go` (structs), `parse.go` (`Parse`), `compile.go` (`Compile`), `extra.go`, `diff.go` (`NormalizedEqual`/`CanonicalJSON`, usados también por `cmd/backfill`), `store.go` (`WriteDoc`/`ReadDoc`).
- Tests: `compile_test.go` (invariante contra fixture real limpio, bloque opaco real, menu_image con crop real, options/prices reales), `transforms_test.go` (cada normalización documentada, con fixtures sintéticos mínimos), `store_test.go` (round-trip completo por Postgres real: write→read→compile, idempotencia, bloque opaco sobrevive la DB). `go test ./...` en verde.
- `cmd/backfill`: recorre los 1064 places reales, cada uno en su propia transacción (`WriteDoc` hace `DELETE`+re-insert, así que correrlo de nuevo no duplica), relee (`ReadDoc`) y compila para reportar OK/DIFF/ERROR. **No toca `places.content`** (verificado en el código: `WriteDoc`/`ReadDoc` solo tocan `catalog_*`/`place_blocks`/`place_details`).
- Tablas legacy `menu_*` (7 tablas: `menus`, `menu_categories`, `menu_items`, `menu_category_assignments`, `menu_item_options`, `menu_option_groups`, `menu_option_group_items`) archivadas en `admin-menus-go/archive/` (CSV + esquema — `pg_dump` local es v14, el servidor es v15.8 y rechaza dumpear un servidor más nuevo, así que se usó `\copy`). Declaradas congeladas para Go (ningún código nuevo las toca); no se tocó la base real, el admin viejo de Astro las sigue usando con normalidad.

### Evidencia de aceptación
### Resultado del backfill (recuperado retroactivamente — la sesión se cortó antes de anotarlo aquí)

El backfill sí terminó de correr (evidencia: `admin-menus-go/backfill-report-2026-07-13-0002.txt`, 13 MB, generado 2026-07-13 02:53 — **no está en git**, solo en disco local, ver `.gitignore`). El resumen final (`total=... OK=... DIFF=... ERROR=...`) se imprimía por stdout, no al archivo, y esa terminal ya no existe. Reconstruido contando el archivo:

```
total=1064  OK=232  DIFF=822  ERROR=10
```

**Los 822 DIFF, en su gran mayoría, son las desviaciones ya aprobadas arriba** (spot-check + clasificación automática de las líneas de diff): la más frecuente con diferencia es `"available": true` insertándose en items que no lo traían explícito en el original — es exactamente el comportamiento aprobado ("`available` siempre se emite"). También aparecen los otros casos ya documentados (`price` string→number, `null` explícito, `options`/`gallery` vacíos que no sobreviven el round-trip).

**Hallazgo nuevo, no documentado antes — necesita decisión:** varios items traen `price` con **más de 2 decimales** en producción real (ej. `23.982`, `7.992`, `1.651`, `0.393`, `19.9934` — vistos en places 1417, 1509, 1512, 1526, 1581). `catalog_items.price` es `numeric(10,2)`, así que se redondean a centavos al guardarse. No estaba en la lista de desviaciones aprobadas de arriba (esa solo cubre el cambio string→number, no la pérdida de precisión). Pendiente: ¿se acepta el redondeo a centavos (probablemente sí, es dinero) o se sube la escala de la columna?

**Bug real, no transitorio — necesita investigación:** `place=83` y `place=2335` fallan con `ERROR: duplicate key value violates unique constraint "catalog_items_pkey" (SQLSTATE 23505)`. Esto contradice lo verificado en el hallazgo 2 de arriba ("cero duplicados *dentro* del mismo place") — significa que para esos dos places específicos sí hay un `catalog_items.id` repetido dentro del mismo place, o hay un bug distinto en `WriteDoc`. Pendiente: inspeccionar `places.content` de esos dos IDs.

**Errores transitorios, no son bug:** los otros 8 ERROR (`place=1255,1282,1289,1290,1294,1296,1304,1311`) son `read: connection reset by peer` contra el pooler de Supabase — problema de red, no de código. `cmd/backfill` es idempotente (`WriteDoc` hace `DELETE`+re-insert), así que **basta con volver a correrlo** para que esos 8 places (y los 822 DIFF, si se decide regenerar el reporte) se reprocesen sin duplicar nada.

### Qué falta para dar F2 por 100% cerrada
- [ ] Decidir qué hacer con la pérdida de precisión en `price` (redondeo a centavos vs. ampliar la columna).
- [ ] Investigar y resolver el duplicate-key real en `place=83` y `place=2335`.
- [ ] Re-correr `cmd/backfill` tras el fix — debería dar `ERROR=0` y el mismo patrón de `DIFF` esperado (o `DIFF=0` si además se decide no considerarlos diffs).
- [ ] Endpoints granulares de catálogo (F10, aún no arrancan) — recuerda que llevan `place_id` en el path por la decisión del hallazgo 2.

## F9 (adelantada parcialmente) · API público de lectura (doc 11)

Solo el subconjunto de solo-lectura, adelantado del orden normal de fases (ver aviso al inicio del documento). Repo `admin-menus-go`, commit `0ea3874`.

### Hecho
- `internal/model/place.go`: struct `Place` (mismo shape que hoy arma Supabase con `select('*, states(*), municipalities(*)')`, más `rating`/`reviewCount` agregados), `State`, `Municipality`.
- `internal/api/public.go`, namespace `/api/public/*`, sin auth, `Cache-Control: public, s-maxage=300, stale-while-revalidate=3600`:
  - `GET /api/public/places?type=&state_id=&municipality_id=&featured=&limit=&offset=`
  - `GET /api/public/places/{slug}` (por `short_name`, 404 si no existe)
  - `GET /api/public/states` (con `total_places` agregado)
  - `GET /api/public/municipalities?state_id=`
- `rating`/`reviewCount` se calculan en la misma query SQL (`LEFT JOIN` agregando `reviews`) — Astro hoy hace esto con una segunda consulta y lo agrega en JS (`getRestaurants`/`getRestaurantByName` en `menus/src/lib/supabase.ts`); en Go quedó en una sola vuelta.
- CORS abierto (`Access-Control-Allow-Origin: *`) solo para `/api/public/*`, agregado en `cmd/server/main.go` (`withPublicCORS`). El resto de rutas no lleva CORS (no lo necesitaban hasta ahora).
- Probado en vivo contra Supabase real: los 4 endpoints devuelven datos reales (32 estados, municipios de Nuevo León, detalle de `la-santa`, 404 en slug inexistente), `go vet`/`go test ./...` en verde.

### Hallazgo real (no documentado en doc02): `places.featured` tiene NULL en producción
Doc02 lo declara `featured bool` (no nullable). El primer intento de escaneo tronó con `cannot scan NULL into *bool` contra datos reales. Se corrigió escaneando `*bool` y default `false` si es `NULL` — el JSON de salida sigue siendo `bool` siempre presente (paridad con lo que el frontend espera), pero internamente hay filas con `featured IS NULL` que doc02 no contemplaba.

### Hallazgo real #2 (no documentado en doc02): `places.services` es `text`, no `text[]`
Doc02 declara `services text[] | null`. Falso — verificado con `\d places` en Supabase real: la columna es `text` simple, con valores tipo `"Aire acondicionado, Estacionamiento, WiFi, TV por cable, Recepcion 24h"` (string separado por comas, no array Postgres). Cualquier place con `services` no nulo (los moteles lo usan mucho) tronaba el scan (`cannot scan text in text format into *[]string`) — pasó desapercibido en las primeras pruebas porque el primer place probado (`la-santa`) tenía `services: null`. Corregido: `model.Place.Services` es `*string`. **doc02 necesita esta corrección** si alguien más lo usa como referencia.

### Hallazgo real #3: el límite por defecto de `GET /api/public/places` truncaba resultados
Primer intento puso `limit=60` por defecto. Chiapas solo (1 estado) ya tiene 61 places — el default hubiera roto paridad con lo que hace hoy Astro (`getRestaurants` trae TODO lo que matchea el filtro, sin límite) apenas alguien migrara una página de estado. Corregido: sin `limit` explícito no se pagina (tope de seguridad 2000, el inventario real es 1064); con `limit` explícito sí pagina. Encontrado por pregunta directa del usuario ("¿hay que jalar todos los places?") antes de que llegara a producción.

### Qué falta de F9 para considerarla completa (lo que NO se hizo todavía)
- [ ] `GET /api/public/shipping-zones/check` (replica `is_point_in_shipping_zone`).
- [ ] `POST /api/public/visits`, `POST /api/public/reviews` (con Turnstile), `POST /api/public/contact` (con Turnstile + Resend) — estos sí necesitan el CORS restringido a `ALLOWED_ORIGINS` (no al `*` abierto que se usó para los GET) y rate limit por IP, ninguno de los dos implementado aún.
- [ ] Nada del lado de `menus` (Astro) — `src/lib/api.ts` (cliente tipado) todavía no existe; `src/lib/supabase.ts` sigue siendo lo único que consume el sitio. **El sitio Astro NO está apuntando a Go todavía** — este commit solo deja el backend listo para que Astro empiece a consumirlo.
- [ ] Filtro "solo lugares publicables" (doc 11 lo pide explícito: "no exponer campos sensibles como `clabe`") — hoy `GET /api/public/places*` devuelve `content` completo tal cual, que si trae `semantic_data.clabe` lo expone. Falta decidir el criterio antes de que Astro esté en producción contra esto.

### Hecho
- `migrations/0001_auth.sql`: tablas `users`, `sessions`, `auth_tokens` (doc 04), idempotente, aplicada contra Supabase real. `auth_tokens` está creada a nivel esquema aunque sus endpoints (magic-link/reset) quedaron fuera de esta fase (ver "Diferido" abajo).
- `cmd/migrate`: runner propio (sin librerías de migración), tabla `schema_migrations`, aplica `migrations/*.sql` en orden y una sola vez. Confirmada idempotencia (segunda corrida: "0 aplicadas, 1 ya al día").
- `cmd/importusers`: import de `auth.users` → `public.users` (doc 10), `ADMIN_EMAILS` parametrizado ($1, no templating de string). **44/44 usuarios importados**, las 3 verificaciones de doc 10 en verde (conteo, huérfanos, formato de hash). Confirmada idempotencia (segunda corrida: 0 filas nuevas).
- `internal/model/user.go`: `User`, `Session`, `AuthToken`, `AuthUser` (contexto de request), `SystemUser`, `MeUser`.
- `internal/auth`: `passwords.go` (bcrypt cost 10), `admin.go` (`IsAdmin` = role=='admin' || email∈ADMIN_EMAILS), `sessions.go` (tokens opacos sha256, sliding expiration <15 días, `CreateSession`/`ValidateSession`/`RevokeSession`), `users.go` (CRUD de `users`, UUID v4 generado en Go sin depender de extensiones Postgres), `turnstile.go` (verificación real contra Cloudflare, bypass si no hay `TURNSTILE_SECRET_KEY`), `middleware.go` (`WithAuth` opcional-siempre + `RequireUser` por handler con mensaje propio, cookie `bm_session`).
- `internal/api`: `HandleLogin`, `HandleRegister`, `HandleLogout`, `HandleMe`, `HandleUpdateProfile`, `HandleImpersonate`, wireados en `routes.go` y `cmd/server/main.go`.
- Tests: `go test ./...` en verde. Unitarios de bcrypt (roundtrip + vector generado con `htpasswd -B` independiente de Go, formato `$2y$10$` — confirma compatibilidad de formato). Integración de sesiones contra Postgres real (nativo local): creación/validación, token corrupto, token vacío, expiración (sesión insertada ya vencida), revoke (revoca al instante), impersonate (sesión autentica como el usuario objetivo, `impersonated_by` queda registrado). Se omiten limpiamente si `TEST_DATABASE_URL` no está seteada.

### Evidencia de aceptación (contra Supabase real, cuenta e805177@gmail.com)
```
POST /api/auth/login {email, password real}
→ 200 {"user":{"id":"89620b7b-...","email":"e805177@gmail.com","user_metadata":{...},"created_at":"2025-01-26...","last_sign_in_at":"..."}}
   Set-Cookie: bm_session=...; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000

GET /api/auth/me (con cookie)   → 200 {"isAdmin":false,"user":{...}}   (last_sign_in_at ya actualizado)
GET /api/auth/me (sin cookie)   → 200 {"isAdmin":false,"user":null}    (nunca 401, paridad con el original)

POST /api/auth/logout           → 200 {"success":true} + Set-Cookie Max-Age=0
GET /api/auth/me (MISMA cookie tras logout) → 200 {"user":null}   ✅ revoca al instante

POST /api/auth/register (cuenta descartable) → 201 {"user":{...}}
POST /api/auth/update-profile                → 200 {"success":true,"user":{...name/whatsapp actualizados...}}
POST /api/auth/register (mismo email de nuevo) → 409 {"error":"El correo ya está registrado"}
```
Cuenta de prueba del registro borrada de producción al terminar (`DELETE FROM users/sessions WHERE email=...`).

**"Cuenta creada ayer en el flujo viejo"**: no tengo password de ningún usuario real salvo el admin, así que no pude ejercitar un login real con una segunda cuenta. Verifiqué en su lugar que `ericklavastida@gmail.com` (creada 2026-07-11, ayer) importó con hash `$2a$10$`, 60 caracteres — formato bcrypt válido, mismo camino de import que el resto. Si quieres una prueba de login end-to-end con esa cuenta específica, dime y la corremos cuando tengas el password o me autorices a pedírselo al usuario.

### Diferido (por decisión tuya, no por falta de análisis)
`POST /api/auth/magic-link`, `GET /api/auth/magic`, `POST /api/auth/reset-password[/confirm]` — **no implementados en F1**. Encontré que el doc 04 apunta a `menus/src/pages/api/auth/magic-link.ts` como "plantilla portada", pero ese archivo real implementa algo distinto (un token permanente por lugar, sin Resend, sin login). No existe en ningún repo un flujo real de login-por-email ni de reset de password que copiar. Decidiste dejarlos pendientes hasta definir copy/diseño del email. El esquema (`auth_tokens`) ya existe, así que implementarlos después es aditivo, no requiere otra migración.

### Otras notas / decisiones menores
- **RLS se activa automáticamente en tablas nuevas de Supabase** (`relrowsecurity=true` en `users`/`sessions`/`auth_tokens` pese a que la migración no lo pidió). No bloquea nada: el rol de conexión (`postgres`, vía pooler) es el *owner* de las tablas y los owners bypasean RLS salvo `FORCE ROW LEVEL SECURITY` (confirmado en `false`). **Anotado para la Etapa C**: verificar el rol que use Go contra el Postgres del VPS tenga la misma propiedad/bypass, o desactivar RLS explícitamente ahí si hace falta.
- **`isAdmin` en `GET /api/auth/me` es literalmente `false` siempre**, hardcodeado — replica un comportamiento real del `route.ts` original (confirmado también por el propio doc 03). No es un bug mío; ya está anotado en doc 06 como mejora futura para F13.
- **`signup` viejo creaba un `place` automáticamente** si había `business_name` (visto en `admin-menus/app/auth/actions.ts`). Ese comportamiento no está en el contrato de `POST /api/auth/register` de los docs 03/04, así que no lo repliqué — es funcionalidad nueva (Go) que hoy no está conectada al frontend real (eso pasa en F8). **Pendiente de decidir en F8**: ¿se mueve esa lógica al wrapper de Next (`POST /api/places` después de registrar) o se agrega a `POST /api/auth/register` en Go?
- Mensajes de error sin contrato byte-exacto en los docs (validación de campos en login/register, captcha fallido, impersonate 403/404) se tomaron de precedentes reales del repo (`menus/src/pages/api/auth/login.ts`, `impersonate.ts`) cuando existían, o se redactaron en el mismo estilo cuando no. Están listados en el código con comentarios señalando cuáles son literales y cuáles no.
- `internal/auth/middleware.go` implementa "Required" como un helper por-handler (`RequireUser(w, r, mensaje)`) en vez de un middleware bloqueante único, porque el mensaje 401 varía byte a byte entre endpoints originales ("No autorizado" vs "Unauthorized"). El middleware global (`WithAuth`) siempre es "Optional": inyecta el usuario si hay sesión válida, nunca bloquea por sí solo.

### Qué falta para dar F1 por 100% cerrada
- [ ] (Opcional) login real con una segunda cuenta ("creada ayer") si el usuario quiere esa evidencia específica.
- [ ] Magic-link / reset-password: diferidos, retomar cuando haya copy/diseño de email.

### Siguiente fase: F2 · Esquema normalizado + compilador + backfill (doc 09)
No arranca todavía — esperando confirmación. F2 es la fase más delicada según el propio prompt del usuario ("vigila especialmente F2... Sonnet es mejor apuesta"): crea `place_blocks`, `catalog_*`, `place_details`, `order_items`; escribe `internal/content` con `Parse`/`Compile` y la invariante `Compile(Parse(x)) ≡ x` como test de CI; corre `cmd/backfill` sobre los 1064 places reales. Va a tocar todos los `places.content` de producción en modo lectura para el backfill (no escribe `places.content`, solo puebla las tablas nuevas — doc 09 es explícito: "El backfill NO toca places.content").

### Hecho
- Repo `admin-menus-go` creado en `/Users/emmanuel/Documents/GitHub/admin-menus-go`, `git init`, layout completo del doc 01 (`cmd/server`, `internal/{config,httpx,auth,store,model,api,ai,content}`, `migrations/`).
- `go.mod` (`github.com/emmanuel/admin-menus-go`), dependencia `github.com/jackc/pgx/v5` (pgxpool).
- `internal/config`: carga env, falla con error listando las variables faltantes si falta alguna requerida (`DATABASE_URL`, `GEMINI_API_KEY`, `RESEND_API_KEY`, `PUBLIC_BASE_URL`, `ALLOWED_ORIGINS`). `TURNSTILE_SECRET_KEY`, `PORT`, `ADMIN_EMAILS`, `ENV` opcionales con default, tal como doc 01.
- `internal/httpx`: `RespondJSON`, `RespondError` (`{"error":"..."}`), `Decode` con límite de body 10 MB (`http.MaxBytesReader`).
- `cmd/server/main.go`: wiring de config + `pgxpool` + `net/http` `ServeMux`, `GET /healthz` que hace `pool.Ping` real, logging con `slog` (JSON en producción, texto en dev), graceful shutdown en SIGTERM/SIGINT.
- `Dockerfile` multistage (build → `distroless/static-debian12`) y `docker-compose.yml` (servicio `db` con `postgis/postgis:16-3.4` sin puerto público + `admin-api` en `127.0.0.1:8080`), según doc 07.
- `menus/scripts/get-schema.js`: se quitó el fallback de la service-role key hardcodeada; ahora lee `PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` solo de env y aborta si faltan. Confirmado por grep: la key ya no aparece en ningún archivo del working tree.
- `go vet ./...` y `go test ./...` en verde (sin tests todavía; llegan en F1/F2).

### Evidencia de aceptación
```
$ curl -s -w "\nHTTP_STATUS:%{http_code}\n" http://localhost:8080/healthz
{"ok":true}
HTTP_STATUS:200
```
Contra el staging local (`docker compose up -d --build`, contenedor `db` con `postgis/postgis:16-3.4`, healthcheck `pg_isready` en verde). Log del servidor confirma el ping real:
```
level=INFO msg=escuchando port=8080 env=development
level=INFO msg=request method=GET path=/healthz duration=36.7ms   (200, tras pool.Ping OK)
```

**Pendiente de esta misma fase — bloqueado en mí, no en el plan:** el criterio de aceptación de F0 pide probar `/healthz` también contra la DB real de Supabase. No existe `DATABASE_URL` (connection string de Postgres) en ningún `.env` accesible — ni en `admin-menus/.env.local`, ni en `menus/.env`, ni en otros proyectos del GitHub folder revisados a pedido del usuario (`cortes-gps`, `bysmax-backend`: ambos con Postgres/Supabase propios, no relacionados). Solo hay `PUBLIC_SUPABASE_URL` (REST) y las API keys, que no sirven para una conexión directa a Postgres. **Se necesita que el usuario pegue el connection string del session pooler** (Project Settings → Database → Connection string → Session pooler, puerto 5432) para cerrar esta pata. No se sustituyó por SQLite (lo sugirió el usuario como alternativa a explorar) porque desvía el stack cerrado del doc 01 (`pgx/v5` + PostGIS, requerido desde F2 en adelante) — se le reportó la falta de credenciales en vez de tomar esa decisión unilateralmente.

**Segunda corrida de evidencia (misma sesión):** el usuario dio credenciales de un Postgres nativo local (Homebrew, PostgreSQL 14, `localhost:5432`, usuario `emmanuel`/`postgres`). Se creó la base `menus` (`CREATE DATABASE menus OWNER emmanuel`) y se corrió el binario **fuera de Docker** (`go run ./cmd/server`) apuntando a `postgres://emmanuel:postgres@localhost:5432/menus?sslmode=disable`:
```
$ curl -s -w "\nHTTP_STATUS:%{http_code}\n" http://localhost:8080/healthz
{"ok":true}
HTTP_STATUS:200
```
Confirmó el ping real por TCP a un Postgres de verdad fuera de la red interna de Docker, pero esto NO era Supabase (base local vacía).

**Tercera corrida — contra Supabase real, cierra el pendiente:** el usuario navegó el dashboard de Supabase (Connect → tab de Connection String → Session pooler) y reseteó el database password. Connection string usado (session pooler, puerto 5432, el correcto según doc 01 — se descartó el transaction pooler `:6543` que trae el mismo modal, porque rompe prepared statements de `pgx`):
```
postgresql://postgres.ncennxosjocsngjyevpx:***@aws-0-us-west-1.pooler.supabase.com:5432/postgres
```
Verificado primero con `psql` directo (`select current_database(), current_user, version()` → PostgreSQL 15.8, Supabase), luego con el binario Go (`go run ./cmd/server`, puerto 8081 para no chocar con el staging local):
```
$ curl -s -w "\nHTTP_STATUS:%{http_code}\n" http://localhost:8081/healthz
{"ok":true}
HTTP_STATUS:200
```
Log confirma el ping real (490ms, latencia esperada hacia `aws-0-us-west-1`). Proceso de prueba detenido al terminar. **`DATABASE_URL` de Supabase real quedó guardado en `admin-menus-go/.env`** (gitignored, no committeado) para que F1 en adelante desarrolle contra la base real, tal como especifica doc 01 para las Etapas A/B.

⚠️ **Nota operativa importante para F1 en adelante:** desde ahora, cualquier migración SQL o backfill que se corra con este `.env` **toca la base de producción compartida con el admin viejo (Next.js) y el sitio Astro en vivo**. Es el diseño intencional del plan (doc 10: "el código viejo y el nuevo deben ver la misma base viva"), y las migraciones son aditivas (`CREATE TABLE IF NOT EXISTS`, nunca `DROP`), pero vale la pena que el usuario lo tenga presente antes de confirmar el arranque de F1.

### 🔐 Hallazgo de seguridad — acción del usuario pendiente
La service-role key de Supabase que estaba hardcodeada en `menus/scripts/get-schema.js` **sigue viva en el historial de git** (commits `e8f0ed5`, `95da06c` del repo `menus`), no solo en el working tree (ya limpiado esta sesión). Falta que el usuario:
1. Rote la key en el dashboard de Supabase (Project Settings → API).
2. Actualice `SUPABASE_SERVICE_ROLE_KEY` en Vercel y en los `.env` locales de `admin-menus` y `menus`.
Hasta que eso pase, la key vieja sigue siendo válida para cualquiera con acceso al historial del repo.

### Decisiones menores tomadas
- `go.mod`: directiva `go 1.25.0` (no 1.24) porque `go mod tidy` con la última `pgx/v5` (`v5.10.0`) exige `go >= 1.25`. Doc 01 pide "Go 1.24+" (piso, no versión exacta) — 1.25 lo cumple.
- `Dockerfile`: `FROM golang:1.25-alpine` (doc 07 lo escribe como `golang:1.24-alpine`) por la misma razón — coherencia con el go.mod real. Runtime final sigue siendo `distroless/static-debian12` sin cambios.
- `.env` de staging local: usa placeholders no-secretos (`dev-placeholder-not-real`) para `GEMINI_API_KEY`/`RESEND_API_KEY`, que F0 no usa todavía pero `internal/config` exige como requeridas. `DB_PASSWORD` es un valor local inventado para el contenedor Postgres de desarrollo, no un secreto real. `.env` está en `.gitignore`; `.env.example` documenta las claves sin valores.

### Qué falta para dar F0 por 100% cerrada
- [x] `DATABASE_URL` real de Supabase probado — `curl /healthz` en verde contra ella (ver arriba).
- [ ] Usuario rota la **service-role key** en Supabase (hallazgo de seguridad — sigue pendiente, es un secreto distinto del database password que ya se reseteó).

### Siguiente fase: F1 · Auth propia (doc 04)
No arranca todavía — a la espera de confirmación del usuario. Con `DATABASE_URL` real ya en `.env`, F1 puede correr completo: migración SQL de `users/sessions/auth_tokens`, import de los 44 usuarios reales (doc 10) y prueba de login real. Falta todavía `RESEND_API_KEY` real (hoy es un placeholder de dev) para los emails transaccionales de magic-link/reset — se puede pedir al arrancar F1 si hace falta antes, o dejar ese endpoint específico para el final de la fase.

### Estado de contenedores locales
`docker compose up -d` corriendo en `/Users/emmanuel/Documents/GitHub/admin-menus-go` (servicios `db` y `admin-api`). Se puede bajar con `docker compose down` sin perder nada (el volumen `dbdata` persiste; no hay backfill todavía que perder).
