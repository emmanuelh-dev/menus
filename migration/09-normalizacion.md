# 09 · Normalización del modelo de datos

**Decisión:** normalizar desde el inicio. Las tablas normalizadas son la **fuente de verdad**; el JSONB `places.content` pasa a ser una **proyección derivada** que Go recompila en cada escritura. Esto da escala plana y predecible (queries por item, precio, disponibilidad, analytics por producto) sin romper al sitio público Astro, que sigue leyendo `content` sin enterarse.

## Qué se normaliza y qué no

| Datos | Destino | Por qué |
|---|---|---|
| Secciones, items, precios, opciones | Tablas (`catalog_*`) | Es el corazón relacional: hoy es imposible consultar "todos los precios de X" o alimentar el POS sin parsear blobs |
| `semantic_data` + `view_settings` | Tabla `place_details` (1:1) | Campos planos consultables (phone, enable_delivery, zone…) |
| Items de pedidos (`orders.items`) | Tabla `order_items` | Analytics de ventas por producto, integridad de totales |
| Orden y existencia de bloques | Tabla `place_blocks` | El orden del documento es relacional |
| Payload de bloques presentacionales (gallery, image, carrusel, markdown, text, menu_image con crops) | `place_blocks.data` JSONB | Es contenido tipo documento; normalizarlo agrega JOINs sin ninguna query nueva posible |
| `place_content_history` | Se queda JSONB | Un snapshot es exactamente eso |

## Esquema objetivo (DDL)

```sql
-- Orden del documento. Conserva los IDs existentes ('block-...').
CREATE TABLE place_blocks (
  id         text PRIMARY KEY,
  place_id   bigint NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  position   int    NOT NULL,
  type       text   NOT NULL CHECK (type IN ('section','gallery','image','carrusel','markdown','text','menu_image')),
  data       jsonb,          -- payload presentacional; NULL cuando type='section'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (place_id, position) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX idx_place_blocks_place ON place_blocks(place_id, position);

CREATE TABLE catalog_sections (
  block_id    text PRIMARY KEY REFERENCES place_blocks(id) ON DELETE CASCADE,
  place_id    bigint NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  title       text NOT NULL,
  category    text,
  description text,
  image       text,
  featured    boolean NOT NULL DEFAULT false,
  extra       jsonb            -- campos desconocidos del JSON original (round-trip sin pérdida)
);

CREATE TABLE catalog_items (
  id               text PRIMARY KEY,        -- conserva 'item-...'
  section_block_id text   NOT NULL REFERENCES catalog_sections(block_id) ON DELETE CASCADE,
  place_id         bigint NOT NULL REFERENCES places(id) ON DELETE CASCADE, -- denormalizado a propósito
  position         int    NOT NULL,
  slug             text,
  name             text   NOT NULL,
  price            numeric(10,2) NOT NULL DEFAULT 0,
  description      text,
  image            text,
  features         text[],
  available        boolean NOT NULL DEFAULT true,
  extra            jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_catalog_items_place   ON catalog_items(place_id);
CREATE INDEX idx_catalog_items_section ON catalog_items(section_block_id, position);

CREATE TABLE catalog_item_options (
  id          bigserial PRIMARY KEY,
  item_id     text NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  position    int  NOT NULL,
  name        text NOT NULL,
  required    boolean,
  max_choices int
);

CREATE TABLE catalog_option_values (
  id        bigserial PRIMARY KEY,
  option_id bigint NOT NULL REFERENCES catalog_item_options(id) ON DELETE CASCADE,
  position  int  NOT NULL,
  value     text NOT NULL,
  price     numeric(10,2)   -- NULL = sin precio propio (mapa `prices` del JSON)
);

CREATE TABLE catalog_item_gallery (
  id       bigserial PRIMARY KEY,
  item_id  text NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  position int  NOT NULL,
  src      text NOT NULL,
  alt      text,
  title    text
);

-- semantic_data + view_settings, 1:1 con places
CREATE TABLE place_details (
  place_id            bigint PRIMARY KEY REFERENCES places(id) ON DELETE CASCADE,
  description         text,
  phone               text,
  whatsapp            text,
  website             text,
  price_range         text,
  ambiance            text,
  hours               text,
  dress_code          text,
  cuisine_type        text,
  zone                text,
  cross_street        text,
  parking             text,
  variety             text,
  reservation_url     text,
  clabe               text,
  enable_cart         boolean,
  enable_delivery     boolean,
  has_admin           boolean,
  is_mobile           boolean,
  payment_options     text[],
  areas               text[],
  additional_features text[],
  extra               jsonb,
  view_layout         text NOT NULL DEFAULT 'grid',
  view_show_prices    boolean NOT NULL DEFAULT true,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- líneas de pedido
CREATE TABLE order_items (
  id               bigserial PRIMARY KEY,
  order_id         bigint NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id          text,            -- referencia débil al catálogo; el snapshot manda
  name             text NOT NULL,
  unit_price       numeric(10,2) NOT NULL,
  quantity         int NOT NULL CHECK (quantity > 0),
  selected_options jsonb,           -- lo que eligió el cliente, shape libre del POS
  line_total       numeric(10,2) NOT NULL
);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_item  ON order_items(item_id);
```

Notas de diseño:
- **IDs de texto** en blocks/items: se conservan los `block-...`/`item-...` existentes; los nuevos los genera Go con el mismo formato. Cero re-mapeo en frontend, historial y órdenes viejas.
- **`extra jsonb`** en sections/items/details: cualquier clave no reconocida del JSON original se guarda ahí y se re-mezcla al compilar. Garantiza round-trip sin pérdida (la regla del doc 02 sobrevive a la normalización).
- **`place_id` denormalizado** en `catalog_items`: las queries calientes (POS, disponibilidad, "items de este lugar") no pagan JOIN.
- Los nombres `catalog_*` evitan chocar con las tablas legacy `menu_*` (ver abajo).

