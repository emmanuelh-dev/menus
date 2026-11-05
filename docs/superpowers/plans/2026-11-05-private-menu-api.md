# Acceso privado a la API de menús

Objetivo autorizado: cerrar la descarga directa de fichas/listados y adaptar los consumidores antes de publicar. El HTML seguirá siendo público.

Diseño: `GO_MENU_API_KEY` privada, enviada en `X-Menu-API-Key` sólo desde servidores/scripts. Go verifica en tiempo constante y rechaza todas las solicitudes a `/api/public/places` y sus descendientes sin clave, incluidos HEAD y OPTIONS. Si falta la configuración, falla cerrado. Si viene Origin, sólo acepta `https://menus.bysmax.com` y `https://www.menusdigitalesmonterrey.com`. No se confía en Origin como autenticación. Se conservan los métodos GET autenticados entre servidores y los contratos de datos.

Alternativas descartadas: CORS solo o cambiar a POST no autentican; dar una clave al navegador la expondría. No tocar precios, pedidos, zonas ni visitas.

Plan (ejecución en esta sesión):
- [x] Go: prueba negativa/positiva del middleware, configuración, bloqueo anterior a CORS y documentación. `go test ./...`, `go vet ./...`, `go build ./...`.
- [x] Astro: secreto runtime mediante `astro:env/server`, adaptar ambas lecturas de `src/lib/api.ts` y scripts lectores. Build y `astro check`; comprobar que ningún asset cliente contiene el secreto.
- [x] Panel: secreto servidor en `goFetch`, conservar cookie/sesión; build y lint.
- [ ] Publicación: configurar secretos de runtime/build en Cloudflare antes del bloqueo. Publicar Go en candidato blue-green; comprobar clave correcta/incorrecta, Origin falsificado, ambos sitios y panel. Cambiar tráfico sólo con consumidores preparados. Push de los tres repositorios y confirmar despliegues automáticos.
- [ ] Registrar resultados y pendientes en HANDOFF sin incluir cambios previos ajenos.

Riesgos a verificar: ausencia de clave, origen no autorizado con clave válida, HEAD/OPTIONS, prefijos parecidos y rutas ajenas, prerender/build sin secreto, falsos 200 con listados vacíos, exposición de secreto en cliente, orden de activación.

Resultados locales: Go test/vet/build correctos; 19 casos de middleware. Astro build contra candidato protegido y build de producción correctos; build con clave inválida falla como corresponde; astro check sin errores ni warnings. Prueba de lector interno pasa. Panel build y lint de archivos tocados correctos; lint global conserva 157 errores y 93 warnings heredados. Worker local consulta catálogo protegido y devuelve contenido en ficha, listado, tienda, manifest y sitemap. Panel local rechaza cookies ausentes/inventadas y acepta sesión real temporal (eliminada al terminar). Clave ausente de todos los artefactos Astro y assets cliente Next.

Publicación parcial: Go 9fc739c en origin/main, candidato menus-api-private-9fc739c en 127.0.0.1:8094 validado con DB real. Tráfico todavía a menus-api-users-6fa9164 en 8093. No cambiar proxy hasta confirmar secretos y despliegues frontend. Usuario configura secretos manualmente en Cloudflare; no hay credencial CF en este entorno.
