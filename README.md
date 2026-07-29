# menus.bysmax.com

Sitio público: directorio de menús de restaurantes, moteles y servicios en
México. Astro 5 + Tailwind 3, desplegado en Vercel.

Última actualización de este documento: **2026-07-29**.

---

## Los tres repos

```
menus (este)  ──┐
                ├──►  admin-menus-go  ──►  Postgres (en el VPS)
admin-menus   ──┘
```

| Repo | Qué es | Stack |
|---|---|---|
| `menus` | el sitio público | Astro 5, Tailwind 3 |
| `admin-menus` | el panel del dueño de negocio | Next 16, Tailwind 4 |
| `admin-menus-go` | el backend, dueño de los datos | Go, Postgres + PostGIS |

**La meta de arquitectura:** todo pasa por Go. Cero rutas `/api` que hablen con
la base, cero server actions que escriban, cero ISR. El navegador (o Next como
proxy delgado) le habla a Go, y Go es el único que toca Postgres.

Hay un cuarto servicio, `admin.bysmax.com` (formulario de contacto y otras
cosas de BySMax). **No es parte de esto y no se toca.**

---

## Lo que cambió el 2026-07-29 (leer antes de tocar datos)

Ese día se migró la base de **Supabase al Postgres propio del VPS**. Go dejó de
leer Supabase.

### ⚠️ El error que más caro sale

Supabase **sigue en pie y sigue aceptando escrituras**. La service-role key
sigue siendo válida. Si escribes ahí:

- el `PATCH` devuelve `204`
- no hay error, no hay log, no hay nada que revisar
- **y el dato no existe para el sitio**, porque Go lee otra base

Ya pasó en un solo día (el menú de Little Caesars se perdió así). La única
forma de detectarlo es comparar `updated_at` en Go, no en Supabase.

**Regla: para escribir en una ficha, siempre por Go.** Está resuelto en
`scripts/lib/places-go.js` — úsalo, no escribas el `fetch` a mano.

```js
import { leerPlace, escribirContent } from "./lib/places-go.js";

const place = await leerPlace("pollo-pepe");        // endpoint público, sin auth
await escribirContent(place.id, nuevoContent);      // PUT /api/places/{id}
```

Escribir por Go además repuebla `catalog_*`, deja punto de retorno en el
historial y purga el cache del borde. El `PATCH` directo no hacía nada de eso.

### Sesión para escribir

Go sólo acepta sesión de usuario (cookie `bm_session`); no hay token de
servicio todavía. Se saca de DevTools → Application → Cookies en
`admin-menus.bysmax.com` ya logueado:

```sh
BM_SESSION='...' node scripts/scrape-delitech.js https://ordena.pollopepe.com pollo-pepe --escribir
```

**Pendiente:** un token de servicio en Go, para que los scrapers corran en cron
sin depender del navegador de nadie.

---

## Cache: TTL de un año + purge por tag

Las páginas públicas se sirven con `s-maxage=31536000`. La frescura depende por
completo del purge por tag. Normalmente lo dispara Go al escribir — **pero si
al servicio le faltan `REVALIDATE_URL` / `REVALIDATE_SECRET`, su cliente de
purge es `nil` y no hace nada NI avisa.**

Hoy le faltan. Mientras tanto, a mano:

```sh
node scripts/purge-cache.js pollo-pepe        # una ficha + listados
node scripts/purge-cache.js --all             # todos los places
```

Si una página no cambia después de purgar, mira `x-vercel-cache`: `STALE`
significa que el purge entró y Vercel está regenerando — espera y vuelve a
pedir. `HIT` con contenido viejo sí es problema.

---

## Scrapers de menús

Las fichas de cadenas venían raspadas de `mxmenu.net`, con datos de 2023 y sin
fotos. Los scrapers nuevos las llenan desde el sitio de pedidos del propio
restaurante.

| Script | Cubre |
|---|---|
| `scripts/scrape-delitech.js` | Pollo Pepe y demás cadenas sobre Delitech |
| `scripts/scrape-littlecaesars.js` | Little Caesars México |

Los dos corren en seco por defecto; sólo escriben con `--escribir`, y dejan
respaldo en `/tmp` antes.

**Detalles que costaron encontrarse, por si dejan de funcionar:**

- **Delitech**: el menú llega por GraphQL, no en el HTML. `restaurantId` y
  `apiUri` salen de `__NEXT_DATA__`; el token anónimo, de `/api/generateToken`
  del propio sitio.
- **Little Caesars**: la URL del API **no está en el bundle** (ahí sólo hay
  hosts de test) — sale de GrowthBook en tiempo de ejecución. Y sin
  `accept-language: es-MX` el endpoint responde `404 DATA_NOT_FOUND` aunque la
  ruta y los ids sean correctos: el menú está indexado por idioma, no por país.
- **Precios por sucursal**: varían. Super Cheese Pepperoni cuesta $159 en
  Guadalupe N.L. y $179 en Pachuca. Por eso la ficha dice de qué sucursal son,
  en vez de presentarlos como nacionales.

### Domino's: bloqueado

`order.golo04.dominos.com` (Power API). El `store-locator` devuelve
`Status:-1 InternalError` con cualquier formato de dirección (calle+ciudad, CP,
lat/lng), los ids de tienda dan 404, y el proxy del propio sitio da 502.
**Falta un número de tienda real** — se saca eligiendo sucursal en
`dominos.com.mx`. Con eso,
`/power/store/{id}/menu?lang=es&structured=true` debería abrir.

