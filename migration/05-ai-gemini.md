# 05 · Asistente IA (Gemini)

Port de `app/api/ai/update-content/route.ts` (530 líneas) + `lib/ai/gemini.ts` (419 líneas). Es el endpoint más complejo; el resto del sistema no depende de él, así que es la **última fase funcional**.

## `POST /api/ai/update-content`

### Request
```json
{
  "placeId": 123,
  "instruction": "texto libre del usuario (menú pegado, foto descrita, etc.)",
  "images": ["data:image/...;base64,..." | "https://..."],
  "currentContent": Content | null,
  "preview": true | false,
  "saveOnly": true | false
}
```

### Flujo (replicar exacto)

1. **Validación**: `placeId` requerido (400). Cargar `places.user_id, content, type`; `isOwner = dueño || admin`.
2. **Límite mensual $20 MXN** (si hay user y no es saveOnly): sumar costos del mes parseando `version_label LIKE 'AI_GEN:%'` con regex `cost:([0-9.]+)` en `place_content_history` de los lugares del usuario. Si ≥ 20 → **429** con el mensaje exacto del original.
3. **Modo saveOnly** (`saveOnly && currentContent`): requiere isOwner (403). Sanitiza, guarda el contenido *anterior* en historial (`source: 'admin_editor'`, `version_label: 'AI_CONFIRM: <ISO>'`), hace update de `places.content`, responde `{success, content, stats}`.
4. **Modo normal/preview**: carga place completo; `currentContent = providedContent || place.content || {blocks:[], semantic_data:{}, view_settings:{layout:'grid',show_prices:true}}`.
5. **stripImagesFromContent**: reemplaza URLs de imágenes por placeholders (`__IMG_n__`) antes del prompt (ahorra tokens); tabla de mapeo para restaurar después. Port de `lib/ai/gemini.ts`.
6. **SYSTEM_PROMPT(placeType, cleanContent)**: `placeType = 'motel' si type=='motel' sino 'restaurant'`. **Copiar el prompt literal** de `lib/ai/gemini.ts` — no reescribirlo ni "mejorarlo".
7. **preprocessInstruction**: une líneas producto/precio (`Un Pollo Loco\n$283` → una línea), filtra headings bloqueados. Port literal.
8. **Llamada a Gemini**: REST `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=...` con:
   - `systemInstruction` = SYSTEM_PROMPT
   - `contents` = texto + imágenes (base64 inline como `inlineData`, URLs http descargadas y convertidas a inlineData — la SDK de Vercel lo hacía solo; en Go hay que fetchear la URL)
   - `generationConfig.responseMimeType: "application/json"` + `responseSchema` equivalente al zod `aiResponseSchema`:
     ```
     { semantic_data?: object, blocks: Block[], new_gallery_images?: [{url,title?,description?}],
       change_summary: string, conversational_response: string }
     ```
     Los `Block` son unión discriminada por `type` (section|menu_image|gallery|text|markdown|image|carrusel) — en el schema de Gemini modelarlo como objeto con `data` que incluye todos los campos posibles (el truco anotado en el original: `z.any()` produce `data:null`; el schema debe ser explícito).
9. **restoreImageUrls**: sustituir placeholders `__IMG_n__` por las URLs reales.
10. **Normalización**: todo bloque con `id` (generar `block-<ts>-<rand>` si falta); sections con `items:[]` garantizado y cada item con `id` (`item-<ts>-<rand>`).
11. **new_gallery_images** → append a `content.gallery` (dedupe por url, `id: img-<ts>-<rand>`).
12. **sanitizeUnsupportedContent**: port de `lib/ai/gemini.ts` (limpia tipos de bloque no soportados / campos basura).
13. **Stats**: `{sections, items, options, hasAddress, hasPhone, newImages, change_summary}` con las cuentas del original.
14. **contentChanged** (deep compare blocks + semantic_data) → `isPurelyConversational` si no cambió y no hay change_summary.
15. **Costo**: `calculateCostMXN(inputTokens, outputTokens)` — copiar tarifas exactas de `lib/ai/gemini.ts`.
16. **Historial SIEMPRE** (incluso preview): guarda `currentContent` (el anterior) con `source: providedContent ? 'admin_editor' : 'quick_feed_request'` y `version_label: 'AI_GEN: cost:<x.xxxx> | <resumen 50 chars>'`. ⚠️ El límite mensual depende de este formato de label: no cambiarlo.
17. **Respuesta**:
    - preview: `{success:true, preview:bool, stats|null, conversational_response, content, usage:{promptTokenCount,candidatesTokenCount,totalTokenCount}}`
    - normal: update de `places.content` + `{success:true, stats, conversational_response, content, usage}`
    - error: `{error: msg}` 500.

### Notas Go
- Los tokens de uso vienen en `usageMetadata.promptTokenCount/candidatesTokenCount` de la respuesta REST de Gemini.
- Timeout HTTP generoso (60-120s) solo para este handler.
- `preview` no autentica ownership en el original antes de llamar a Gemini (solo saveOnly lo exige)… pero **sí** cobra el límite al usuario logueado. Mantener paridad y anotar para F9.

## `POST /api/ai/rollback`

Port de `app/api/ai/rollback/route.ts` (86 líneas), directo:

Request: `{"placeId": n, "historyId": "<uuid>"}` (400 si falta alguno).
1. Auth requerida (401). Ownership del place o admin (403).
2. Cargar `place_content_history.content` por `id + place_id` (404 `Versión histórica no encontrada`).
3. Insertar historial del estado actual (`source:'admin_rollback'`, `agent_reasoning: 'Rollback manual a versión <id>'`, `version_label:'Rollback'`).
4. Update `places.content` con el contenido histórico.
5. Respuesta: ver final del route.ts (devuelve success + content restaurado).

## `GET /api/admin/history` (página History)

`app/(dashboard)/admin/history/page.tsx` lee el historial — verificar en implementación si consulta Supabase directo desde el server component; si es así, exponer `GET /api/history?place_id=&page=` en Go con el listado de `place_content_history` (ownership aplicada) y cambiar la página a fetch. Contrato mínimo: `{"history":[{id,place_id,created_at,source,agent_reasoning,version_label}...]}` sin el campo `content` (pesado); `GET /api/history/{id}` para el detalle.
