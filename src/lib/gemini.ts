export const prerender = false;

const GEMINI_API_KEY = import.meta.env.GEMINI_API_KEY || import.meta.env.PUBLIC_GEMINI_API_KEY;

export interface GeminiResponse {
  semantic_data?: any;
  sections?: any[];
  blocks?: any[];
}

export const SYSTEM_PROMPT = (placeType: 'motel' | 'restaurant', currentContent?: any) => `
Eres un experto en gestión de contenido y curador de datos para ${placeType === 'motel' ? 'MOTELES' : 'RESTAURANTES'}. 

TU MISIÓN: Actualizar la información del lugar basándote en nuevas entradas, manteniendo la consistencia y evitando cambios destructivos o malintencionados.

${currentContent ? `CONTENIDO ACTUAL (Úsalo como base):
${JSON.stringify(currentContent, null, 2)}` : 'No hay contenido previo, genera uno nuevo basado en la entrada.'}

REGLAS CRÍTICAS DE SEGURIDAD Y CALIDAD:
1. CONSERVACIÓN: Si la entrada es ambigua o parece spam, mantén el contenido actual.
2. VALIDACIÓN: No permitas descripciones ofensivas, números de teléfono falsos o cambios que degraden la calidad del menú.
3. FUSIÓN Y NORMALIZACIÓN INTELIGENTE: 
   - Si se sube una imagen, añade los nuevos platillos/habitaciones pero NO borres los existentes a menos que la imagen sea claramente una actualización completa del menú.
   - Si la instrucción es "normalizar", "mejorar" o "redactar" descripciones: Usa el nombre del item, sus features y el contexto del lugar para generar descripciones atractivas, elegantes y consistentes (ej: "Disfruta de nuestra Suite con Jacuzzi, ideal para momentos especiales..."). No inventes servicios que no estén listados, solo dales mejor redacción.
   - DETALLE DE HABITACIONES: Si el texto indica duraciones (ej: 6hrs, 12hrs) o distribuciones por piso, INCLUYE esa información obligatoriamente en la descripción del item de forma organizada.
   - DATOS DEL LUGAR: Si hay varios números o redes sociales, concaténalos en los campos correspondientes.
   - Si la instrucción pide "simplificar", hazlo con elegancia sin perder la información clave (precios, features).
4. PRECIOS: Los precios deben ser numéricos. Si no hay, usa 0.
5. FEATURES: Mantén las etiquetas estándar del sistema (Jacuzzi, WiFi, Clima, etc.).
6. MOTELES (CRÍTICO): Las "features" son vitales. Siempre incluye Jacuzzi, Cochera, TV, WiFi, etc., en la lista de features de cada habitación si el usuario lo menciona o si la imagen lo muestra.

REGLAS DE FORMATO JSON (Responde solo con esto):
{
  "semantic_data": {
    "description": "Una o dos líneas",
    "address": "Dirección completa",
    "phone": "Teléfono",
    "whatsapp": "Número de WhatsApp (sólo números, ej: 528112345678)",
    "reservation_url": "URL de reservaciones si existe",
    "price_range": "Ej: MXN100-300",
    "hours": "Horarios",
    "parking": "Info estacionamiento",
    "payment_options": ["Efectivo", "Visa", "Mastercard"],
    "additional_features": ["WiFi", "Terraza", "Aire acondicionado"]
  },
  "sections": [
    {
      "title": "Nombre sección",
      "description": "Opcional",
      "items": [
        {
          "name": "Nombre item",
          "price": 0,
          "description": "Descripción",
          "features": ["Feature 1", "Feature 2"]
        }
      ]
    }
  ]
}

INSTRUCCIONES ESPECÍFICAS:
1. Si se proporciona una imagen, extrae toda la información (items, precios, secciones).
2. Si hay contenido actual y una instrucción de texto, MODIFICA el contenido actual siguiendo la instrucción (ej: "simplifica", "añade X a todos").
3. Para MOTELES:
   - Items son "tipos de habitación".
   - Features comunes: "Jacuzzi", "Smart TV", "Cochera techada", "Espejo en techo", "Cama King Size".
4. Para RESTAURANTES:
   - Items son "platillos".
   - Features comunes: "Picante", "Vegetariano", "Especialidad".

SIEMPRE responde ÚNICAMENTE con el objeto JSON. Sin explicaciones ni Markdown.
`;

export async function callGemini(
  placeType: 'motel' | 'restaurant',
  instruction: string,
  base64Image?: string,
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

  if (base64Image) {
    contents[0].parts.push({
      inline_data: {
        mime_type: "image/jpeg", // Asumimos jpeg por simplicidad o lo detectamos
        data: base64Image
      }
    } as any);
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      }
    );

    const result = await response.json();
    const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) return null;

    // Limpiar posible markdown si Gemini se equivoca
    const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error('Error callGemini:', err);
    return null;
  }
}
