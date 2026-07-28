# 12 · Editor en Go, sucursales e imágenes propias

Plan escrito el 2026-07-27. Varios frentes independientes; cada uno se puede
parar sin dejar nada roto. Todo lo que sigue está verificado contra el código y
la base real, no supuesto.

---

# 👉 POR AQUÍ VAMOS

**Frente activo: imágenes y contenido de las páginas ancla.** Detalle completo en
la sección **G**; el análisis de por qué los anclas son la prioridad está en **F**.

### Contexto en una línea
Las páginas ancla (Starbucks, KFC, McDonald's, Tim Hortons, Dairy Queen…)
rankean bien pero convierten pésimo, y sus menús no tienen ni una sola foto de
producto. Los dos anclas con mejor CTR —Campomar 6.8% y La Magdalena 4.4%— son
justamente los que no están duplicados.

### Lo que ya se hizo (2026-07-27)
- ✅ **F-4** · 20 `name` de places limpiados de basura de scraping. El peor era
  un ancla: `Kfc  Actualizado 2024` → `KFC` (0.4% de CTR sobre 29,486
  impresiones). Purgado y verificado en vivo en los dos dominios.

### Las tres opciones sobre la mesa (falta elegir)

| | Qué | Esfuerzo | Por qué |
|---|---|---|---|
| **G-1** ⭐ | **Una imagen por sección**, no por producto | 13 fotos para Starbucks en vez de 168 | No depende de emparejar nombres, sirve para todas las cadenas, y visualmente cambia la página por completo. Es el mejor cambio por hora invertida. |
| **G-2** | **Limpiar los títulos de sección** | ~1 hora | Hoy los encabezados visibles dicen `STARBUCKS MÉXICO SNACKS & EMBOTELLADOS MENÚ PRECIOS`. Mismo problema que F-4 pero dentro de `content.blocks[].data.title`. Toca las mismas páginas ancla. |
| **G-3** | **Scraper del sitio oficial de Starbucks** | 2-3 horas | Da 59 de 168 productos con foto real (35%). Techo impuesto por la fuente, no por el algoritmo. **Solo sirve para Starbucks**: las demás cadenas no se dejan con un fetch simple. |

**Regla que no se rompe en G-3:** solo match **exacto**. El difuso da 43% pero
empareja `Fresa Cream Frappuccino` con la foto de `Cajeta Cream Frappuccino`, y
eso es peor que no tener foto.

### Detrás de esto, en orden
1. **F-1** consolidar marcas duplicadas con 301 (junta 361 mil impresiones de
   Starbucks en una sola URL). Toca tráfico real: pide confirmación explícita.
2. **E-1** canonical por place entre URL plana y anidada.
3. **A1** lectura del editor por Go (½ día) — lo que desbloquea modificar layouts.
4. **F-3** re-correr el backfill (`mcdonalds-mexico` tiene 320 productos en
   `content` y 0 en `catalog_items`).

### Decisiones abiertas del usuario
- **E-2**: qué hacer con los dos dominios (`menus.bysmax.com` y
  `menusdigitalesmonterrey.com` sirven la misma app y cada uno se declara
  canónico de sí mismo). Es lo que más tráfico pone en juego de todo el archivo.
- **C**: ¿Cloudflare enfrente del VPS para servir las imágenes propias?
- **D**: qué dirección toma el header de la ficha.

---

## A · Editor de `admin-menus` completo contra Go

### Dónde estamos de verdad (importante antes de planear)

**Guardar ya funciona contra Go.** `ContentEditor.tsx` hace `PUT /api/places/{id}`
(líneas 388, 426, 534) → `app/api/places/[id]/route.ts`, que hoy es un proxy
delgado a Go → `internal/api/places.go`, y ahí el content pasa por
`internal/content` (Parse → WriteDoc → ReadDoc → Compile) en una transacción.
Eso incluye `view_settings`, o sea **cambiar el layout/template de un place ya se
guarda por Go**.

Lo que NO pasa por Go es la **lectura**:

| Ruta | Hoy | Consumidores |
|---|---|---|
| `PUT /api/places/{id}` | ✅ Go | `ContentEditor` (guardar y borrar) |
| `GET /api/admin/place/{id}` | ❌ Supabase directo (`.from('places').select('*, states(*)')` + reviews) | `PlaceEditContainer`, `PlaceInsightsContainer` |
| Subida de imágenes | ❌ Cloudinary directo desde el navegador (`upload_preset` sin firmar) | `ContentEditor:265`, `ManualUploader:119` |
| `POST /api/ai/update-content` | ❌ Next + Supabase | editor con IA |

O sea: el editor lee de Supabase y escribe en Go. Funciona, pero cualquier
diferencia entre las dos lecturas se ve como "guardé y no se actualizó".

### A1 · Mover la lectura a Go (½-1 día) ← desbloquea layouts

- `GET /api/places/{id}` ya existe en Go con paridad doc03, pero devuelve el place
  solo. `GET /api/admin/place/{id}` devuelve `{place (con states), reviews}`.
  Dos opciones:
  - **(recomendada)** el cliente hace dos llamadas: `GET /api/places/{id}` +
    `GET /api/public/reviews?place_id=` (ya existe, commit `fe0a76c`). Cero
    código nuevo en Go.
  - o agregar `?include=reviews` al endpoint de Go y devolver el mismo shape.
- Cambiar `PlaceEditContainer.tsx` y `PlaceInsightsContainer.tsx` para que peguen
  ahí. Son los dos únicos consumidores (verificado con grep).
- Borrar `app/api/admin/place/[id]/route.ts`.

**Aceptación:** abrir `/place/{id}/menu`, `/gallery` y `/settings`, editar el
layout, guardar, recargar y ver el cambio — sin que ninguna pestaña lea Supabase.
Verificar en la pestaña de red que no queda ninguna llamada a `/api/admin/place`.

### A2 · Subida de imágenes por Go (1 día) ← se junta con el frente C

Hoy el navegador sube directo a Cloudinary con un `upload_preset` sin firmar:
cualquiera que lea el bundle puede subir a la cuenta. Se reemplaza por
`POST /api/places/{id}/images` en Go (multipart, exige sesión + ownership,
valida tipo y tamaño, devuelve la URL final). El destino de esa URL lo define el
frente C.

**Aceptación:** subir una imagen desde el editor y desde `ManualUploader`, ver
que aparece en la ficha pública, y confirmar que el `upload_preset` ya no está en
el bundle del navegador.

### A3 · IA por Go (2 días, es F7 del doc 08)

`POST /api/ai/update-content` y `/api/ai/rollback` portados a Go (doc 05:
SYSTEM_PROMPT literal, preprocess, strip/restore, sanitize, límite de $20,
historial en `place_content_history`). Guardar siempre vía `internal/content`.

**Se puede posponer:** el editor manual queda completo sin esto. Si lo que urge
son los layouts, A1 basta.

### A4 · Cerrar

- `GET/PUT /api/restaurants/{id}` (legacy doc03): confirmar con grep si algo del
  dashboard los sigue llamando; si no, borrar.
- Quitar el punto ámbar de "en mantenimiento" del sidebar en las secciones ya
  migradas.

---

## B · Sucursales — el caso Spikes

### ⚠️ Hallazgo que cambia el tamaño del problema (2026-07-27)

No son 2 sucursales, son **10**. Consultando la API de PideDirecto
(`api.pidedirecto.mx/pidedirecto/v2/public/getAppContextApi`, payload
`{urlSubdomain, urlPathname}`) con el subdominio `spikes`:

```
concordia     Spikes (Concordia)      Av. Concordia 5000, Cd Apodaca
cumbres       Spikes (Cumbres)        Av Paseo de los Leones 2121, Cumbres   ← la única que tenemos
lindavista    Spikes (Linda Vista)    Av. Miguel Alemán Valdez 246, Guadalupe
mederos       Spikes (Mederos)        Av. Lázaro Cárdenas 4406, Monterrey
modelo        Spikes (Modelo)         Tlatelolco 1107, Unidad Modelo
romulo        Spikes (Rómulo)         Av. Rómulo Garza 1150, Hacienda Los Morales
santacatarina Spikes (Santa Catarina) Blvd Gustavo Díaz Ordaz 123
sendero       Spikes (Sendero)        Casa de Montejo 101, Casa Bella
solidaridad   Spikes (Solidaridad)    Av. Luis Donaldo Colosio 940, Mirasol
tec           Spikes (Tec)            Río Pánuco 311, Tecnológico
```

O sea el modelo de sucursales no es un caso especial de Spikes: es la forma
normal de una cadena, y el scraper ya sabe leerla (`scrape-pidedirecto.js:126`
detecta `branch_list` cuando hay más de un restaurante). Lo que falta es que la
base y el sitio sepan representarlas.

**Herramientas que ya existen** (`menus/scripts/`): `scrape-pidedirecto.js`
(una sucursal o lista), `bulk-scrape-pidedirecto.js` (lista de subdominios, ya
incluye `spikes`), `count-pidedirecto.js` (cuenta sucursales). Los tres escriben
a Supabase con la service-role key — **hay que migrarlos a Go** cuando se cierre
la Etapa C, o al menos apuntarlos a los endpoints nuevos.

### ⚠️ Corrección (2026-07-27, con datos de Search Console)

**Las 10 sucursales ya están en la base**, ids 2284-2293, cada una con 55
productos y **55 imágenes**. El scraper ya las trajo en su momento; yo las había
buscado mal (solo consulté `spikes` y `spikes-cumbres`).

El raro es `spikes` (id 1414): 58 productos, **0 imágenes**, dirección `México`.
No es la matriz — es un registro viejo y aparte, anterior al scraping por
sucursal.

Clics reales en Search Console:

| Página | Clics | Impresiones | CTR | Posición |
|---|---|---|---|---|
| `/menus/spikes` | 420 | 9,684 | 4.3% | 7.1 |
| `/menus/estados/nuevo-leon/spikes` | 219 | 6,064 | 3.6% | 7.6 |
| `/menus/spikes-santa-catarina` | 270 | 8,089 | 3.3% | 6.6 |
| `/menus/estados/nuevo-leon/spikes-santa-catarina` | 121 | 9,625 | 1.3% | 7.2 |
| `/menus/estados/nuevo-leon/spikes-solidaridad` | 136 | 8,146 | 1.7% | 6.5 |
| `/menus/estados/nuevo-leon/spikes-tec` | 102 | 4,817 | 2.1% | 5.9 |
| `/menus/spikes-cumbres` | 88 | 8,291 | 1.1% | 7.2 |

**Decisión revisada: `/menus/spikes` se convierte en página de marca**, no en un
menú más. Hoy compite con sus propias sucursales por las mismas búsquedas y lo
hace con la peor versión del contenido (sin fotos, con dirección falsa).

- `/menus/spikes` = hub de marca: nombre, el menú general y **la lista de las 10
  sucursales con su dirección**, cada una enlazando a su página.
- Las 10 sucursales conservan su página y su menú. **No se hace 301 de ninguna**:
  tienen tráfico propio y contenido genuinamente distinto (direcciones).
- Al menú del hub se le copian las imágenes de las sucursales (42 de sus 58
  productos coinciden por nombre y todas traen foto), para que la página de
  marca deje de ser la más pobre de las once.

Esto reemplaza la decisión anterior de "fusionar Cumbres en Spikes", que se tomó
creyendo que solo había dos registros.

### Decisión anterior (superada) — quién ganaba entre `spikes` y `spikes-cumbres`

Comparación real (2026-07-27):

| | `/menus/spikes` | `/menus/spikes-cumbres` |
|---|---|---|
| Productos | 58 | 55 |
| Con precio | 58 | 55 |
| **Con imagen** | **0** | **55** |
| **Con descripción** | **0** | **53** |
| Dirección | `México` (inservible) | Av Paseo de los Leones 2121 |
| Teléfono | — | 8183474010 |
| Bloques | 11 `section` + 4 `markdown` | 8 `section` |
| **Visitantes (30 días)** | **355** | 74 |

El contenido bueno está en Cumbres; la autoridad en Google está en `spikes`
(4.8× el tráfico). Las dos aparecen en la búsqueda de "menus spikes" y se
canibalizan.

**Decisión: gana `/menus/spikes`.** Se le sube el contenido de Cumbres, no al
revés — hacer 301 hacia Cumbres tiraría la página que Google ya reconoce.

**Por qué se puede:** 42 de los 58 productos de `spikes` tienen pareja exacta
por nombre en Cumbres; **las 42 traen imagen y 41 traen descripción**. Se copian
por coincidencia de nombre y `spikes` pasa de 0 a 42 productos con foto. Quedan
16 sin imagen, esos a mano o con IA.

**Los precios no se tocan**: coinciden 42 nombres pero solo 3 coinciden en
nombre *y* precio — cada sucursal tiene los suyos y así se queda.

### Lo que hay hoy

```
id 1414  spikes           Spikes            15 blocks, 58 items
id 2285  spikes-cumbres   Spikes (Cumbres)   8 blocks, 55 items
```

Son **dos places independientes**, sin ninguna relación en la base. Y sus menús
no son el mismo: 42 nombres de producto coinciden, pero **solo 3 coinciden en
nombre Y precio**. Los precios difieren por sucursal.

La ruta `/menus/[name]/[sucursal]/index.astro` ya existe pero **ignora el
parámetro `sucursal`**: hace `getRestaurantByName({ name })` y renderiza el place
padre. O sea `/menus/campomar/san-pedro` servía lo mismo que `/menus/campomar`
(hoy hay un 301 puesto a mano para ese caso concreto en el build). Las otras
"sucursales" (`antojitostauro/tauro`, `rock&billy/citadel`) son páginas
hardcodeadas, no un modelo.

### Decisión de fondo (necesito tu respuesta)

- **B-opción 1 — enlazar (recomendada).** Cada sucursal sigue siendo su propio
  place con su propio menú y sus propios precios; se agrega la relación y un
  selector de sucursal en la ficha. No se pierde nada y refleja la realidad
  (los precios de Cumbres no son los de la matriz).
- **B-opción 2 — fusionar.** Un solo place, un solo menú, varias direcciones.
  Más limpio de administrar, pero **hay que decidir qué precio gana** en los 39
  productos que coinciden de nombre y difieren de precio, y se pierde el menú de
  la otra sucursal.

El resto del plan asume la opción 1.

### B1 · Modelo (½ día)

```sql
ALTER TABLE places ADD COLUMN parent_place_id bigint REFERENCES places(id);
ALTER TABLE places ADD COLUMN branch_slug text;   -- 'cumbres'
CREATE UNIQUE INDEX ON places (parent_place_id, branch_slug)
  WHERE parent_place_id IS NOT NULL;
```

Aditiva, no rompe nada. `spikes-cumbres` queda con
`parent_place_id = 1414, branch_slug = 'cumbres'`.

### B2 · API (½ día)

- `GET /api/public/places/{slug}` devuelve además `branches: [{slug, name,
  address, branch_slug}]` (las hijas si es padre; las hermanas si es hija).
- `GET /api/public/places/{slug}/{branch}` resuelve la hija.
- Las hijas salen del listado principal por defecto (`parent_place_id IS NULL`),
  con `?include_branches=1` para traerlas.

### B3 · Sitio (½-1 día)

- `/menus/[name]/[sucursal]` deja de ignorar el parámetro y resuelve la hija de
  verdad.
- Selector de sucursal en la ficha (ambas direcciones).
- **Canonical y sitemap**: la URL buena de una sucursal pasa a ser
  `/menus/spikes/cumbres`; `/menus/spikes-cumbres` queda con **301** hacia ella.
  Ojo: `/menus/spikes` y `/menus/spikes-cumbres` **ya tienen tráfico real** (las
  dos aparecen en el snapshot de Analytics), así que el 301 no es opcional.

### B4 · Admin (½ día)

Un campo en `/settings` para colgar un place de otro como sucursal, y un botón
"convertir en sucursal de…". Sin esto, unir sucursales es un UPDATE a mano cada
vez.

---

## C · Imágenes propias (dejar de depender de terceros)

### El estado real, que es peor de lo que parece

3,218 imágenes únicas en `places.content`. Por dueño:

| Host | Referencias | ¿De quién es? |
|---|---|---|
| `images.letseat.mx` | 7,056 | **de un competidor** |
| `www.wansoft.net` | 2,457 | de un tercero |
| `ecommercewansoft.blob.core.windows.net` | 1,663 | de un tercero |
| `res.cloudinary.com` | 992 | **tuyo** |
| `mxmenu.net` | 506 | **de un competidor** |
| `firebasestorage.googleapis.com` | 51 | de un tercero, **ya roto** |

**2,526 de las 3,218 imágenes únicas (78%) están hotlinkeadas desde servidores
que no controlas**, dos de ellos de plataformas de menús que compiten contigo.
Pueden bloquear el hotlinking, cambiar la imagen o borrarla cuando quieran, y el
sitio se llena de huecos sin que nada avise.

Probé una muestra: las de letseat, wansoft y mxmenu siguen respondiendo 200. Las
de Firebase devuelven 200 con **588 bytes** — eso no es una imagen, es una página
de error disfrazada. Esas ya están rotas hoy.

### C1 · Servicio de imágenes en Go (1-2 días)

- Almacenamiento en disco del VPS, direccionado por hash del contenido
  (`/var/lib/menus-images/ab/cd/abcdef…webp`) — el hash evita duplicados y hace
  el purge trivial.
- `GET /img/{hash}` y `GET /img/{hash}/{w}` (una o dos anchuras, no un
  transformador general: hoy Cloudinary hace `w_1000,f_auto,q_auto` y con dos
  variantes bien elegidas se cubre).
- Conversión a WebP al ingresar. Con las medias de la muestra (~158 KB por
  imagen) el total ronda **0.5 GB en original y bastante menos en WebP** —
  cabe sin drama en el VPS, pero hay que confirmar disco antes.
- `Cache-Control: public, max-age=31536000, immutable` (el hash lo permite).

### C2 · Espejado de lo existente (1 día, casi todo tiempo de máquina)

`cmd/mirror-images`: recorre `places.content`, descarga cada URL externa,
la guarda, y **reescribe el content vía `internal/content`** (nunca a mano) para
que apunte a `/img/{hash}`. Idempotente, con reporte OK/FALLO por imagen y
`--dry-run`.

Las que fallen se quedan con la URL vieja y salen en el reporte, para revisarlas
a mano. Las 51 de Firebase probablemente son bajas.

### C3 · Cerrar la puerta (½ día)

La subida nueva (A2) escribe directo en este servicio. A partir de ahí ninguna
imagen nueva nace en un dominio ajeno.

### Riesgos a decidir

- **Ancho de banda del VPS**: hoy Cloudinary absorbe ese tráfico. Sirviendo desde
  el VPS, las imágenes pasan a consumir tu ancho de banda. Mitigable poniendo
  Cloudflare enfrente (gratis) — conviene decidirlo antes de C1.
- **Backups**: el disco de imágenes entra al plan de respaldo (doc 07); hoy no
  existe porque no había nada que respaldar.
- **Copyright**: bajar y re-servir fotos de un competidor es distinto legalmente
  de enlazarlas. Para fotos de los propios negocios (que es la mayoría) no hay
  problema, pero vale tenerlo presente.

---

---

## E · Canibalización en Google (lo más caro que hay abierto)

Datos de Search Console pegados por el usuario el 2026-07-27. **Corrigen una
decisión que tomé antes con datos peores** (un snapshot de Analytics de páginas
top, que solo mostraba una de las dos formas).

### E-1 · Las dos formas de URL rankean a la vez

No es que una gane: **las dos están indexadas y se reparten los clics**, y quién
gana cambia según el lugar.

| Lugar | `/menus/{slug}` | `/menus/estados/nuevo-leon/{slug}` |
|---|---|---|
| starbucks-mexico | **1,428** | 409 |
| starbucks | **838** | 336 |
| dominos-pizza-mexico | **558** | 240 |
| toks | **506** | 166 |
| carls-jr | **422** | 335 |
| spikes | **420** | 219 |
| spikes-santa-catarina | **270** | 121 |
| dairy-queen | 116 | **822** |
| mochomos | 122 | **627** |
| el-pollo-loco | — | **1,447** |
| tim-hortons | — | **1,436** |
| super-salads | — | **1,064** |
| la-magdalena-san-pedro | **1,635** | — |

Es contenido duplicado literal: mismo place, dos URLs, **ninguna con
`canonical`** (ninguna página de detalle lo pasa, así que cae en `Astro.url` y
cada una se declara canónica de sí misma).

Lo que esto cuesta: en Starbucks México las dos suman 1,837 clics sobre 156,195
impresiones. Consolidadas en una sola URL, esa página competiría con el doble de
señales en vez de partirlas.

**Lo que NO se puede hacer:** elegir una forma "a nivel global" y 301 la otra.
`el-pollo-loco`, `tim-hortons` y `super-salads` solo rankean en la anidada;
`la-magdalena` solo en la plana. Un 301 masivo en cualquier dirección tira
tráfico real.

**Propuesta:** `canonical` **por place, hacia la URL que más clics tiene hoy**
según Search Console, dejando ambas accesibles (sin redirect). Google consolida
en la elegida sin que se pierda nada por el camino. Requiere:
1. Exportar el reporte de Search Console por página (el que ya tienes).
2. Una tabla `places.canonical_path` poblada con el ganador de cada uno.
3. Que las plantillas pasen `canonical` en vez de dejar el default.

Los que solo rankean en una forma se canonicalizan a esa y listo.

### E-2 · Dos dominios sirviendo lo mismo

`menus.bysmax.com` y `www.menusdigitalesmonterrey.com` son **la misma
aplicación**, y cada dominio se declara canónico de sí mismo (verificado en vivo
sobre `/menus/campomar`: cada uno emite su propio `<link rel="canonical">`).

Los dos tienen tráfico real, así que esto no se resuelve apagando uno:

| Página | bysmax | menusdigitales |
|---|---|---|
| `/menus/campomar` | — | **6,709** (la página más grande de las dos propiedades) |
| `/menus/rock&billy/citadel` | — | 724 |
| `/moteles/estados/nuevo-leon/motel-love` | **1,350** | 199 |
| `/moteles/estados/nuevo-leon/kyoto-suites-motel` | **533** | 50 |
| `/moteles/estados/nuevo-leon/sunset-marquis` | **114** | 46 |
| `/moteles/estados/jalisco/motelcosmopolitan` | **115** | 27 |

`menusdigitalesmonterrey` es fuerte en Campomar y en varios moteles de Jalisco,
Guerrero e Hidalgo que en bysmax no aparecen; bysmax domina el resto.

Hay que decidir la estrategia antes de tocar nada, porque es la que más tráfico
pone en juego de todo este documento:

- **E-2a · Un dominio principal + 301 del otro.** Máxima consolidación, pero se
  arriesgan los 6,709 clics de Campomar si el 301 no se hace con cuidado.
- **E-2b · Canonical cruzado por página** hacia el dominio que gana cada una.
  Conserva ambos vivos y consolida señales. Más trabajo, mucho menos riesgo.
- **E-2c · Separar de verdad**: que cada dominio tenga su propio inventario
  (p. ej. menusdigitales = Monterrey, bysmax = nacional) y dejen de duplicarse.

**Pendiente de decisión del usuario. Nada de esto se toca hasta entonces.**

---

## F · Los anclas — duplicación de marca (la prioridad real)

Análisis del 2026-07-27 sobre las páginas con más clics de Search Console.
Pedido del usuario: *"no te enfoques en spikes, sino en los anclas que ya
tenemos"*.

### F-1 · Cada marca ancla existe varias veces en la base

| Marca | Registros | Productos (idénticos) |
|---|---|---|
| **Burger King** | `burger-king`, `burger-king-menu`, `burger-king-menu-precios-mexico`, `burger-king-menu-precios-mexico-actualizados-2024` | 76 / 76 / 76 / 76 |
| **KFC** | `kfc`, `kfc-mexico`, `combos-kfc` | 136 / 136 / 7 |
| **Starbucks** | `starbucks`, `starbucks-mexico` | 168 / 168 |
| **Toks** | `toks`, `toks-mexico` | 166 / 166 |
| **McDonald's** | `mcdonalds-mexico`, `mcdonald-s` | 320 / 20 |

Y como **cada registro se sirve además en dos formas de URL** (plana y anidada,
sección E-1), una sola marca llega a tener **cuatro URLs** con el mismo menú.

Starbucks, sumando lo que Search Console reporta:

| URL | Clics | Impresiones | CTR | Posición |
|---|---|---|---|---|
| `/menus/starbucks-mexico` | 1,428 | 106,608 | 1.3% | 6.2 |
| `/menus/starbucks` | 838 | 132,331 | 0.6% | 3.5 |
| `/menus/estados/nuevo-leon/starbucks-mexico` | 409 | 49,587 | 0.8% | 4.7 |
| `/menus/estados/nuevo-leon/starbucks` | 336 | 72,919 | 0.5% | 3.0 |
| **Total** | **3,011** | **361,445** | **0.83%** | — |

361 mil impresiones repartidas entre cuatro páginas con el mismo contenido, y
ninguna pasa del 1.3% de CTR.

### F-2 · Los anclas están vacíos de imágenes

Medido sobre `content` (no sobre `catalog_items`, ver F-3):

| Página | Clics | Impr. | CTR | Pos | Productos | % con imagen |
|---|---|---|---|---|---|---|
| `la-magdalena-san-pedro-garza-garcia` | 1,635 | 37,173 | **4.4%** | 7.5 | 97 | **99%** |
| `el-pollo-loco` | 1,447 | 62,036 | 2.3% | 4.7 | 18 | **67%** |
| `tim-hortons` | 1,436 | 68,658 | 2.1% | 3.4 | 102 | 0% |
| `starbucks-mexico` | 1,428 | 106,608 | 1.3% | 6.2 | 168 | 0% |
| `super-salads` | 1,064 | 46,799 | 2.3% | 3.2 | 85 | 0% |
| `starbucks` | 838 | 132,331 | **0.6%** | 3.5 | 168 | 0% |
| `dairy-queen` | 822 | 99,575 | **0.8%** | 3.0 | 40 | 0% |
| `mcdonalds-mexico` | 559 | 69,103 | 0.8% | 7.3 | 320 | 0% |
| `kfc-mexico` | 106 | 29,486 | **0.4%** | 6.9 | 136 | 0% |
| `campomar` (otro dominio) | 6,709 | 98,427 | 6.8% | 7.0 | 110 | 0% |

Las dos páginas con imágenes son las dos de mejor CTR. `la-magdalena` está en la
**posición 7.5 y convierte 7× mejor que `dairy-queen`, que está en la 3.0**.

Cuidado con la conclusión: no es que las imágenes suban el CTR por sí solas —
lo que se ve en el SERP es el título y la meta, no las fotos. Pero `campomar`
también tiene 0% de imágenes y un 6.8% de CTR, así que la variable dominante no
es esa: es **cuántas versiones de la misma página compiten entre sí**. Campomar
y La Magdalena son los dos anclas que **no** están duplicados.

### F-3 · A varios anclas nunca les corrió el backfill

`content` y `catalog_items` no coinciden:

| Página | Productos en `content` | En `catalog_items` |
|---|---|---|
| `mcdonalds-mexico` | 320 | **0** |
| `starbucks-mexico` | 168 | **0** |
| `carls-jr` | 49 | **0** |
| `campomar` | 110 | 110 ✅ |
| `starbucks` | 168 | 168 ✅ |

El sitio público no se ve afectado (renderiza desde `content`), pero cualquier
cosa que consulte `catalog_items` ve esas fichas vacías. Es la cola pendiente de
F2 (`ERROR=10` en el backfill). **Y es una trampa para el análisis**: mi primera
medición de "imágenes por ancla" usó `catalog_items` y daba números falsos.

### F-4 · Títulos con basura heredada del scraping

El `<title>` sale del `name` del place, y hay 14 con basura. El peor es un ancla:

```
kfc-mexico → name = "Kfc  Actualizado 2024"
<title>Menú de Kfc  Actualizado 2024 y Precios (2026) ➔ ...</title>
```

Ese título dice 2024 y 2026 a la vez, con doble espacio. Es el ancla con el peor
CTR de todos (**0.4%** con 29,486 impresiones). También: `BURGER KING MENU
PRECIOS MEXICO ACTUALIZADOS 2024`, `John Ham's Menú`, y 10 con espacios sobrantes.

### ✅ F-4 EJECUTADO (2026-07-27)

20 nombres corregidos por UPDATE directo a `places.name`. Respaldo de los
valores anteriores en `scratchpad/nombres-antes.csv` (no versionado — si hace
falta revertir, están también aquí abajo).

| id | short_name | antes | ahora |
|---|---|---|---|
| 1291 | `kfc-mexico` | `Kfc  Actualizado 2024` | KFC |
| 4 | `la-santa` | `La santa La Santa Kitchen bar ` | La Santa Kitchen Bar |
| 2223 | `john-ham-s-menu` | `John Ham's Menú` | John Ham's |
| 2163 | `tienda-lorenzoboturini` | `Lecaroz  Lorenzo Boturini` | Lecaroz Lorenzo Boturini |
| 1544 | `burger-king` | `BURGER KING` | Burger King |
| 2309 | `bikers-drinks` | `Bikers Drinks ` | Bikers Drinks |
| 1284 | `comidas-rossy` | `Comidas Rossy ` | Comidas Rossy |
| 2316 | `logan-steven-lvarez` | `Logan Steven Álvarez ` | Logan Steven Álvarez |
| 2315 | `obaal-caf` | `Obaal café ` | Obaal Café |
| 2298 | `pizzera-roman` | `Pizzería Roman ` | Pizzería Roman |
| 2304 | `the-italian-coffee` | `The Italian Coffee ` | The Italian Coffee |
| 149 | `won` | `Won Korean BBQ & Grill ` | Won Korean BBQ & Grill |
| 2314 | `alaschelas` | `ALASCHELAS` | Alas Chelas |
| 2303 | `chronos-gym` | `CHRONOS GYM` | Chronos Gym |
| 2065 | `don-pizza` | `DON PIZZA` | Don Pizza |
| 2167 | `dumbo-pizza` | `DUMBO PIZZA` | Dumbo Pizza |
| 2313 | `el-rincon-del-antojo-mexicano` | `EL RINCON DEL ANTOJO MEXICANO` | El Rincón del Antojo Mexicano |
| 2300 | `gorditas-tita` | `GORDITAS TITA` | Gorditas Tita |
| 2296 | `mariscos-tomy` | `MARISCOS TOMY` | Mariscos Tomy |
| 2332 | `sauria-cafe` | `SAURIA CAFE` | Sauria Café |

**No se tocaron**, a propósito:
- Los 3 duplicados de Burger King (`burger-king-menu`,
  `burger-king-menu-precios-mexico`, `…-actualizados-2024`): mueren en la
  consolidación con 301 (F-1). Renombrarlos ahora sería trabajo tirado y dejaría
  cuatro páginas con título idéntico.
- Las **60 sucursales de Lecaroz** (`LECAROZ AGRICOLA`, `LECAROZ BALBUENA`, …):
  están en mayúsculas pero son consistentes entre sí y ninguna aparece en el
  top 100 de Search Console. Decisión aparte.

**Purga de caché**: obligatoria, porque estas páginas sirven con
`s-maxage=31536000` y un UPDATE directo a la base no dispara el purge de
`admin-menus-go`. Se mandaron los 20 tags `place-{slug}` más `places-all` a
`POST /api/revalidate` **en los dos dominios**. Verificados los 20 títulos en
vivo después.

⚠️ **Trampa encontrada al purgar**: en `zsh` una variable sin comillas *no* se
separa en palabras, así que el primer intento mandó un único tag gigante
(`"place-kfc-mexico la-santa john-ham-s …"`) y el endpoint respondió `200` con
`revalidated:true` igual. **Un 200 de `/api/revalidate` no significa que los
tags fueran válidos.** Siempre verificar el `<title>` en vivo después.

### Plan para los anclas

1. **Elegir un ganador por marca** (el de más clics en Search Console) y
   consolidar: los demás registros se apagan con **301 hacia el ganador**. En
   Starbucks eso junta 361 mil impresiones detrás de una sola URL.
2. **Limpiar los 14 `name` con basura**, empezando por `kfc-mexico`.
3. **Canonical por place** entre forma plana y anidada (sección E-1).
4. **Re-correr el backfill** para cerrar el hueco de `catalog_items` (F-3).
5. Solo después, mirar imágenes y contenido — sin duplicados, ahí sí se puede
   medir si mueven la aguja.

**Nada de esto se ejecuta sin confirmación:** apagar registros con 301 toca
tráfico real y no es reversible con un `git revert`.

---

## G · Imágenes de producto para las cadenas ancla

Pregunta del usuario: *"Starbucks ocupa imágenes, ¿hay alguna forma automática
y no morir en el intento?"*. Probado el 2026-07-27 con datos reales, no estimado.

### De dónde salieron las imágenes que YA existen

| Host | Imágenes | Places |
|---|---|---|
| `images.letseat.mx` | 7,056 | 166 |
| `www.wansoft.net` | 2,457 | 43 |
| `ecommercewansoft.blob…` | 1,663 | 21 |
| `res.cloudinary.com` (subidas a mano) | 278 | 32 |

O sea: el canal que funcionó fue **scrapear la plataforma donde el negocio ya
tenía su menú con fotos**. Starbucks no está en ninguna de esas (usa su propia app).

### Starbucks: sí se puede, con techo del ~35%

`starbucks.com.mx` es un Next.js que **entrega los productos en el HTML**
(`__NEXT_DATA__`), con fotos de producto de 425×425 y fondo transparente en
CloudFront. Prototipo corrido: 7 categorías, **110 productos únicos**.

Cruzado contra nuestros 168 items de `starbucks`:

| Estrategia | Cobertura |
|---|---|
| Match exacto normalizado | 49 / 168 (29%) |
| **+ normalizar variantes** (`Helado …`, `con leche light`, `con notmilk`) | **59 / 168 (35%)** |
| + match difuso (difflib 0.82) | 73 / 168 (43%) — **PERO NO SIRVE** |

⚠️ **El match difuso hay que descartarlo.** Produce emparejamientos falsos que
son peores que no tener foto:

```
Fresa Cream Frappuccino   ->  Cajeta Cream Frappuccino®   ✗
Chip Frappuccino          ->  Mocha Frappuccino®          ✗
Cajeta Frappuccino        ->  Café Frappuccino®           ✗
```

El techo del 35% no es del algoritmo, es **de la fuente**: el sitio oficial
lista 110 productos y nuestro menú tiene 168 (muchos de temporada o
descontinuados que Starbucks ya no publica).

### El patrón NO se generaliza a las otras cadenas

Probados con la misma técnica: `mcdonalds.com.mx`, `dominos.com.mx`,
`burgerking.com.mx`, `timhortons.mx`, `subway.com`. **Ninguno devuelve datos
útiles a un fetch simple** (SPAs que renderizan en cliente o bloquean bots).
Starbucks fue el caso afortunado.

Sacarles el catálogo requeriría navegador headless (Playwright) por marca — eso
sí es "morir en el intento" para 8 marcas.

### Opciones, de menos a más dolor

1. **Imagen por sección, no por producto** (recomendada para empezar).
   Starbucks tiene 13 secciones. **13 fotos en vez de 168**, y visualmente la
   página cambia por completo. Aplica igual a todas las cadenas y no depende de
   emparejar nombres.
2. **Scraper de Starbucks oficial**: ~2-3 horas, 59 productos con foto real,
   solo match exacto. Sirve para Starbucks y nada más.
3. **Una plataforma de delivery** (Rappi/UberEats/DiDi) como fuente única para
   todas las marcas: cobertura alta y catálogo comercial completo, pero es
   scrapear un marketplace y hay que evaluar bloqueo y legalidad.
4. **Generar con IA**: descartado para marcas reales. Una foto inventada de un
   Frappuccino que no existe así es engañar al usuario.

### Nota legal (una vez, para que conste)

Usar las fotos oficiales de Starbucks en un sitio de terceros es usar material
con derechos de la marca. Es práctica común entre agregadores y las fotos son
del propio producto que se lista, pero **es decisión del dueño del sitio, no
mía**. Queda anotado y no vuelvo a mencionarlo.

### Hallazgo lateral: los títulos de sección también traen basura

Las secciones de Starbucks se llaman, literalmente:

```
STARBUCKS MÉXICO SNACKS & EMBOTELLADOS MENÚ PRECIOS
STARBUCKS RECIÉN HORNEADO Y PANADERÍA MENÚ CON PRECIO
```

Es el mismo problema que los `name` que ya se limpiaron (F-4), pero dentro de
`content.blocks[].data.title`, y se ve como encabezado en la página. Pendiente.

---

## D · Header de la ficha (rediseño)

Pedido del usuario: *"ocupo mejores headers, `/menus/estados/nuevo-leon/el-pollo-loco`
se ve fatal, nunca me gustó pero no se me ha ocurrido otra forma"*.

### Qué hace hoy

`MenuPageRenderer.astro:470` — un flex de dos columnas al 50%: `<Image>` de
500×500 con `object-cover` a la izquierda, `<h1>` + descripción + datos a la
derecha. Cada template (`default`, `modern`, `elegant`, …) solo cambia clases de
tipografía y color, no la estructura.

### Por qué se ve mal (medido sobre los 526 places de menús)

| Dato que el header intenta mostrar | Cuántos lo tienen |
|---|---|
| Imagen | 497 (94%) |
| Descripción | 506 (96%) |
| **Dirección real** (distinta de "México") | **262 (50%)** |
| Teléfono | 249 (47%) |
| **Horario** | **14 (2.7%)** |

Dos problemas distintos:

1. **Estructural**: la foto entra como cuadrado de 500×500 recortado a
   `object-cover` sin contenedor con proporción fija. Las fotos reales son
   apaisadas (la de El Pollo Loco es de 1800px de ancho), así que se recortan
   agresivamente y el bloque queda desbalanceado contra la columna de texto.
2. **De datos**: el layout reserva espacio para dirección, teléfono y horario,
   pero **el horario existe en el 2.7% de los casos** y la dirección real en la
   mitad. En los peores casos —El Pollo Loco es uno: `semantic_data` vacío,
   `address = "México"`— media cabecera queda literalmente en blanco.

**Conclusión: el header hay que diseñarlo para el caso pobre (foto + nombre),
no para el rico.** Todo lo demás es opcional y debe colapsar sin dejar hueco.

### Direcciones propuestas (falta elegir)

- **D-1 · Banda apaisada.** La foto pasa a ser una franja 16:9 / 21:9 de ancho
  completo con degradado, y el nombre encima. Respeta la proporción real de las
  fotos, funciona sin ningún dato extra, y es el patrón que la gente reconoce de
  Uber Eats / Rappi.
- **D-2 · Tarjeta compacta.** Foto pequeña cuadrada (tipo avatar de marca, 96px)
  + nombre + una sola línea de metadatos con lo que exista. Ocupa poco, empuja
  el menú hacia arriba (que es a lo que la gente viene) y el caso pobre se ve
  igual de intencional que el rico.
- **D-3 · Aprovechar el carrusel.** 
  Varios places ya traen un bloque `carrusel` como primer bloque (El Pollo Loco
  es uno). Hoy el header lo ignora y muestra `place.image` aparte. Se puede usar
  el carrusel como cabecera cuando exista y caer a D-1 cuando no.

Pendiente: elegir dirección y ver mockups antes de tocar `MenuPageRenderer`.

---

## Orden sugerido y esfuerzo

| | Bloque | Esfuerzo | Desbloquea |
|---|---|---|---|
| 1 | **F-4** limpiar los 14 `name` con basura | 1 hora | arregla el título de KFC (0.4% CTR) hoy mismo |
| 2 | **F-1** consolidar marcas duplicadas con 301 | 1 día | junta 361 mil impresiones de Starbucks en una URL |
| 3 | **E-1** canonical por place (plana vs anidada) | 1 día | necesita el export de Search Console |
| 4 | **A1** lectura del editor por Go | ½-1 día | modificar layouts (lo que pediste) |
| 5 | **F-3** re-correr el backfill | 1 hora de máquina | cierra la cola de F2 |
| 6 | **D** header de la ficha | 1-2 días | depende de elegir dirección |
| 7 | **C1+C2** imágenes propias | 2-3 días | quita la dependencia del competidor |
| 8 | **A2** subida por Go | 1 día | necesita C1 |
| 9 | **B1-B4** sucursales | 2-3 días | no urge: Spikes no es un ancla |
| 10 | **A3** IA por Go | 2 días | posponible |
| ? | **E-2** los dos dominios | por decidir | es lo que más tráfico pone en juego |

## Bitácora de decisiones

| Fecha | Decisión | Por qué |
|---|---|---|
| 2026-07-27 | Borrar el place `722`, conservar el `721` | Duplicado exacto creado con 8 min de diferencia; ambos sin reseñas/pedidos/visitas. Se conserva el 721 porque su URL aparece en el snapshot de Analytics. |
| 2026-07-27 | No cambiar el `short_name` de `motelrealdeaguascalientes` | Ya estaba bien escrito y es la única URL de ese motel que Google conoce. |
| 2026-07-27 | ~~Moteles se quedan con la anidada, menús con la plana~~ **SUPERADA** | Se decidió con un snapshot de Analytics que solo mostraba una forma por lugar. Search Console demuestra que **las dos formas rankean a la vez** y que el ganador cambia por lugar (dairy-queen y mochomos ganan en anidada; starbucks y toks en plana). Ver sección E-1: el canonical va **por place**, no por sección. |
| 2026-07-27 | El canonical se decide por place con datos de Search Console | Un 301 masivo en cualquier dirección tira tráfico real: `el-pollo-loco`, `tim-hortons` y `super-salads` solo rankean en la anidada; `la-magdalena` solo en la plana. |
| 2026-07-27 | `sort=visits` = visitantes únicos de 30 días | Visitas crudas premian a quien recarga; el histórico completo premia a los places viejos. |
| 2026-07-27 | Los listados no emiten `content.blocks` | Es el 98% del peso y ninguna tarjeta lo lee: 6.7 MB → 143 KB en los 526 de `/menus`. |
| 2026-07-27 | `clabe` **no** es una fuga de seguridad | `CartManager.tsx` la muestra a propósito para pagos por transferencia. Se quita solo del listado masivo, donde nadie la usa. |
| 2026-07-27 | `/menus` pasa a renderizarse al visitarla | Era estática y Astro descartaba los query params: orden, filtros y paginación nunca funcionaron y solo 9 de 526 lugares eran alcanzables. |
| 2026-07-27 | ~~Fusionar `spikes-cumbres` dentro de `spikes`~~ **SUPERADA** | Se decidió creyendo que solo había dos registros. Hay **11**: `spikes` más las 10 sucursales (ids 2284-2293), todas con 55 productos y 55 imágenes. |
| 2026-07-27 | `/menus/spikes` se convierte en **página de marca** con la lista de las 10 sucursales | Hoy compite contra sus propias sucursales por las mismas búsquedas, y lo hace con la peor versión del contenido (0 imágenes, dirección `México`). Ninguna sucursal se redirige: todas tienen tráfico y contenido distinto. |
| 2026-07-27 | Los precios no se unifican entre sucursales | De 42 productos con el mismo nombre, solo 3 coinciden en precio: son precios reales distintos por sucursal. |
| 2026-07-27 | El header se diseña para el caso pobre | El horario existe en el 2.7% de los places y la dirección real en el 50%: diseñar para el caso rico deja huecos en la mayoría. |

## Decisiones que necesito de ti

1. Imágenes: ¿**Cloudflare enfrente** del VPS, o servimos directo y vemos cómo
   se comporta el ancho de banda?
2. Header: ¿**D-1** (banda apaisada), **D-2** (tarjeta compacta) o **D-3**
   (usar el carrusel)?
3. Sucursales: ¿traemos las 10 de Spikes con el scraper, o solo modelamos las
   dos que ya existen?
4. IA (A3): ¿entra ahora o después de sucursales?
