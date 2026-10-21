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

## Registro 2026-09-14 — Analíticas de un lugar migradas a Go

El error "No se pudieron cargar las analíticas" en `admin-menus` venía de leer
visitas y reseñas de la copia vieja de Supabase, cuyo proyecto ya no resuelve.
Se migró esa lectura a Go:

- `menus-backend`: nuevo `GET /api/admin/place/{id}/insights` (dueño o admin),
  con paridad de rangos y cortes UTC respecto al handler anterior de Next.
  Corrige además el 500 de `GET /api/public/reviews`, que seleccionaba una
  columna `restaurant` inexistente en el esquema de Go (ahora emite `NULL`).
- `admin-menus`: `app/api/admin/place/[id]/insights/route.ts` pasó a ser proxy
  de `goFetch`; ya no consulta Supabase.

Validación local: `go build ./...` y `go vet` pasan; `npm run build` pasa.
`npm run lint` conserva errores heredados, sin nuevos.

Pendiente: ingesta de visitas y reseñas en la BD de Go. Hasta entonces el
endpoint responde `200` con ceros. Orden de despliegue: Go primero, luego
`admin-menus`.

## Registro 2026-09-14 — Ingesta de visitas del menú público

El panel mostraba visitas en cero pese a que `/menus/<slug>` renderiza bien. La
causa no era el visor de analíticas (ya leía de Go), sino que **nada escribía
`place_menu_visits`**: el commit `fca1de6` ("eliminar admin y features basadas
en Supabase") borró `src/pages/api/analytics/visit.ts` y el `<script>` de
`RestaurantLayout.astro`, y el reemplazo previsto en
`migration/11-api-publica-astro.md` (`POST /api/public/visits`) nunca se
implementó. El propio `insights.go` lo anunciaba: respondía `200` con ceros.

- `menus-backend`: nuevo `POST /api/public/visits` en `internal/api/visits.go`.
  Sin auth, inserta `place_id`, `visitor_id`, `path`, `user_agent` y `referer`
  (con fallback a los headers) y responde `204`. Un `place_id` inexistente
  (FK `23503`) devuelve `404`, no `500`.
- `menus`: el beacon de `RestaurantLayout.astro` (con el `menu_visitor_id` de
  `localStorage`) llama **directo** a
  `https://adminm.bysmax.com/api/public/visits` desde el navegador: cero hop por
  el Worker, sin ruta `/api/analytics/visit`. `referer`/`userAgent` van en el
  cuerpo porque el navegador no deja fijarlos como headers.
- `menus-backend`: `withPublicCORS` ahora contesta el preflight `OPTIONS` de
  `/api/public/*` y restringe las escrituras a `ALLOWED_ORIGINS` (refleja el
  origen permitido + `Vary: Origin`); las lecturas siguen abiertas con `*`.

Validación local: `go build ./...` y `go vet ./...` pasan; en `menus`,
`astro check` con 0 errores / 0 warnings y `npm run build` completo. El chunk
del layout y el manifest del Worker incluyen el script y la ruta.

Orden de despliegue: Go primero (`adminm.bysmax.com`), luego `menus`
(Cloudflare). `admin-menus` no cambia: su proxy a Go ya estaba.

Pendiente: rate limit / retención de `place_menu_visits`, y la ingesta de
reseñas (sigue sin ruta pública en Go; hoy `reviews` también se lee pero no se
escribe).

## Registro 2026-09-14 — Visitas en el hub `/menus`

Con la ingesta viva, el hub muestra las visitas además de usarlas para ordenar:

- `menus-backend`: `GET /api/public/places` emite `visitCount` (visitantes
  únicos de los últimos 30 días). El `LEFT JOIN` de `place_menu_visits` pasó de
  agregarse solo con `sort=visits` a ir siempre, porque el badge lo necesita en
  cualquier orden; sigue siendo una sola agregación por request sobre el índice
  `(place_id, visited_at DESC)`.
- `menus`: la tarjeta de `/menus` pinta un badge "N visitas" cuando
  `visitCount > 0` (singular/plural), junto a rating y reseñas. Además los
  selectores de tipo y orden ahora hacen `onchange="this.form.submit()"`: el
  filtro se aplica al elegir, sin depender del botón "Aplicar" (que se creía
  roto porque no parecía hacer nada al cambiar de opción).

Validación local: `go build`/`go vet`/`go test` pasan; `astro check` 0 errores
y `npm run build` completo. La query del listado se probó contra la base de
producción.

Orden de despliegue: Go primero, luego `menus`. Pendiente de push y deploy.

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

## Registro 2026-09-14 — Recuperación del checkout público

La eliminación del checkout completo en el remoto fue una solución puntual al
error del Worker, no una decisión de producto. Se recuperó el flujo público
sobre la versión remota actual, conservando los colores configurados por tema:

- `menus` vuelve a montar el carrito para negocios que permiten carrito o
  entrega. Incluye datos de cliente, recogida o envío, selección de zona y
  dirección, efectivo/tarjeta/transferencia, CLABE, notas, creación de pedido,
  enlace de seguimiento y mensaje de WhatsApp.
- Las rutas públicas de `menus` son proxies de sesión hacia Go para pedidos,
  estado de pedido, sesión y zonas de envío; no reintroducen Supabase.
- `menus-backend` expone `GET /api/public/shipping-zones?place_id=...` y al
  crear un pedido valida la zona activa y calcula el envío con el precio
  configurado en PostgreSQL. También crea o actualiza el cliente por teléfono
  dentro de la misma transacción del pedido.

Validación local: `go test ./...` pasó. Las pruebas de integración de pedidos
requieren `TEST_DATABASE_URL`, por lo que se omiten cuando esa base no está
configurada. `npx astro check` pasó con 0 errores y 0 advertencias (quedan los
hints informativos ya existentes). Falta registrar el resultado de
`npm run build` pasó. El build conserva avisos heredados de fuentes que se
resuelven en tiempo de ejecución y de anotaciones de dependencias; no son
errores del checkout.

Pendiente de despliegue, en este orden:

1. Desplegar primero `menus-backend` con la migración operacional ya aplicada.
2. Desplegar `menus` y confirmar `PUBLIC_GO_API_URL` y
   `PUBLIC_GOOGLE_MAPS_API_KEY` en el Worker.
3. Probar en producción un pedido de recogida y uno de entrega: zona, precio
   del envío, cliente, WhatsApp y la página `/pedidos/<tracking_id>`.

Los commits de esta recuperación ya están publicados en GitHub (`menus`
`0f23836`; `menus-backend` `a0c5768`). Go fue desplegado en
`adminm.bysmax.com`: `/healthz` responde `{"ok":true}` y el endpoint de zonas
responde `200`. Falta publicar el Worker de Cloudflare de `menus`; este entorno
requiere autenticación de Wrangler o un `CLOUDFLARE_API_TOKEN` con permisos de
Worker para ejecutar ese paso.

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


## Registro 2026-10-15 — Variantes de precio y distribución del editor

- Admin: ajustes de sección colapsados, cabecera móvil con espacio para el nombre y panel de variantes con presentación opcional y precio final. Convierte precios finales en base + recargos compatibles con Go; sin endpoints nuevos ni cambios en Go.
- Público: el carrito respeta el precio de cada combinación y evita interpretar variantes de precio como paquetes de piezas. Cambiar presentación de un paquete reinicia sus sabores para evitar mezclas.
- Validación: builds de Next/Astro, astro check sin errores, autocheck de precios y prueba Playwright del carrito ($22 y combinaciones $13/$24). Capturas reales del editor en claro, oscuro y móvil; guardado interceptado, sin modificar el menú real. Lint general del admin conserva deuda previa (161 errores); archivos tocados sin errores.
- Publicación: menus `ef25edc` y admin-menus `11bd75d` enviados por push (público primero). Go no requiere deploy. Tras ~6 minutos, capturas reales de producción en claro/oscuro/móvil siguen mostrando la versión anterior; verificación visual del nuevo deploy PENDIENTE. No se intervino en Cloudflare ni se ejecutó deploy manual.


## 2026-10-20 — Usuarios del restaurante, mozos y fotos

- Go `3d2e7d6`: cuentas dedicadas rol `waiter`, asignación a un restaurante, alta/listado/retiro por dueño; `/api/waiter` expone menú/mesas y últimos 50 pedidos propios abiertos. Denegación por defecto al resto del API, precios calculados desde menú y pedidos siempre pendientes, sin confirmar pagos. Se corrigió también el filtro de dueño en listado de pedidos con place_id.
- Go publicado y desplegado manualmente en VPS; migración 0010 aplicada; healthz público OK. Imagen previa conservada como `adminm-waiter-rollback:20261020`.
- Admin `dda8054` publicado para despliegue automático: sección Usuarios dentro del restaurante, primer permiso Modo mesero; se conserva Comanda dentro de admin. Mesero inicia sesión habitual y entra a /mozos. Comanda móvil con búsqueda/categorías separadas, errores conservan carrito. Fotos sin preferencia explícita usan Rellenar, respetando Completa guardada.
- Sitio público: mismo default Rellenar en renderer y componente; build Astro correcto. Menú 2343 ya guardaba cover al inspeccionarlo; no se sobrescribió su contenido.
- Validación: build Next y Astro; go test ./...; integración con PostgreSQL aislado para permisos, precios, revocación y atribución. Playwright: alta de usuario, bloqueos, envío real en DB aislada en escritorio/teléfono, falla simulada y reintento, capturas claro/oscuro. ESLint global sigue bloqueado por deuda previa (159 errores); archivos nuevos sin errores.
- Caja auditada, NO reescrita: arqueo legado guarda sesiones en content y suma por created_at, sin libro de pagos. No se considera validada la contabilidad ni se habilita cobrar al mesero. Pendiente sustituir ese modelo antes de confiar en cierres contables.
- Admin desplegado en Cloudflare y verificado en producción: Usuarios, Comanda, editor 2343 y portal del mesero; bloqueo 403 de pedidos generales/place/insights. Capturas escritorio/teléfono claro/oscuro; cuenta y sesiones temporales eliminadas. Sitio público enviado a su despliegue automático tras build correcto.
- A pedido del usuario: AGENTS.md del panel (`9d3ae01`), Go (`0f79997`) y /root exigen próximos despliegues blue-green y borrar contenedores descartados tras ventana de rollback. Este despliegue de Go usó recreación Compose antes de esa instrucción, no fue blue-green. No quedaron contenedores antiguos del proyecto; imagen previa retenida para reversión.


## 2026-10-20 — Tamaños e ingredientes en el carrito público

- Causa: el carrito interpretaba el último grupo como cantidades aunque Go ya guardara Tamaño con max_choices=1.
- Público: elección única o múltiple según max_choices, grupos obligatorios según required, recargos por unidad y cantidad de platos separada. Se mantiene el surtido de paquetes; Tamaño y Cantidad / presentación no se interpretan como piezas.
- Panel: nuevo acceso Ingredientes, creación de ingredientes/extras opcionales múltiples, selector explícito Una opción / Varias opciones y límite configurable. Reutiliza required/max_choices/prices; sin migraciones ni cambios de API o secretos.
- Validación: builds Astro y Next; astro check sin errores; autochecks de ambos repositorios; ESLint de archivos del panel sin errores (3 warnings previos). Playwright sobre el menú 2343: tamaño único S/17, dos platos S/34, ingredientes con recargo S/21.50, máximo de elecciones y paquete de dos sabores. Guardado del panel interceptado y contenido resultante probado en carrito; no se modificó el menú real.
- Publicación: menus a9921bf y admin-menus b555208 enviados por push; ambos despliegues automáticos verificados en producción. Capturas antes/después en /tmp/chifa-*.png, incluido panel claro/oscuro en escritorio y teléfono. Sesión temporal de revisión eliminada.
- Alcance: editor y carrito del sitio público. Modo mesero y su cálculo de precios en Go conservan el configurador anterior; su unificación queda pendiente.

## 2026-10-20 — Regla de revisión integral de funciones

- Se añadió a los AGENTS.md de menus, admin-menus y menus-backend la revisión conjunta de editor, carrito, modo mesero, comanda, pedidos y Go, para evitar entregar cambios parciales de una función compartida.
- Validación: revisión del texto y diff sin errores de formato. Sólo documentación; no requiere cambios de runtime ni despliegue de Go. La unificación pendiente del selector de mesero sigue sin implementarse en este trabajo.

## 2026-10-20 — Selector de opciones en comanda y mesero

- Se corrigió el configurador de WaiterMode compartido por comanda, portal mesero y alta desde pedidos: botón Elegir opciones en productos configurables, tamaño único, ingredientes múltiples, obligatoriedad/límites, recargos por unidad y cantidad independiente. Los paquetes mantienen su selector anterior; no se alteraron productos reales.
- Pedidos muestra las opciones elegidas. Go admite pricing.selections por grupo, valida contra el menú y genera precio y selectedOptions canónicos tanto en /api/waiter como /api/orders. Conserva el contrato previo de paquetes y líneas antiguas, incluido envío; no migra datos ni añade secretos.
- Validación: autocheck de tamaños/extras/paquetes, build Next, capturas reales teléfono/tablet claro/oscuro, envío interceptado conserva Mediano y total 34 y errores conservan el carrito. Fixture de ingredientes: 21.50. Vista pedidos muestra tamaño. Go test ./... correcto; TestWaiterIsolation ejecutado con Postgres real en base aislada sin datos de producción, comprobando creación por ambos endpoints, total 37, order_items y listado; base de prueba eliminada. ESLint de archivos nuevos sin errores; archivos antiguos conservan errores y avisos previos.
- Go: código ad63277 y pruebas 182ada4 enviados; desplegado blue-green como menus-api-selector-ad63277, puerto 8092, imagen menus-api:ad63277. Nginx apunta a 8092 (incluido SSE); salud, lectura y rechazo de selección inválida verificados. Rollback disponible en adminmbysmaxcom-admin-api-1, puerto 8091, conservado durante la ventana de verificación; no ejecutar compose recreando el activo. Sin cambios de esquema.
- Panel: publicación automática y capturas de producción pendientes al escribir esta entrada. Capturas locales /tmp/mesero-selector-*.png y /tmp/mesero-orders-*.png. La navegación ampliada Mesas/Menú/Comanda/Pedidos y su optimización general continúan pendientes; se conservaron los cambios locales previos de navegación sin incluirlos en este commit.


## 2026-10-20 — Navegación del mesero y total junto al recargo

- Comanda y portal restringido comparten navegación inferior Mesas / Menú / Comanda / Pedidos. Cambiar de sección conserva mesa, productos y opciones; enviar correctamente limpia el borrador y muestra pedidos dentro del modo mesero. Los permisos y endpoints de Go se conservan.
- Mesas usa únicamente las mesas configuradas (sin inventar disponibilidad); Pedidos muestra los últimos 50 y se refresca cada 30 segundos sólo estando visible. Portal reutiliza su carga inicial, fotos usan miniaturas y carga diferida. Tarjetas se adaptan al ancho disponible en teléfono/tablet.
- Carrito público y comanda muestran recargo y precio configurado por unidad entre paréntesis: +S/5 (S/17 total c/u). Considera los demás extras elegidos; no cambia el cálculo ni el contrato de Go.
- Validado: build Next y Astro, astro check (0 errores/0 warnings), lint de componentes nuevos/opciones, asserts de precios; Playwright con menú real y envíos interceptados comprobó mesa/opciones/total conservados, fallo sin perder borrador, éxito sin salir del modo mesero, y portal restringido con una sola carga inicial. Capturas revisadas en claro/oscuro, teléfono 390 y tablets 768/1024; sin desbordamiento horizontal. Pruebas Go con persistencia en DB aislada constan en la entrada anterior. No se crearon pedidos reales.
- Selector previo confirmado en producción en teléfono/tablet claro/oscuro. Esta ampliación se publica por push; verificación del despliegue automático pendiente al escribir esta entrada. No se ejecuta wrangler manual. Falta prueba en dispositivos físicos.

- Verificación posterior al push: `admin-menus` 0d18d03 y `menus` e9ebb79 confirmados en producción. Playwright verificó selector y total c/u, navegación de las cuatro secciones con borrador conservado, y portal restringido; capturas de teléfono/tablet en claro y oscuro revisadas. Carrito público confirmó 2 × S/17 = S/34. Sesiones temporales y usuario QA eliminados al finalizar; no se enviaron pedidos reales ni se cambió el menú del restaurante. Go activo sigue `menus-api-selector-ad63277` en 8092, con rollback retenido en 8091 durante la ventana de verificación.

### Encabezado informativo del restaurante (2026-10-20)

- Revisión de referencias: Google Business Profile (datos del negocio y acciones), DoorDash (logo separado de portada) y Uber Eats (información por sucursal). Se aplicó un encabezado compacto compartido en `MenuPageRenderer`, con imagen sin recortes, nombre, cocina, descripción, ubicación, contacto y estado de carta informativa/pedidos según configuración existente.
- Se reutiliza `content.semantic_data` que ya edita `admin-menus/ContentEditor` y sirve Go; no cambian endpoints, persistencia, precios, carrito, comanda, mesero ni pedidos. Campos ausentes se ocultan; la acción “Ver en Maps” abre una búsqueda con los datos disponibles, sin afirmar que la dirección importada corresponde a una sucursal exacta. El horario libre se muestra sin deducir abierto/cerrado ni usar el fallback `24 horas` del cliente público.
- La navegación comercial superior se sustituye por atribución compacta sólo en el renderer compartido. Se conservan carruseles configurados y galerías (estas últimas dentro de más información). El encabezado precede también las cartas en imágenes.
- Validación local: capturas de Novacafé, Chifa y Starbucks a 390, 768 y 1440 px; enlace a carta y ausencia de desbordamiento horizontal. Selector de producto comprobado tras hidratar las islas React (sin enviar pedidos). Astro check y build registrados en /tmp/restaurant-header-final-{check,build}.log. No se editaron datos reales ni enviaron pedidos.
- Publicación: push a `master` para activar el despliegue automático de Cloudflare; no se ejecuta Wrangler manual. Pendiente confirmar despliegue y verificar producción y completar datos de negocios que aún no tienen dirección, descripción u horarios (Chifa). No se incorporó cálculo de abierto/cerrado: requiere horarios estructurados y zona horaria.


## Registro 2026-10-20 — Estados y acceso al menú desde usuarios

- Go `6fa9164`: `GET /api/admin/users` agrega `place_links[{id,name}]` sin cambiar `places`. Solo admin; IDs reales, sin búsquedas por nombre.
- Panel `93b9558`: etiquetas Activo (verde), Reciente (ámbar), Inactivo (rojo), Sin datos (neutro), en tabla y tarjetas. Chips «Ver menú» abren `/place/{id}/menu`; tres visibles y resto desplegable.
- Código y push completados en ambos repositorios; Go publicado primero por blue-green: candidato en 8093, salud y listado autenticado comprobados, proxy 8092 → 8093 verificado en producción. Activa `6fa9164` (`menus-api-users-6fa9164`); rollback `ad63277` (`menus-api-selector-ad63277`, 8092), conservado durante verificación.
- Validación: build Next, ESLint del componente, go vet y go test ./... correctos. Lint global mantiene 157 errores / 93 advertencias anteriores. Comprobación de 583 IDs/nombres y rechazo 401 sin sesión. Playwright local: enlaces reales, búsqueda, filtros, orden, móvil, errores/reintento, sin overflow. Cuatro estados comprobados con datos simulados solo en navegador. Sin cambios de precios/pedidos ni consumidores públicos.
- Cloudflare: panel final `4fd2277` desplegado y comprobado con capturas reales en teléfono/computadora, claro/oscuro. A petición del usuario, chips de 32 px con nombre/icono y etiquetas de estado compactas; navegación a editor, filtros, búsqueda, orden y ausencia de overflow comprobados en producción. Sesiones temporales borradas. Rollback de Go conservado, sin contenedores descartados creados por este trabajo.
