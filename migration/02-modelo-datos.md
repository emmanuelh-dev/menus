# 02 · Modelo de datos (estado actual + formato de la proyección)

Esquema **verificado contra la base real** (consulta `select * limit 1` por tabla, 2026-07-12). Cuidado: `places` tiene columnas **camelCase con comillas** (`"priceRange"`, `"openingTime"`) — en SQL siempre entre comillas dobles.

> **Nota (decisión posterior):** el modelo se **normaliza desde el inicio** — ver [09-normalizacion.md](09-normalizacion.md). Este documento sigue siendo necesario por dos razones: (1) describe las tablas existentes que no cambian (orders, customers, shipping_zones, reviews, etc.), y (2) las structs del JSON `content` de abajo son el formato exacto de la **proyección** que Go compila y que consumen el API y el sitio Astro. La fuente de verdad del catálogo pasa a ser `catalog_*`/`place_details`.

## Tablas y columnas reales

### `places` — entidad central (moteles, restaurantes, servicios)
```
id            bigint PK
name          text
short_name    text            -- slug usado en URLs públicas
"priceRange"  text            -- camelCase real en DB
address       text
hours         text
services      text | null     -- ⚠️ corregido (ver ESTADO.md, sesión 2026-07-16): texto simple
                               --    coma-separado en producción real, NO text[] como decía antes
image         text
link          text | null
"openingTime" text | null
featured      bool
type          text            -- 'restaurant' | 'motel' | tipos de servicio (vulcanizadora, etc.)
rating        numeric
user_id       uuid | null     -- dueño (auth.users)
content       jsonb           -- TODO el contenido editable (ver abajo)
state_id      int FK states
category_id   int | null
lat, lng      double | null
formatted_address text | null
category      text | null
municipality_id int FK municipalities | null
created_at, updated_at timestamptz
```

> El tipo TS `Place` (admin-menus/types/index.ts) declara campos que **no** son columnas (`amenities`, `phone`, `specialties`, `reviewCount`…): viven dentro de `content.semantic_data` o son derivados. No inventar columnas.

### `content` (JSONB de places) — estructura canónica

Es el corazón del sistema. Port 1:1 de `types/index.ts`:

```go
type Content struct {
    SemanticData *SemanticData   `json:"semantic_data,omitempty"`
    Blocks       []Block         `json:"blocks,omitempty"`
    ViewSettings *ViewSettings   `json:"view_settings,omitempty"`
}

type ViewSettings struct {
    Layout     string `json:"layout"`      // 'grid' | 'list'
    ShowPrices bool   `json:"show_prices"`
}

type Block struct {
    ID   string          `json:"id"`
    Type string          `json:"type"` // section|gallery|image|carrusel|markdown|text|menu_image
    Data json.RawMessage `json:"data"` // decodificar según Type
}

type SemanticData struct {
    Description        string   `json:"description,omitempty"`
    Areas              []string `json:"areas,omitempty"`
    Address            string   `json:"address,omitempty"`
    PriceRange         string   `json:"price_range,omitempty"`
    Ambiance           string   `json:"ambiance,omitempty"`
    Hours              string   `json:"hours,omitempty"`
    Website            string   `json:"website,omitempty"`
    PaymentOptions     []string `json:"payment_options,omitempty"`
    DressCode          string   `json:"dress_code,omitempty"`
    Phone              string   `json:"phone,omitempty"`
    Whatsapp           string   `json:"whatsapp,omitempty"`
    EnableCart         *bool    `json:"enable_cart,omitempty"`
    EnableDelivery     *bool    `json:"enable_delivery,omitempty"`
    ReservationURL     string   `json:"reservation_url,omitempty"`
    CuisineType        string   `json:"cuisine_type,omitempty"`
    Zone               string   `json:"zone,omitempty"`
    CrossStreet        string   `json:"cross_street,omitempty"`
    Parking            string   `json:"parking,omitempty"`
    Variety            string   `json:"variety,omitempty"`
    AdditionalFeatures []string `json:"additional_features,omitempty"`
    Clabe              string   `json:"clabe,omitempty"`
    HasAdmin           *bool    `json:"has_admin,omitempty"`
    IsMobile           *bool    `json:"is_mobile,omitempty"` // usado por servicios
}
```

Datas por tipo de bloque (port de `types/index.ts`, mantener nombres JSON exactos):

```go
type SectionData struct {
    Title       string     `json:"title"`
    Category    string     `json:"category,omitempty"`
    Description string     `json:"description,omitempty"`
    Image       string     `json:"image,omitempty"`
    Items       []ItemData `json:"items"`
    Featured    *bool      `json:"featured,omitempty"`
}

type ItemData struct {
    ID          string        `json:"id"`
    Slug        string        `json:"slug,omitempty"`
    Name        string        `json:"name"`
    Price       float64       `json:"price"`
    Description string        `json:"description,omitempty"`
    Image       string        `json:"image,omitempty"`
    Features    []string      `json:"features,omitempty"`
    Gallery     []GalleryImg  `json:"gallery,omitempty"`
    Options     []ItemOption  `json:"options,omitempty"`
    Available   *bool         `json:"available,omitempty"`
}

type ItemOption struct {
    Name       string             `json:"name"`
    Values     []string           `json:"values"`
    Prices     map[string]float64 `json:"prices,omitempty"`
    Required   *bool              `json:"required,omitempty"`
    MaxChoices *int               `json:"max_choices,omitempty"`
}

type GalleryImg struct {
    Src         string `json:"src"`
    Alt         string `json:"alt,omitempty"`
    Title       string `json:"title,omitempty"`
    Description string `json:"description,omitempty"`
}

// gallery → {"images": []GalleryImg}
// image   → {"src","alt","caption"}
// carrusel→ {"items":[{"src","alt","link","caption"}]}
// markdown/text → {"content": string}
// menu_image → {"images":[{src,alt,title,description,width,height,sliceHeight,crop{enabled,x,y,width,height}}]}
```

