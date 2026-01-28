export const prerender = false;

const GEMINI_API_KEY = import.meta.env.GEMINI_API_KEY || import.meta.env.PUBLIC_GEMINI_API_KEY;
const IS_DEVELOP = import.meta.env.DEVELOP === 'true';
const OLLAMA_HOST = 'http://localhost:11434';
const OLLAMA_MODEL = 'deepseek-coder:1.3b';

export interface GeminiResponse {
  semantic_data?: any;
  sections?: any[];
  blocks?: any[];
  new_gallery_images?: any[];
}

export const SYSTEM_PROMPT = (placeType: 'motel' | 'restaurant', currentContent?: any) => `
Eres un experto en gestión de contenido y curador de datos para ${placeType === 'motel' ? 'MOTELES' : 'RESTAURANTES'}. 

TU MISIÓN: Generar el ESTADO FINAL del contenido del lugar. No envíes solo cambios, envía cómo debe quedar el objeto completo tras aplicar las instrucciones o analizar las imágenes.

${currentContent ? `CONTENIDO ACTUAL (Úsalo como base obligatoria):
${JSON.stringify(currentContent)}` : 'No hay contenido previo, genera uno nuevo basado en la entrada.'}

REGLAS DE ORO (CRÍTICAS):
1. CONSERVACIÓN ABSOLUTA Y LIMPIEZA: El "CONTENIDO ACTUAL" es tu base SAGRADA. NUNCA elimines habitaciones o platillos únicos. Sin embargo, DEBES ELIMINAR items que estén duplicados.
2. PRESERVACIÓN DE IMÁGENES:
   - Para imágenes que YA existen, usa "[URL_DE_IMAGEN]".
   - Si se proporcionan nuevas imágenes y se te indica que uses sus URLs de Cloudinary, USALAS en los campos \`image\` de los nuevos items o en la galería.
3. IDs: Mantén los \`id\` de los bloques y de los items exactamente igual.
4. FUSIÓN: Si la entrada tiene información nueva, agrégala.
5. SEMANTIC DATA: La información de contacto va SOLO en \`semantic_data\`.
6. RESILIENCIA: Si la instrucción es vaga, contradictoria o malformada, PRIORIZA mantener el contenido original intacto. No inventes datos que no se te proporcionaron explícitamente.
7. ACTUALIZACIONES PRECISAS: Si el usuario dice algo como "habitacion X ahora cuesta Y", busca ese item exacto y actualiza solo ese valor.

REGLAS DE FORMATO JSON:
{
  "semantic_data": {
    "description": "Redacción elegante y vendedora",
    "address": "Dirección completa",
    "phone": "Teléfonos",
    "whatsapp": "Solo números con lada",
    "reservation_url": "URL",
    "price_range": "Rango de precios",
    "hours": "Horarios",
    "parking": "Info parking",
    "payment_options": ["Efectivo", "Visa"],
    "additional_features": ["WiFi"]
  },
  "blocks": [
    {
      "id": "mantener_id_o_generar_nuevo",
      "type": "section",
      "data": {
        "title": "Nombre sección",
        "items": [
          {
            "id": "mantener_id",
            "name": "Nombre",
            "price": 0,
            "description": "Elegante",
            "features": ["Feature"],
            "image": "URL_O_PLACEHOLDER"
          }
        ]
      }
    }
  ],
  "new_gallery_images": []
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
      const cleanData = base64Image.includes('base64,') 
        ? base64Image.split('base64,')[1] 
        : base64Image;

      const isPdf = base64Image.startsWith('data:application/pdf');

      contents[0].parts.push({
        inline_data: {
          mime_type: isPdf ? "application/pdf" : "image/jpeg",
          data: cleanData
        }
      } as any);
    });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${GEMINI_API_KEY}`,
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

