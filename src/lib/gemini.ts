import { jsonrepair } from 'jsonrepair';

export const prerender = false;

const GEMINI_API_KEY = import.meta.env.GEMINI_API_KEY || import.meta.env.PUBLIC_GEMINI_API_KEY;
const IS_DEVELOP = import.meta.env.DEVELOP === 'true';
const OLLAMA_HOST = 'http://localhost:11434';
const OLLAMA_MODEL = 'deepseek-coder:1.3b';
const GEMINI_MODEL = 'gemini-2.0-flash-lite';

export interface GeminiResponse {
  semantic_data?: any;
  sections?: any[];
  blocks?: any[];
  new_gallery_images?: any[];
  change_summary?: string;
  conversational_response?: string;
  repaired?: boolean;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export const SYSTEM_PROMPT = (placeType: 'motel' | 'restaurant', currentContent?: any) => {
  // Truncar contenido si es muy grande para evitar exceder límites de tokens
  let contentForPrompt = currentContent;
  if (currentContent?.blocks && Array.isArray(currentContent.blocks)) {
    const totalItems = currentContent.blocks.reduce((acc: number, b: any) => acc + (b.data?.items?.length || 0), 0);
    
    // Si hay más de 50 items, truncar para el prompt (la IA aún podrá trabajar con la estructura)
    if (totalItems > 50) {
      contentForPrompt = {
        ...currentContent,
        blocks: currentContent.blocks.map((block: any) => ({
          ...block,
          data: {
            ...block.data,
            items: block.data?.items?.slice(0, 5) || [] // Solo primeros 5 items de cada sección
          }
        }))
      };
      console.log(`⚠️ Content truncated for AI prompt: ${totalItems} items → showing first 5 per section`);
    }
  }

  return `
Eres el ASISTENTE de GESTIÓN DE CONTENIDO de BYSMAX para ${placeType === 'motel' ? 'MOTELES' : 'RESTAURANTES'}.

## TU CAPACIDAD PRINCIPAL:
Puedes MODIFICAR, ELIMINAR, ORDENAR y AGREGAR contenido al menú/catálogo. Cuando el usuario te dé una instrucción, DEBES ejecutarla sobre los datos y devolver el resultado.

## COMANDOS QUE ENTIENDES:

### ELIMINAR:
- "Elimina las habitaciones repetidas" → Buscar items con nombres similares, conservar uno (preferiblemente el más caro o completo)
- "Borra la hamburguesa clásica" → Eliminar ese item del array items
- "Quita la sección de postres" → Eliminar ese bloque completo

### ORDENAR:
- "Ordena de más barato a más caro" → Reordenar items por price ASC
- "Pon las más caras primero" → Reordenar items por price DESC
- "Ordena alfabéticamente" → Reordenar por name ASC

### MODIFICAR:
- "Sube los precios un 10%" → Multiplicar cada price por 1.10
- "Cambia el precio de X a $100" → Actualizar price específico
- "Añade la descripción 'texto' a X" → Actualizar description

### GALERÍA:
- Las imágenes de galería tienen: { src, title, description }
- "Añade descripción a las fotos" → Actualizar description de cada imagen
- "Pon títulos a las imágenes de la galería" → Actualizar title

### AGREGAR (con imágenes):
- Si te paso fotos de menú → Extraer platillos/habitaciones y agregarlos

## CONTENIDO ACTUAL:
${contentForPrompt ? JSON.stringify(contentForPrompt, null, 2) : 'No hay contenido previo.'}

## ESTRUCTURA DE DATOS:

### TIPOS DE BLOQUES:
1. **section**: Sección de menú/catálogo
   { id, type: "section", data: { title, description?, image?, items: [...] } }
   
2. **gallery**: Galería de imágenes
   { id, type: "gallery", data: { images: [{ src, title?, description? }] } }

### ITEMS (platillos/habitaciones):
{ 
  id, 
  name, 
  price, 
  description, 
  image, 
  gallery?: [{ src, title?, description? }],
  options?: [
    { 
      name: "Sabor" | "Extra" | "Término", 
      values: ["Pollo", "Churrasco"], 
      prices?: { "Pollo": 0, "Churrasco": 20 },
      required: boolean,
      max_choices?: number
    }
  ]
}

## OPCIONES E INGREDIENTES:
- **IMPORTANTÍSIMO**: Si ves ingredientes entre paréntesis como "(Jamón, Queso, Piña)" o frases como "(2 ingredientes)", NO los pongas solo en la descripción. DEBES convertirlos a la estructura de \`options\`.
- **OPCIONES GLOBALES/CATEGORÍA**: Si al final de una sección dice "Ingrediente extra: $24", esto aplica a TODOS los items de esa sección. Debes agregar esa opción a cada item individualmente.
- **LISTAS DE ELECCIÓN**: Si una categoría dice "Ingredientes a elegir: Jamón, Piña..." y los items dicen "(2 ingredientes)", crea la opción de "Ingredientes" con esa lista de valores y \`max_choices: 2\` en CADA item.
- Si el menú dice "Individual (2 ingredientes)", crea una opción con name: "Ingredientes", values: ["Jamón", "Piña", ...], max_choices: 2.
- Si los ingredientes ya vienen fijos pero son configurables (ej: puedes quitar cebolla), ponlos en \`options\` para que el usuario pueda verlos como selecciones.
- Si el menú dice "Extra huevo +$15", agrégalo en options con name "Extras", values ["Huevo"] y prices { "Huevo": 15 }.
- Si hay sabores/variantes, agrégalo con prices si tienen costo adicional.

## EJEMPLO DE ESTRUCTURA CORRECTA (JSON):
{
  "name": "Chilaquiles con huevo",
  "price": 85,
  "description": "Chilaquiles verdes con queso gratinado. Agrégale huevo por $15 extra.",
  "options": [
    {
      "name": "Extras",
      "values": ["Sin huevo", "1 pza huevo", "2 pzas huevos"],
      "prices": { "Sin huevo": 0, "1 pza huevo": 15, "2 pzas huevos": 30 },
      "required": true
    },
    {
      "name": "Ingredientes a quitar",
      "values": ["Cebolla", "Crema"],
      "required": false,
      "max_choices": 2
    }
  ]
}

## REGLAS CRÍTICAS:

1. **EJECUTA LA ACCIÓN**: Cuando el usuario pida eliminar/ordenar/modificar, HAZLO en los datos y devuelve el resultado.

2. **PRESERVA IDs**: Mantén los IDs existentes. Para nuevos items usa "new-item-1", "new-item-2", etc.

3. **IMÁGENES - MUY IMPORTANTE**:
   - Si una imagen ya tiene URL (empieza con "http" o "https"), COPIA ESA URL EXACTA, no la modifiques
   - NUNCA uses "[URL_DE_IMAGEN]" como valor literal - eso es solo documentación
   - Si el usuario pide duplicar/copiar imágenes, usa las URLs reales del contenido existente
   - Solo deja el campo "image" vacío ("") si no hay imagen disponible

4. **change_summary OBLIGATORIO**: Lista EXACTAMENTE qué hiciste:
   - ✅ "Eliminadas 2 habitaciones: 'Junior Suite' ($500), 'Sencilla' ($300). Ordenadas 8 habitaciones por precio ascendente."
   - ❌ "Actualicé las habitaciones" (MUY GENÉRICO, PROHIBIDO)

## FORMATO DE RESPUESTA (JSON):
{
  "semantic_data": { /* datos del lugar: address, phone, hours, etc */ },
  "blocks": [ /* ARRAY CON LOS BLOQUES MODIFICADOS */ ],
  "new_gallery_images": [{ "url": "...", "title": "...", "description": "..." }],
  "change_summary": "DESCRIPCIÓN ESPECÍFICA de cambios con nombres y precios",
  "conversational_response": "Mensaje amigable confirmando la acción"
}

IMPORTANTE: SIEMPRE devuelve JSON válido. El campo "blocks" debe contener TODOS los bloques (modificados o no).
`;
};

async function callOllama(
  placeType: 'motel' | 'restaurant',
  instruction: string,
  images?: string[],
  currentContent?: any
): Promise<GeminiResponse | null> {
  const prompt = SYSTEM_PROMPT(placeType, currentContent) + `\n\nINSTRUCCIÓN DEL USUARIO: ${instruction}`;
  
  const cleanImages = images?.map(img => {
    return img.includes('base64,') ? img.split('base64,')[1] : img;
  }) || [];

  try {
    const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        images: cleanImages,
        stream: false,
        format: 'json'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ollama Error:', errorText);
      return null;
    }

    const result = await response.json();
    const textResponse = result.response;

    if (!textResponse) return null;

    return JSON.parse(textResponse.trim());
  } catch (err) {
    console.error('Error callOllama:', err);
    return null;
  }
}