**Regla crítica:** el *round-trip* sin pérdida se garantiza vía el compilador de proyección (doc 09): las claves no reconocidas se preservan en las columnas `extra jsonb` y se re-mezclan al compilar. La invariante `Compile(Parse(x)) ≡ x` es test de CI con fixtures reales de producción.

### `orders`
```
id bigint PK · uuid uuid · tracking_id bigint
place_id bigint FK places · customer_id bigint FK customers | null
customer_name text · customer_phone text
delivery_address text · delivery_lat/lng double|null · delivery_colony text
shipping_zone_id bigint|null · delivery_price numeric
items jsonb        -- array de ItemData + {quantity, selected_options...}: tratar como json.RawMessage
subtotal numeric · total numeric · notes text
status text        -- pending|confirmed|preparing|delivering|completed|cancelled
payment_method text -- cash|card|transfer
delivery_type text  -- delivery|pickup
created_at, updated_at timestamptz
```
> `items` se trata como `json.RawMessage` siempre (el POS manda shapes variados).

### `customers`
```
id bigint PK · name text · phone text UNIQUE · email text|null
default_address text · default_lat/lng double|null · default_colony text
created_at, updated_at
```

### `shipping_zones`
```
id · place_id FK · name · price numeric
area geography(Polygon,4326)|null   -- PostGIS; tratar como json/geojson opaco o NULL
colonies text[]|null · is_active bool · created_at, updated_at
```
> Existe función SQL `is_point_in_shipping_zone(place_id, lat, lng, colony)` — el checkout del sitio Astro la usa; Go no la necesita pero no debe romperla.

### `reviews`
```
id · created_at · comment text · rate numeric · restaurant text · place_id bigint · content · status
```

### `contact_notes` (CRM)
```
id bigserial · user_id uuid FK auth.users · contact_phone text · contact_name text
note_type text CHECK (note|whatsapp|call|email|followup) · content text · created_at
```
> Tiene RLS por `auth.uid()`. Como Go bypasea RLS, **obligatorio** filtrar `user_id = <usuario del token>` en cada query (doc 04).

### `place_content_history` (versiones para rollback)
```
id uuid PK · place_id bigint · content jsonb · created_at
source text   -- 'quick_feed'|'admin_editor'|'initial_import'|'admin_rollback'|'ai_update'
agent_reasoning text · version_label text
```

### `place_menu_visits` (analytics)
```
id bigserial · place_id bigint · visitor_id text · visited_at timestamptz
path text · user_agent text · referer text
```

### `states` / `municipalities`
```
states: id, name, slug
municipalities: id, state_id FK, name, slug, created_at
```

### Tablas que NO existen (no asumir)
- `contacts` — la página "Contacts" del admin se construye con `customers` + `orders` + `contact_notes`.
- `delivery_enabled` no existe como columna en `orders` (aunque el tipo TS lo declara). Verificar antes de escribirla; si el frontend la manda en el body, descartarla.

## Structs de fila (nivel store)

```go
type Place struct {
    ID               int64            `json:"id"`
    Name             string           `json:"name"`
    ShortName        *string          `json:"short_name"`
    PriceRange       *string          `json:"priceRange"` // JSON camelCase = columna camelCase
    Address          *string          `json:"address"`
    Hours            *string          `json:"hours"`
    Services         []string         `json:"services"`
    Image            *string          `json:"image"`
    Link             *string          `json:"link"`
    OpeningTime      *string          `json:"openingTime"`
    Featured         bool             `json:"featured"`
    Type             string           `json:"type"`
    Rating           *float64         `json:"rating"`
    UserID           *string          `json:"user_id"`
    Content          json.RawMessage  `json:"content"`
    StateID          *int64           `json:"state_id"`
    CategoryID       *int64           `json:"category_id"`
    Lat              *float64         `json:"lat"`
    Lng              *float64         `json:"lng"`
    FormattedAddress *string          `json:"formatted_address"`
    Category         *string          `json:"category"`
    MunicipalityID   *int64           `json:"municipality_id"`
    CreatedAt        time.Time        `json:"created_at"`
    UpdatedAt        *time.Time       `json:"updated_at"`
    // embebidos en algunas respuestas:
    States    *State  `json:"states,omitempty"`
    StateSlug *string `json:"state_slug,omitempty"`
}
```

Los demás structs (Order, Customer, ShippingZone, Review, ContactNote, HistoryEntry, Visit, State, Municipality, SystemUser) siguen el mismo patrón: JSON tag = nombre que hoy devuelve Supabase/PostgREST (snake_case salvo los camelCase de places). **La paridad de nombres JSON es lo que hace que el frontend no note el cambio.** Punteros para columnas nullable; timestamps en RFC3339 (formato que ya emite PostgREST).

`SystemUser` no es tabla: se arma desde GoTrue Admin API + places (ver doc 04):

```go
type SystemUser struct {
    ID           string   `json:"id"`
    Email        string   `json:"email"`
    FullName     string   `json:"full_name,omitempty"`
    Whatsapp     string   `json:"whatsapp,omitempty"`
    BusinessName string   `json:"business_name,omitempty"`
    Places       []string `json:"places,omitempty"`
    Role         string   `json:"role"` // admin|staff|user
    CreatedAt    string   `json:"created_at"`
    LastSignInAt string   `json:"last_sign_in_at,omitempty"`
}
```
