# Estado de la Migración

## Fase 9 (F9) · API Pública en Astro (Moteles)
- **Estado**: ✅ Completado (2026-07-16)
- **Descripción**: Migración de las 5 páginas públicas de moteles en Astro para consumir el backend de Go en lugar de Supabase directo.
- **Páginas migradas**:
  - `src/pages/moteles/index.astro`
  - `src/pages/moteles/estados/index.astro`
  - `src/pages/moteles/estados/[state]/index.astro`
  - `src/pages/moteles/estados/[state]/[name]/index.astro`
  - `src/pages/moteles/[name]/index.astro`
- **Cambios realizados**:
  - Implementación del nuevo cliente fetch tipado `src/lib/api.ts` con soporte para endpoints públicos de Go (lugares por tipo, estados, municipios, detalle de lugar por slug y reseñas).
  - Creación del endpoint `GET /api/public/reviews` en el servidor Go para obtener el listado de reseñas de un lugar específico de manera pública.
  - Actualización de las llamadas directas de Supabase a la nueva API de Go en las 5 páginas de moteles.
  - Pruebas de compilación exitosas con `astro check`.
