# Sistema de Delivery Completo

## Implementación completada

### 1. Base de Datos
Se agregó la tabla `customers` y se actualizó la tabla `orders` con todos los campos necesarios.

**Ejecuta la migración:**
```bash
# En el SQL Editor de Supabase, ejecuta el contenido de:
database/migrations/add_shipping_and_location_fields.sql
```

### 2. Componentes Creados

**ShippingZonesManager** ([src/components/admin/ShippingZonesManager.tsx](src/components/admin/ShippingZonesManager.tsx))
- Administrar zonas de envío con Google Maps Autocomplete
- Agregar colonias buscando en Google Maps
- Configurar precios de envío por zona
- Activar/desactivar zonas

**CartManager Actualizado** ([src/components/CartManager.tsx](src/components/CartManager.tsx))
- Checkout completo con datos de usuario
- Dropdown de colonias disponibles (cargadas desde las zonas configuradas)
- Campo de calle y número
- Cálculo automático de precio al seleccionar colonia
- Guardado de pedidos en Supabase
- Persistencia de datos del cliente
- Saludo personalizado: "Hola Emmanuel, revisa tu pedido"

### 3. Páginas Admin

**Configuración de Zonas** ([src/pages/admin/place/[id]/shipping.astro](src/pages/admin/place/[id]/shipping.astro))
- Nueva página en `/admin/place/[id]/shipping`
- Botón "Zonas" agregado en PlaceManager

### 4. APIs Creadas

Todas en `/api/`:

**Shipping Zones:**
- `GET /api/shipping-zones?place_id=X` - Listar zonas
- `POST /api/shipping-zones` - Crear zona
- `PUT /api/shipping-zones/[id]` - Actualizar zona
- `DELETE /api/shipping-zones/[id]` - Eliminar zona
- `GET /api/shipping-zones/check?place_id=X&lat=Y&lng=Z&colony=W` - Verificar cobertura

**Customers:**
- `POST /api/customers` - Crear/actualizar cliente (por teléfono único)
- `PUT /api/customers` - Actualizar cliente
- `GET /api/customers/[id]` - Obtener cliente

**Orders:**
- `POST /api/orders` - Crear pedido
- `GET /api/orders?place_id=X&status=Y` - Listar pedidos

### 5. Flujo Completo

#### Para el Dueño del Restaurante:
1. Ir a `/admin`
2. Click en "Zonas" de su restaurante
3. Buscar colonias usando Google Maps Autocomplete
4. Agregar cada colonia a una zona y asignar precio
5. Activar `enable_delivery` en el editor de contenido

#### Para el Cliente:
1. Agregar productos al carrito
2. Click en "Continuar"
3. Si ya es cliente registrado: "Hola [Nombre], revisa tu pedido"
4. Completar/verificar datos (nombre, teléfono)
5. Si el delivery está habilitado:
   - Marcar checkbox "Envío a domicilio"
   - Seleccionar colonia del dropdown (muestra precio de envío)
   - Escribir calle y número
   - Ver precio de envío actualizado automáticamente
6. Ver resumen con subtotal + envío
7. "Enviar por WhatsApp"
   - Se crea el pedido en Supabase (status: pending)
   - Se guarda el cliente (o actualiza si ya existe)
   - Se abre WhatsApp con el mensaje completo incluyendo colonia y calle
   - ID del cliente se guarda en localStorage

### 6. Datos Persistentes

**LocalStorage:**
- `customer_id`: ID del cliente para cargar datos en próximas visitas
- `cart_[slug]`: Carrito por restaurante
- `favorites_[slug]`: Favoritos por restaurante

**Base de Datos:**
- `customers`: Todos los clientes con dirección por defecto
- `orders`: Historial completo de pedidos
- `shipping_zones`: Configuración de zonas por restaurante

### 7. Tipos Actualizados

**SemanticData:**
- `enable_delivery?: boolean` - Habilita el sistema de delivery

**CartManagerProps:**
- `placeId: number` - ID del restaurante
- `deliveryEnabled?: boolean` - Si el delivery está habilitado

### 8. Configuración Requerida

En `.env`:
```env
PUBLIC_GOOGLE_MAPS_API_KEY=tu_api_key
```

### 9. Próximas Mejoras Sugeridas

- Dashboard de pedidos para dueños
- Cambiar estado de pedidos (pending → confirmed → preparing → delivering → completed)
- Notificaciones push/email al recibir pedidos
- Mapa interactivo para dibujar polígonos de zonas (en lugar de solo colonias)
- Historial de pedidos para clientes
- Sistema de cupones/descuentos
- Tiempo estimado de entrega

## Todo está listo para usar

El sistema está completamente funcional. Solo falta:
1. Ejecutar la migración SQL
2. Agregar la API key de Google Maps en `.env`
3. Configurar las zonas de envío desde el admin