## El compilador de contenido (pieza central en Go)

Módulo `internal/content` con dos funciones espejo y una invariante:

```go
// Decompiler: JSON content → filas normalizadas
func Parse(placeID int64, content json.RawMessage) (Doc, error)

// Compiler: filas normalizadas → JSON content (la proyección)
func Compile(doc Doc) json.RawMessage

// INVARIANTE (gate de la migración):
// Compile(Parse(x)) ≡ x   (comparación JSON normalizada, orden de claves ignorado)
```

**Toda escritura pasa por aquí, en una sola transacción:**
1. Mutación (PUT content del editor, guardado de IA, rollback, o endpoint granular).
2. Se actualizan las filas normalizadas (fuente de verdad).
3. Se recompila y se escribe `places.content` (proyección).

Reglas:
- Nadie escribe `places.content` directamente, nunca más. Solo el compilador.
- Los endpoints actuales (`PUT /api/places/{id}` con content, IA saveOnly, rollback) reciben el JSON de siempre → `Parse` → replace de filas del place → `Compile` → proyección. **El contrato API no cambia** (doc 03 sigue vigente tal cual).
- Los lectores (Astro público, GET del admin) leen la proyección: cero cambios y cero costo de JOIN en lecturas.
- `POST /api/orders`: parsea `items` del body → filas `order_items` + guarda el JSONB original en `orders.items` (proyección). Tracking y comanda no cambian.

## Backfill (1064 places)

CLI `cmd/backfill` en el mismo repo Go, idempotente y re-ejecutable:

1. Por cada place: `Parse(content)` → insertar filas (en transacción, `DELETE` previo de sus filas → re-insert).
2. `Compile` de lo insertado → **diff normalizado contra el content original**.
3. Reporte: `OK` / `DIFF` (con el diff) / `ERROR` (JSON malformado).
4. Los `DIFF`/`ERROR` se revisan a mano (con 1064 lugares scrapeados va a haber basura: bloques con shapes raros, `data:null`, tipos desconocidos). Regla: si el bloque no parsea, va a `place_blocks.data` como jsonb opaco con su `type` original — nunca se pierde contenido.
5. El backfill NO toca `places.content` (la proyección inicial ya es idéntica por definición). Solo puebla tablas.

Se corre las veces que haga falta antes del switch; la corrida final es minutos antes de activar escrituras Go (o se congela la edición 10 minutos — el admin tiene tráfico bajo).

## Nuevos endpoints granulares (la ganancia visible)

Se diseñan ya, se implementan en la fase del editor. El frontend migra del "PUT del blob completo" a mutaciones quirúrgicas:

```
GET    /api/places/{id}/catalog          → doc completo normalizado (secciones+items+opciones)
PUT    /api/places/{id}/details          → place_details (reemplaza editar semantic_data en el blob)
PUT    /api/places/{id}/blocks/order     → [{id, position}...] reordenar documento
POST   /api/places/{id}/sections         → crear sección (devuelve block_id)
PUT    /api/sections/{blockId}           → título/desc/imagen/featured
DELETE /api/sections/{blockId}
POST   /api/sections/{blockId}/items     → crear item
PUT    /api/items/{itemId}               → editar item (incluye options completas)
DELETE /api/items/{itemId}
PUT    /api/items/{itemId}/availability  → {"available": bool}  (toggle rápido para POS/comanda)
```

Cada uno muta filas → recompila proyección. Autorización: ownership del place asociado (matriz del doc 04).

## Tablas legacy `menu_*` (del create_menu_system.sql)

Verificado en producción: `menus` (2), `menu_categories` (25), `menu_items` (13), resto vacías. Único consumidor: el **admin viejo del sitio Astro** (`menus/src/pages/admin/**`, `MenuLoader.tsx`), superseded por admin-menus. Plan:
1. F2: archivar a CSV/SQL dump (por si acaso) y declararlas congeladas.
2. No reutilizar sus nombres (por eso `catalog_*`).
3. Drop cuando se retire el admin viejo de Astro (fuera del alcance de esta migración, anotado como tarea futura).

## Lo que NO se normaliza ahora (y cuándo sí)

- **Columnas camelCase de `places`** (`"priceRange"`, `"openingTime"`): renombrarlas rompe los 27 `from('places')` del sitio Astro. Se quedan hasta que Astro consuma el API Go o se toque ese repo; anotado como limpieza futura.
- **`shipping_zones.area` PostGIS**: ya es relacional, no se toca.
- **Bloques presentacionales**: si algún día se necesita consultar galerías cross-place (dudoso), se extrae entonces. YAGNI.

## Impacto en los demás documentos

- **Doc 02**: el esquema ahí descrito pasa a ser "estado actual / formato de la proyección". Las structs del content JSON siguen siendo necesarias (son el shape de la proyección y del API).
- **Doc 03**: contratos intactos (la proyección los preserva) + los endpoints granulares de arriba.
- **Doc 05 (IA)**: sin cambios de interfaz; el guardado final pasa por `Parse` → filas → proyección. El historial sigue siendo snapshots JSONB.
- **Doc 06**: fase adicional de frontend — migrar el editor de menús y el POS a los endpoints granulares (aceptado: "aunque en el frontend tenga que modificar algunas cosas").
- **Doc 08**: fases renumeradas (ver versión actualizada).
