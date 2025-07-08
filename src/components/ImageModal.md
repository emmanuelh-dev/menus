# ImageModal Component

Un componente reutilizable para mostrar imágenes en un modal con funcionalidades completas.

## Características

- Modal completamente funcional con overlay
- Soporte para títulos de imagen
- Cierre con botón X, click fuera del modal o tecla Escape
- API JavaScript para control programático
- Múltiples instancias en la misma página
- Callbacks para eventos de apertura y cierre

## Uso Básico

### 1. Importar el componente

```astro
---
import ImageModal from './ImageModal.astro';
---
```

### 2. Incluir en tu template

```astro
<!-- Modal básico -->
<ImageModal />

<!-- Modal con ID personalizado -->
<ImageModal id="miModal" />

<!-- Modal con clases adicionales -->
<ImageModal id="miModal" className="custom-modal-class" />
```

### 3. Inicializar en JavaScript

```javascript
// Crear instancia del modal
const imageModal = createImageModal({
  modalId: 'miModal', // opcional, por defecto 'imageModal'
  onOpen: () => console.log('Modal abierto'),
  onClose: () => console.log('Modal cerrado')
});
```

## Métodos de la API

### `open(imageSrc, imageAlt, title)`
Abre el modal con una imagen específica.

```javascript
imageModal.open('/ruta/imagen.jpg', 'Alt text', 'Título opcional');
```

### `close()`
Cierra el modal.

```javascript
imageModal.close();
```

### `attachToElements(selector)`
Adjunta eventos de click a elementos para abrir el modal automáticamente.

```javascript
// Busca imágenes dentro de los elementos y las abre en el modal
imageModal.attachToElements('.gallery-item');
```

### `destroy()`
Limpia los event listeners (para cuando el componente se desmonta).

```javascript
imageModal.destroy();
```

## Formas de usar el modal

### Opción 1: Adjuntar a elementos automáticamente

```html
<div class="gallery-item">
  <img src="/imagen1.jpg" alt="Imagen 1" />
  <p data-image-title>Título de la imagen</p>
</div>

<script>
  const modal = createImageModal();
  modal.attachToElements('.gallery-item');
</script>
```

### Opción 2: Control manual con botones

```html
<button id="openBtn">Abrir imagen</button>

<script>
  const modal = createImageModal();
  document.getElementById('openBtn').addEventListener('click', () => {
    modal.open('/imagen.jpg', 'Alt text', 'Título');
  });
</script>
```

### Opción 3: Uso en Gallery.astro

```astro
---
import ImageModal from './ImageModal.astro';
---

<div class="gallery">
  <!-- contenido de la galería -->
</div>

<ImageModal id="galleryModal" />

<script>
  const modal = createImageModal({ modalId: 'galleryModal' });
  modal.attachToElements('.gallery > div');
</script>
```

## Atributos de datos especiales

- `data-image-title`: El elemento con este atributo será usado como título en el modal
- Los elementos clickeables deben contener una imagen (`<img>`) para que funcione `attachToElements`

## Configuración de eventos

```javascript
const modal = createImageModal({
  modalId: 'miModal',
  onOpen: () => {
    console.log('Modal abierto');
    // Tu código aquí
  },
  onClose: () => {
    console.log('Modal cerrado');
    // Tu código aquí
  }
});
```

## Múltiples modales en la misma página

```astro
<ImageModal id="modal1" />
<ImageModal id="modal2" />

<script>
  const modal1 = createImageModal({ modalId: 'modal1' });
  const modal2 = createImageModal({ modalId: 'modal2' });
</script>
```

## Personalización de estilos

Puedes personalizar los estilos del modal pasando clases CSS:

```astro
<ImageModal 
  id="customModal" 
  className="custom-z-index bg-blue-900/90" 
/>
```

O sobrescribir los estilos CSS por defecto en tu archivo de estilos.
