# Guía del Scraper y Crawler (mxmenu.net)

He optimizado el sistema para ignorar spam (casinos, apuestas) y extraer contenido de mejor calidad, incluyendo posts de blog y artículos informativos.

## 1. Cómo correr el Crawler

Para obtener **TODOS** los menús y posts reales, lo mejor es usar el Sitemap Index:

```bash
bun scripts/crawl-mxmenu.js https://mxmenu.net/sitemap_index.xml
```

También puedes correr categorías específicas (ahora soporta paginación automática):

```bash
bun scripts/crawl-mxmenu.js https://mxmenu.net/category/comida-mexicana/
```

O un post individual:

```bash
bun scripts/crawl-mxmenu.js https://mxmenu.net/tacos-el-pastor-menu-precios/
```

### Filtros Automáticos
- **Spam**: El script ignora automáticamente URLs que contienen palabras como `casino`, `bet`, `poker`, `slot`, etc.
- **Calidad**: Si un post no tiene precios pero tiene mucho texto (como "Dieta Keto"), se clasifica automáticamente como un `post` informativo.
- **Limpieza**: Se eliminan caracteres extraños y emojis de los nombres de los establecimientos.

---

## 2. Nuevos Bloques de Contenido

He añadido soporte para **Markdown** y **Texto Largo**. Esto es ideal para:
- Horarios de apertura detallados.
- Listas de sucursales.
- Artículos de blog o descripciones extensas.

### En el Panel de Administración:
- Ahora puedes agregar un bloque de **"Texto/Markdown"**.
- Puedes usar formato Markdown (`**negrita**`, `# Títulos`, `* Listas`).

---

## 3. Limpieza de Spam Manual

Si el crawler llega a filtrar algún casino o post irrelevante, he añadido una herramienta rápida:

1. Ve al **Admin Dashboard**.
2. Al lado de cada establecimiento verás un icono de **Basura (Trash)**.
3. Haz clic para eliminar permanentemente el registro de la base de datos (con confirmación).

Esto te permitirá mantener tu base de datos limpia de "casinos" de forma fácil.

---

## 4. Mejoras Técnicas
- **Breadcrumbs**: Mejorado para manejar posts de blog.
- **Galerías**: Soporte mejorado para detectar imágenes dentro de los artículos.
- **Precios**: Si los precios son detectados pero parecen erróneos (como "xs"), el sistema intentará rescatar la información como texto descriptivo.
