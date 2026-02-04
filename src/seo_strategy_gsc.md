# Estrategia de Contenido y SEO basada en GSC (Feb 2026)

Este documento analiza los datos de rendimiento de Google Search Console para optimizar las conversiones y el ranking de **BySMax**.

## 1. Análisis de Moteles (Alta Prioridad)

### Queries Ganadoras:
- `mejores moteles en monterrey` (Posición 2.6, CTR 14.1%)
- `precios de motel [nombre]` (Alto volumen de impresiones, CTR bajo en algunos casos)

### Estrategia de Títulos (Brand + Query):
Para asegurar que el nombre del lugar sea lo primero que vea el usuario (mayor relevancia), usamos el formato:
`[Nombre] | ¿Cuánto cuesta? Precios y Habitaciones 2026`

**Por qué funciona:** Pone la marca por delante para generar confianza inmediata y ataca la duda del costo ("¿Cuánto cuesta?") justo después para maximizar el CTR.

### Foco en Habitaciones:
El usuario busca específicamente ver el interior ("fotos de habitaciones", "motel niu precios"). 
- **Acción:** Asegurar que las secciones en `MotelPageRenderer` tengan etiquetas claras como "Habitación Sencilla", "Habitación con Jacuzzi" con precios visibles.

---

## 2. Análisis de Menús Digitales (Restaurantes)

### Queries Ganadoras:
- `[Nombre Restaurante] menu` (Ej: Campomar, Beluga, La Madalena)
- `[Nombre Restaurante] menu pdf`

### Estrategia de Títulos:
Se ha optimizado el título para incluir palabras clave de alta intención:
`Menú de [Restaurante] | Precios, Fotos y Carta Digital 2026 en [Ciudad]`

**Palabras clave a explotar:** "Carta Digital", "Precios", "Fotos".

### Recomendación de Contenido:
Añadir metadatos de "Precios actualizados" en la descripción para mejorar el CTR frente a archivos PDF viejos que suelen aparecer en Google.

---

## 3. Próximos Pasos (Oportunidades)

1. **Páginas de Estados para Moteles:** Crear carpetas dedicadas para `CDMX`, `Guadalajara` y `Puebla` ya que hay impresiones para estos términos.
2. **Landing "Gratis":** La nueva página `/menu-digital-gratis` debe atacar la keyword `crear menu digital gratis` que tiene una competencia media pero alta conversión.
3. **Internal Linking:** Usar el componente `SEOInternalLinks` para enlazar desde los menús de restaurantes famosos hacia la landing de venta de software (ej: "Crea un menú como el de [Campomar] aquí").