Ojo: la URL del menú "nacional" no trae precios (el bundle dice
`menu.pricing_available_when_ordering`). Aparecen al elegir tienda.

---

## El problema real del contenido, medido

```
239 fichas con firma de mxmenu.net
13,135 platillos
     204 con foto  →  1.6%
223 fichas sin UNA sola foto
```

Las más grandes son las que cargan el tráfico: `circle-k` (432 platillos),
`mcdonalds-mexico` (320), `sanborns-mexico` (275), `sushi-roll-mexico` (241),
`subway` (189), `starbucks-mexico` (168), `toks-mexico` (166) — todas en cero.

En moteles es lo mismo: **18 de 527 con foto**.

Umami, últimos 30 días, páginas de Little Caesars: 313 visitantes, 99% de
Google, 99% México, **89% de rebote, 20s de estancia**. Llegan buscando el menú
y no encuentran nada que reconocer.

**Ésa es la prioridad de contenido, no escribir más fichas.**

---

## Cosas que ya se arreglaron (no reintroducir)

- **`Motel Motel Faschas`** en el `<title>`. 353 de 527 lugares ya traen
  "motel" en el nombre y `MotelLayout.astro` se lo anteponía igual. La
  condición es *contiene la palabra*, no *empieza con*: 33 lo traen a media
  frase ("Kyoto Suites Motel", "Hotel y Motel Santa Rosa").
- **El título prometía "Fotos"** en las 527 fichas de motel cuando sólo 18
  tienen una. Sin fotos ahora ofrece "Ubicación".
- **`4.5 (0 opiniones)`** en 512 de 527 moteles. Una estrella sin una sola
  reseña no informa y contradice lo que Google ya sabe (Faschas tiene 4.2 con
  143). Ahora no se pinta nada hasta que haya opiniones reales.
- **FAQ inventado** en fichas de mxmenu, afirmando precios que nadie cobra.

---

## Pendientes, por riesgo

### Alto — pierde datos hoy

- **11 rutas de operación en `admin-menus` siguen escribiendo en Supabase**:
  `orders`, `customers`, `contacts`, `contact_notes`, `shipping_zones`,
  `reviews`, `place_menu_visits`. Pedidos y clientes se pierden en silencio.
  **No se pueden mover solas**: el carrito público de este repo
  (`src/components/CartManager.tsx` → `src/pages/api/orders`) también escribe
  ahí. Hay que mover los dos lados a la vez, o el restaurante se queda ciego a
  los pedidos nuevos.
- **`ENV=production`, `REVALIDATE_URL`, `REVALIDATE_SECRET`** faltan en el
  `.env` del VPS. La raíz de Go todavía responde `{"env":"development"}`.
- **Rotar secretos**: `WEBHOOK_SECRET`, `TURNSTILE_SECRET_KEY`, la API key de
  Evolution, y la contraseña del Postgres del VPS. Hay una service-role key de
  Supabase viva en el historial de git (`e8f0ed5`, `95da06c`).

### Medio

- **123 renglones de `place_content_history`** siguen sólo en Supabase. Es el
  "deshacer" de las fichas que ya existían.
- **Token de servicio en Go**, para poner los scrapers en cron.
- **Google Places** para fotos y calificaciones reales de los 527 moteles.
  Verificado que funciona: Motel Faschas devuelve 10 fotos y 4.2 (143 reseñas),
  que es exactamente lo que enseña Google. Falta una llave sin restricción de
  referrer. Revisar costo por request y reglas de caché de Places antes de
  correrlo masivo.
- **Fichas duplicadas** que compiten entre sí por la misma búsqueda:
  `sanborns`/`sanborns-mexico`, `sushi-roll`/`sushi-roll-mexico`,
  `toks`/`toks-mexico`, `dominos-pizza-mexico`/`domino-s-pizza`,
  `la-madalena`/`la-magdalena-san-pedro-garza-garcia`.
- **`la-madalena` (place 1520)** publica 43 precios en dólares terminados en
  `.99`, copiados fiel de mxmenu, que se los inventó. La ficha buena es la
  **156** (97 platillos, 96 con foto). Falta decidir si la 1520 se borra o se
  vacía.
- **La 156 tiene 84 de 97 platillos sin precio.** Su dirección y teléfono ya se
  corrigieron (eran de CDMX en un restaurante de San Pedro Garza García).

### Decisiones de negocio abiertas

- El precio real del plan Pro (`/precios` muestra "Cotización" dos veces).
- Autoservicio a $300 contra "nosotros te lo montamos" con cuota de instalación.
- Si se cambia la URL `/menu-digital-gratis`.

---

## Comandos

```sh
npm run dev            # localhost:4321
npm run build
npx astro check        # 0 errores es el estado esperado

node scripts/purge-cache.js <slug>
node scripts/scrape-delitech.js <url-tienda> <slug> [--escribir]
node scripts/scrape-littlecaesars.js <locationNumber> <slug> [--escribir]
```

Variables en `.env`. Para escribir fichas hace falta `BM_SESSION` (ver arriba).

---

## Dónde está qué

```
src/layouts/MotelLayout.astro          SEO de moteles (títulos, JSON-LD)
src/components/MotelPageRenderer.tsx   la ficha de motel
src/components/templates/
  MenuPageRenderer.astro               la ficha de restaurante
src/content/config.ts                  esquema del blog; `audiencia` separa
                                       contenido de venta de las guías
scripts/lib/places-go.js               leer/escribir fichas por Go
scripts/purge-cache.js                 purge manual del borde
```
