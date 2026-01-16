export const prerender = false;

const GEMINI_API_KEY = import.meta.env.GEMINI_API_KEY || import.meta.env.PUBLIC_GEMINI_API_KEY;

export interface GeminiResponse {
  semantic_data?: any;
  sections?: any[];
  blocks?: any[];
}

export const SYSTEM_PROMPT = (placeType: 'motel' | 'restaurant', currentContent?: any) => `
Eres un experto en gestión de contenido y curador de datos para ${placeType === 'motel' ? 'MOTELES' : 'RESTAURANTES'}. 

TU MISIÓN: Generar el ESTADO FINAL del contenido del lugar. No envíes solo cambios, envía cómo debe quedar el objeto completo tras aplicar las instrucciones o analizar las imágenes.

${currentContent ? `CONTENIDO ACTUAL (Úsalo como base obligatoria):
${JSON.stringify(currentContent)}` : 'No hay contenido previo, genera uno nuevo basado en la entrada.'}

REGLAS DE ORO (CRÍTICAS):
1. CONSERVACIÓN ABSOLUTA Y LIMPIEZA: El "CONTENIDO ACTUAL" es tu base SAGRADA para lo único. NUNCA elimines habitaciones o platillos únicos. Sin embargo, DEBES ELIMINAR items que estén duplicados (mismo nombre o contenido idéntico). Si el usuario dice "fix it" o "mejorar", mantén todos los items originales pero limpia las duplicidades para dejar un catálogo único y profesional.
2. PRESERVACIÓN DE IMÁGENES: Para CUALQUIER imagen que YA exista en el contenido actual, DEBES usar el marcador "[URL_DE_IMAGEN]" en el campo \`image\`. Para galerías usa \`{"url": "[URL]"}\`. NO inventes URLs.
3. IDs: Mantén los \`id\` de los bloques y de los items (\`id\`) exactamente igual a como vienen en el "CONTENIDO ACTUAL". Esto es crítico para no perder fotos.
4. FUSIÓN: Si la entrada tiene información nueva, agrégala. Si no menciona algo que ya existe, MANTENLO igual. NO asumas que lo omitido ya no existe.
5. SEMANTIC DATA: La información de contacto (Teléfono, Dirección, WhatsApp) va SOLO en \`semantic_data\`. NUNCA en bloques de texto.

REGLAS DE FORMATO JSON (Responde solo con este objeto COMPLETO):
{
  "semantic_data": {
    "description": "Redacción elegante y vendedora",
    "address": "Dirección completa",
    "phone": "Teléfonos (pueden ser varios separados por coma)",
    "whatsapp": "Solo números con lada, ej: 528112345678",
    "reservation_url": "URL si aplica",
    "price_range": "Ej: MXN450 - MXN1500",
    "hours": "Horarios detallados",
    "parking": "Info de estacionamiento",
    "payment_options": ["Efectivo", "Visa", "Mastercard"],
    "additional_features": ["WiFi", "Clima", "Estacionamiento"],
    "new_gallery_images": []
  },
  "blocks": [
    {
      "id": "mantener_id_si_existe_o_generar_nuevo",
      "type": "section",
      "data": {
        "title": "Nombre de la sección (ej: Habitaciones)",
        "items": [
          {
            "id": "mantener_id_si_existe",
            "name": "Nombre item",
            "price": 150.00,
            "description": "Descripción detallada y elegante",
            "features": ["Jacuzzi", "Smart TV"],
            "image": "[URL_DE_IMAGEN] o vacío"
          }
        ]
      }
    }
  ]
}

INSTRUCCIONES ESPECÍFICAS:
1. MOTELES: Los items son tipos de habitación. Asegura que cada uno tenga sus features (Jacuzzi, Vapor, etc.).
2. RESTAURANTES: Los items son platillos con descripción y precio.
3. Si el usuario pega texto de una página web, ignora avisos legales, publicidad o menús de navegación del sitio original. Solo extrae la esencia del lugar.

SIEMPRE responde ÚNICAMENTE con un objeto JSON estrictamente válido. NO uses bloques de código con triple backtick. Empieza directamente con { y termina con }. Si no puedes procesar algo, devuelve el JSON actual sin cambios.
`;

export async function callGemini(
  placeType: 'motel' | 'restaurant',
  instruction: string,
  images?: string[], // Soportar múltiples imágenes
  currentContent?: any
): Promise<GeminiResponse | null> {
  const prompt = SYSTEM_PROMPT(placeType, currentContent);
  
  const contents = [
    {
      parts: [
        { text: prompt },
        { text: `INSTRUCCIÓN DEL USUARIO: ${instruction}` }
      ]
    }
  ];

  if (images && images.length > 0) {
    images.forEach(base64Image => {
      // Si el string ya tiene el prefijo de data:, lo limpiamos
      const cleanData = base64Image.includes('base64,') 
        ? base64Image.split('base64,')[1] 
        : base64Image;

      // Detectar si es PDF o Imagen (simplificado)
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
        signal: AbortSignal.timeout(60000) // 60 segundos de timeout
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      return null;
    }

    const result = await response.json();
    
    // LOG DE SEGURIDAD PARA DEBUG
    console.log('--- GEMINI RAW RESPONSE START ---');
    console.log(JSON.stringify(result, null, 2).substring(0, 1000));
    console.log('--- GEMINI RAW RESPONSE END ---');

    if (result.error) {
      console.error('Gemini API Error Object:', result.error);
      return null;
    }

    const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      console.warn('Gemini Success but No Text in Candidates. Finish Reason:', result.candidates?.[0]?.finishReason);
      return null;
    }

    // Limpiar posible markdown y extraer solo el objeto JSON { ... }
    try {
      let cleanJson = textResponse;
      
      // Si hay bloques de código markdown, extraer el contenido
      const jsonBlockMatch = textResponse.match(/```json\n?([\s\S]*?)\n?```/) || textResponse.match(/```\n?([\s\S]*?)\n?```/);
      if (jsonBlockMatch) {
        cleanJson = jsonBlockMatch[1];
      } else {
        // Buscar el primer { y el último } para aislar el JSON si no hay bloques de código
        const start = textResponse.indexOf('{');
        const end = textResponse.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          cleanJson = textResponse.substring(start, end + 1);
        }
      }

      return JSON.parse(cleanJson.trim());
    } catch (err) {
      console.error('Error parsing Gemini JSON:', err, 'Raw response:', textResponse);
      return null;
    }
  } catch (err) {
    console.error('Error callGemini:', err);
    return null;
  }
}
