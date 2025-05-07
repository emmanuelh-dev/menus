# Instrucciones para Implementar la Carga de Imágenes

## Instalación de Dependencias

Para que la funcionalidad de carga de imágenes funcione correctamente, es necesario instalar la dependencia `uuid` que se utiliza para generar nombres únicos para los archivos:

```bash
npm install uuid
npm install @types/uuid --save-dev
```

## Configuración de Supabase

Sigue las instrucciones detalladas en el archivo `MIGRACION_SUPABASE.md` para:

1. Añadir la columna `image` a la tabla `restaurants`
2. Crear y configurar el bucket `restaurant-images` en Supabase Storage
3. Configurar las políticas de seguridad necesarias para permitir que cualquier usuario pueda subir, actualizar y eliminar imágenes

## Funcionalidades Implementadas

1. **Formulario de Creación de Restaurantes**:
   - Campo para subir imágenes
   - Vista previa de la imagen seleccionada
   - Validación de tipo y tamaño de archivo

2. **Formulario de Edición de Restaurantes**:
   - Visualización de la imagen actual
   - Opción para cambiar la imagen
   - Mantenimiento de la imagen existente si no se sube una nueva

3. **Listado de Restaurantes**:
   - Visualización de miniaturas de las imágenes
   - Icono placeholder para restaurantes sin imagen

4. **API de Carga de Imágenes**:
   - Endpoint `/api/upload` para subir imágenes al bucket de Supabase
   - Validación de tipo y tamaño de archivo
   - Generación de nombres únicos para evitar colisiones

## Uso

1. Al crear un nuevo restaurante, puedes subir una imagen opcional
2. Al editar un restaurante, puedes mantener la imagen existente o subir una nueva
3. Las imágenes se muestran en la lista de restaurantes

## Limitaciones

- Tamaño máximo de archivo: 2MB
- Formatos soportados: JPG, PNG, WEBP
- No se requiere autenticación para subir, actualizar o eliminar imágenes (cualquier usuario puede realizar estas operaciones)