export async function callGemini(
  placeType: 'motel' | 'restaurant',
  instruction: string,
  images?: string[],
  currentContent?: any,
  imageUrlMapping?: string[]
): Promise<GeminiResponse | null> {
  if (IS_DEVELOP) {
    return callOllama(placeType, instruction, images, currentContent);
  }

  const prompt = SYSTEM_PROMPT(placeType, currentContent);
  
  let finalInstruction = `INSTRUCCIÓN DEL USUARIO: ${instruction}`;
  if (imageUrlMapping && imageUrlMapping.length > 0) {
    finalInstruction += `\n\nIMÁGENES NUEVAS SUBIDAS (Usa estas URLs si corresponden):`;
    imageUrlMapping.forEach((url, i) => {
      finalInstruction += `\n- Imagen ${i+1}: ${url}`;
    });
  }

  const contents = [
    {
      parts: [
        { text: prompt },
        { text: finalInstruction }
      ]
    }
  ];

  if (images && images.length > 0) {
    images.forEach(base64Image => {
      const parts = base64Image.split(';base64,');
      let mimeType = "image/jpeg";
      let cleanData = base64Image;

      if (parts.length === 2) {
        mimeType = parts[0].replace('data:', '');
        cleanData = parts[1];
      }

      contents[0].parts.push({
        inline_data: {
          mime_type: mimeType,
          data: cleanData
        }
      } as any);
    });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents,
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.1,
            topP: 0.95,
          }
        }),
        signal: AbortSignal.timeout(60000)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      return null;
    }

    const result = await response.json();
    const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      console.error('Gemini returned no text response. Full result:', JSON.stringify(result, null, 2));
      return null;
    }

    try {
      let cleanJson = textResponse;
      const jsonBlockMatch = textResponse.match(/```json\n?([\s\S]*?)\n?```/) || textResponse.match(/```\n?([\s\S]*?)\n?```/);
      if (jsonBlockMatch) {
        cleanJson = jsonBlockMatch[1];
      } else {
        const start = textResponse.indexOf('{');
        const end = textResponse.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          cleanJson = textResponse.substring(start, end + 1);
        }
      }

      let parsed: any;
      let wasRepaired = false;
      try {
        parsed = JSON.parse(cleanJson.trim());
      } catch (e) {
        console.warn('⚠️ Standard JSON.parse failed, attempting jsonrepair...');
        try {
          const repaired = jsonrepair(cleanJson.trim());
          parsed = JSON.parse(repaired);
          wasRepaired = true;
          console.log('✅ JSON successfully repaired');
        } catch (repairError) {
          console.error('❌ json-repair also failed:', repairError);
          throw e; // Rethrow original error if repair fails
        }
      }

      console.log('✓ Gemini response parsed successfully. Change summary:', parsed.change_summary || 'None');
      
      return {
        ...parsed,
        repaired: wasRepaired,
        usageMetadata: result.usageMetadata
      };
    } catch (err) {
      console.error('Error parsing Gemini JSON. Raw response:', textResponse);
      console.error('Parse error:', err);
      return null;
    }
  } catch (err) {
    console.error('Error callGemini:', err);
    return null;
  }
}

