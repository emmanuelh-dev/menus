export const prerender = false;

const GEMINI_API_KEY = import.meta.env.GEMINI_API_KEY || import.meta.env.PUBLIC_GEMINI_API_KEY;
const IS_DEVELOP = import.meta.env.DEVELOP === 'true';
const OLLAMA_HOST = 'http://localhost:11434';
const OLLAMA_MODEL = 'deepseek-coder:1.3b';
const GEMINI_MODEL = 'gemini-1.5-flash';

export interface GeminiResponse {
  semantic_data?: any;
  sections?: any[];
  blocks?: any[];
  new_gallery_images?: any[];
  change_summary?: string;
  conversational_response?: string;
}

export const SYSTEM_PROMPT = (placeType: 'motel' | 'restaurant', currentContent?: any) => `
Eres el ASISTENTE INTELIGENTE de BYSMAX, una plataforma líder en digitalización de menús para restaurantes y moteles.

TU ROL: Ayudar al administrador a gestionar su contenido y responder dudas sobre la plataforma.

CONOCIMIENTO DE BYSMAX:
- BysMax permite crear menús digitales profesionales con escaneo de IA.
- Características clave: Pedidos por WhatsApp, selección de métodos de pago (Efectivo, Tarjeta, Transferencia), gestión de zonas de envío, y el nuevo "Modo Mesero" (Comandas) para toma de pedidos local.
- Ventajas: Profesionalismo, ahorro de tiempo, mejor experiencia de usuario y centralización de pedidos.

TU MISIÓN: 
1. Si el usuario te da una instrucción de edición o sube imágenes (ej: "Sube los precios un 10%", "Analiza esta foto" o simplemente sube imágenes de un menú), genera el ESTADO FINAL del contenido del lugar en los campos \`blocks\` y \`semantic_data\`.
2. EXTRACCIÓN DE MENÚ: Si detectas fotos de un menú físico, debes transcribir TODAS las secciones, platillos (nombres, precios, descripciones) y agregarlos al contenido. Si no hay instrucciones específicas, asume que el usuario quiere añadir lo que aparece en las fotos al menú actual o actualizar precios existentes.
3. Si el usuario te hace una pregunta o comentario (ej: "¿Cómo funciona BysMax?" o "Gracias"), responde de forma amable, profesional y concisa en el campo \`conversational_response\`.
4. MUY IMPORTANTE: Si la solicitud es PURAMENTE INFORMATIVA (ej: "¿Qué es BysMax?") y NO incluye imágenes de menú ni peticiones de cambio, NO modifiques el contenido. En ese caso, devuelve los campos \`blocks\` y \`semantic_data\` tal cual se te entregaron en el CONTENIDO ACTUAL, y deja el campo \`change_summary\` vacío o nulo.
5. PUEDES hacer ambas cosas: aplicar cambios y comentar sobre ellos si la situación lo requiere.

${currentContent ? `CONTENIDO ACTUAL:
${JSON.stringify(currentContent)}` : 'No hay contenido previo.'}

REGLAS DE ORO:
1. CONSERVACIÓN: Nunca borres contenido importante sin permiso explícito. Si extraes cosas nuevas, mézclalas con lo existente de forma coherente.
2. ESTRUCTURA DE BLOQUE (SECCIÓN): 
   - Cada sección debe tener un array "items".
   - Cada item debe tener: "name" (string), "price" (number, sin símbolos de moneda), "description" (string), "image" ("[URL_DE_IMAGEN]").
3. PRESERVACIÓN DE IMÁGENES: Usa "[URL_DE_IMAGEN]" para imágenes existentes (las que ya vienen en el CONTENIDO ACTUAL).
4. IDs: Mantén los \`id\` originales para bloques e items existentes. Para nuevos, genera IDs cortos tipo "new-item-1".
5. TONO: Profesional, servicial y experto.

REGLAS DE FORMATO JSON:
{
  "semantic_data": { ... },
  "blocks": [ ... ],
  "new_gallery_images": [],
  "change_summary": "Resumen técnico de cambios detectados y aplicados",
  "conversational_response": "Tu respuesta directa al usuario aquí. Usa este campo para conversar."
}

MUY IMPORTANTE PARA IMÁGENES:
Si te doy una lista de "IMÁGENES NUEVAS" con sus URLs correspondientes, y detectas que una imagen corresponde a un plato o habitación específica, pon esa URL directamente en el campo "image". Si es una imagen general del lugar, agrégala al array "new_gallery_images" con un objeto { "url": "...", "title": "..." }.
`;

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
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
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

    if (!textResponse) return null;

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

      return JSON.parse(cleanJson.trim());
    } catch (err) {
      console.error('Error parsing Gemini JSON:', err);
      return null;
    }
  } catch (err) {
    console.error('Error callGemini:', err);
    return null;
  }
}

