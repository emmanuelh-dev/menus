# Commands para ejecutar las migraciones

## 1. Comando SQL completo para ejecutar en Supabase

Ejecuta este comando en el SQL Editor de Supabase:

```sql
-- Habilitar extensión PostGIS para soporte de coordenadas y polígonos
CREATE EXTENSION IF NOT EXISTS postgis;

-- Agregar campos de ubicación y categoría a places
ALTER TABLE places
ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS formatted_address TEXT,
ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Crear índice para búsquedas por categoría
CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);

-- Crear índice espacial para búsquedas geográficas
CREATE INDEX IF NOT EXISTS idx_places_location ON places USING GIST (ST_MakePoint(lng, lat));

-- Crear tabla de zonas de envío
CREATE TABLE IF NOT EXISTS shipping_zones (
  id SERIAL PRIMARY KEY,
  place_id INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  area geography(Polygon, 4326),
  colonies TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para shipping_zones
CREATE INDEX IF NOT EXISTS idx_shipping_zones_place_id ON shipping_zones(place_id);
CREATE INDEX IF NOT EXISTS idx_shipping_zones_area ON shipping_zones USING GIST(area);
CREATE INDEX IF NOT EXISTS idx_shipping_zones_active ON shipping_zones(is_active);

-- Función para verificar si un punto está en una zona de envío
CREATE OR REPLACE FUNCTION is_point_in_shipping_zone(
  p_place_id INTEGER,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_colony TEXT DEFAULT NULL
) RETURNS TABLE(zone_id INTEGER, zone_name VARCHAR, delivery_price DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sz.id,
    sz.name,
    sz.price
  FROM shipping_zones sz
  WHERE sz.place_id = p_place_id
    AND sz.is_active = true
    AND (
      -- Verificar por polígono si existe
      (sz.area IS NOT NULL AND ST_Contains(sz.area::geometry, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)))
      OR
      -- Verificar por lista de colonias si existe
      (sz.colonies IS NOT NULL AND p_colony = ANY(sz.colonies))
    )
  ORDER BY sz.price ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Tabla de pedidos (preparación para sistema de delivery)
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  place_id INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_lat DOUBLE PRECISION,
  delivery_lng DOUBLE PRECISION,
  delivery_colony VARCHAR(255),
  shipping_zone_id INTEGER REFERENCES shipping_zones(id),
  delivery_price DECIMAL(10, 2) DEFAULT 0,
  items JSONB NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para orders
CREATE INDEX IF NOT EXISTS idx_orders_place_id ON orders(place_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_shipping_zones_updated_at
  BEFORE UPDATE ON shipping_zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON COLUMN places.lat IS 'Latitud del lugar obtenida de Google Maps';
COMMENT ON COLUMN places.lng IS 'Longitud del lugar obtenida de Google Maps';
COMMENT ON COLUMN places.formatted_address IS 'Dirección formateada por Google Maps';
COMMENT ON COLUMN places.category IS 'Categoría del negocio (tacos, birria, pizza, etc.)';

COMMENT ON TABLE shipping_zones IS 'Zonas de entrega configuradas por cada restaurante';
COMMENT ON COLUMN shipping_zones.area IS 'Polígono geográfico de la zona de entrega (PostGIS)';
COMMENT ON COLUMN shipping_zones.colonies IS 'Lista de colonias incluidas en esta zona';

COMMENT ON TABLE orders IS 'Pedidos realizados por los clientes';
COMMENT ON FUNCTION is_point_in_shipping_zone IS 'Encuentra la zona de envío para unas coordenadas específicas';
```

## 2. Configuración de Variables de Entorno

Agrega esta variable a tu archivo `.env`:

```env
PUBLIC_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
```

### Cómo obtener tu Google Maps API Key:

1. Ve a https://console.cloud.google.com/
2. Crea o selecciona un proyecto
3. Habilita estas APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API (opcional pero recomendado)
4. Ve a "Credenciales" y crea una API Key
5. Restringe la API Key a tu dominio para seguridad

## 3. Instalar dependencias de TypeScript para Google Maps

```bash
bun add -D @types/google.maps.places
```

## 4. Estructura de las nuevas tablas

### places (campos nuevos)
- `lat`: Latitud del lugar
- `lng`: Longitud del lugar  
- `formatted_address`: Dirección completa de Google Maps
- `category`: Categoría del negocio (tacos, birria, pizza, etc.)

### shipping_zones
- Configuración de zonas de entrega por restaurante
- Soporta polígonos geográficos (PostGIS)
- Soporta listas de colonias
- Precio por zona configurable

### orders
- Sistema completo de pedidos
- Vinculado a shipping_zones para cálculo automático de envío
- Estados de pedido (pending, confirmed, preparing, delivering, completed, cancelled)

## 5. Uso del componente GooglePlacesAutocomplete

El componente ya está integrado en PlaceManager. Cuando el usuario seleccione una dirección:
- Se autocompleta el campo
- Se guardan automáticamente las coordenadas (lat, lng)
- Se guarda la dirección formateada

## 6. Próximos pasos recomendados

1. Crear vista de administración de zonas de envío
2. Implementar en el checkout el cálculo de precio de envío
3. Dashboard de pedidos para los dueños
4. Notificaciones de nuevos pedidos
5. Mapa interactivo para dibujar zonas de entrega

## Notas importantes

- PostGIS permite usar polígonos para definir áreas de entrega exactas
- La función `is_point_in_shipping_zone()` verifica automáticamente si una dirección tiene entrega disponible
- El sistema soporta tanto colonias específicas como áreas geográficas por polígono
- Los pedidos se guardan con toda la información de ubicación para análisis futuro
