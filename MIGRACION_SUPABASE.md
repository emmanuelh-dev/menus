# Migración para Soporte de Imágenes en Restaurantes

Este documento describe los pasos necesarios para implementar el soporte de imágenes para restaurantes en Supabase.

## 1. Migración de Base de Datos

Ejecuta la siguiente consulta SQL en el Editor SQL de Supabase para añadir la columna `image` a la tabla `restaurants`:

```sql
ALTER TABLE restaurants
ADD COLUMN image TEXT;
```

Esta columna almacenará la URL de la imagen del restaurante.

## 2. Configuración del Bucket de Almacenamiento

Sigue estos pasos para crear y configurar el bucket de almacenamiento para las imágenes:

1. Inicia sesión en tu panel de Supabase
2. Ve a la sección "Storage" en el menú lateral
3. Haz clic en "Create a new bucket"
4. Configura el bucket con los siguientes parámetros:
   - **Nombre del bucket**: `restaurant-images`
   - **Tipo de acceso público**: Activado (para permitir acceso público a las imágenes)
   - **Tamaño máximo de archivo**: 2MB

## 3. Configuración de Políticas de Seguridad

Configura las políticas de seguridad para el bucket `restaurant-images` para permitir que cualquier usuario pueda realizar operaciones:

1. En la sección "Storage", selecciona el bucket `restaurant-images`
2. Ve a la pestaña "Policies"
3. Crea las siguientes políticas:

### Política para lectura pública

```sql
-- Permitir lectura pública de todas las imágenes
CREATE POLICY "Acceso público de lectura"
ON storage.objects FOR SELECT
USING (bucket_id = 'restaurant-images');
```

### Política para carga de imágenes (cualquier usuario)

```sql
-- Permitir a cualquier usuario subir imágenes
CREATE POLICY "Cualquier usuario puede subir imágenes"
ON storage.objects FOR INSERT
USING (bucket_id = 'restaurant-images');
```

### Política para actualización y eliminación (cualquier usuario)

```sql
-- Permitir a cualquier usuario actualizar y eliminar imágenes
CREATE POLICY "Cualquier usuario puede actualizar imágenes"
ON storage.objects FOR UPDATE
USING (bucket_id = 'restaurant-images');

CREATE POLICY "Cualquier usuario puede eliminar imágenes"
ON storage.objects FOR DELETE
USING (bucket_id = 'restaurant-images');
```

> **Nota importante**: Estas políticas permiten que cualquier usuario (incluso sin autenticación) pueda subir, actualizar y eliminar imágenes. En un entorno de producción, considera implementar restricciones adicionales según tus necesidades de seguridad.

## 4. Dependencias Necesarias

Asegúrate de tener instalada la dependencia `uuid` para generar nombres únicos para los archivos:

```bash
npm install uuid
npm install @types/uuid --save-dev
```

## 5. Verificación

Una vez completados estos pasos, deberías poder:

1. Subir imágenes desde los formularios de creación y edición de restaurantes
2. Ver las imágenes en la lista de restaurantes
3. Actualizar las imágenes existentes

Las imágenes se almacenarán en el bucket `restaurant-images` y las URLs se guardarán en la columna `image` de la tabla `restaurants`.