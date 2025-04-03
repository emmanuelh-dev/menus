import type { APIRoute } from 'astro';

interface MenuItem {
  name: string;
  price?: number;
}

interface RequestBody {
  preferences: string;
  menuItems: MenuItem[] | string;
  restaurantName: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as RequestBody;
    const { preferences, menuItems, restaurantName } = body;

    if (!preferences || !menuItems || !restaurantName) {
      return new Response(
        JSON.stringify({
          error: 'Se requieren preferencias, elementos del menú y nombre del restaurante'
        }),
        { status: 400 }
      );
    }

    // Formatear los elementos del menú para la solicitud a OpenAI
    let formattedMenuItems = '';
    
    if (typeof menuItems === 'string') {
      // Si menuItems es un string, usarlo directamente
      formattedMenuItems = menuItems;
    } else if (Array.isArray(menuItems)) {
      // Si menuItems es un array, formatearlo como antes
      formattedMenuItems = menuItems.map(item => 
        `${item.name}${item.price ? ` - $${item.price}` : ''}`
      ).join('\n');
    }

    console.log(formattedMenuItems)
    // Crear el mensaje para OpenAI
    const prompt = `
    Eres un asistente especializado en recomendaciones gastronómicas para el restaurante "${restaurantName}".
    
    MENÚ DISPONIBLE:
    ${formattedMenuItems}
    
    PREFERENCIAS DEL CLIENTE:
    ${preferences}
    
    Basándote en las preferencias del cliente y el menú disponible, recomienda uno o más platillos que podrían gustarle.
    Explica brevemente por qué crees que estos platillos se ajustan a sus preferencias.
    Trata de ser descriptivo, por ejemplo, si esta en la seccion de hotdogs y es un chico, no digas chico, di que es un Hotdog chico.
    Si no hay una seccion, di que es un platillo del restaurante.

    Mantén tu respuesta concisa, amigable y en español. Usa pocas palabras y no lo hagas muy largo.
    
    IMPORTANTE: Puedes usar formato Markdown en tu respuesta para resaltar información importante. Por ejemplo:
    - Usa **negrita** para destacar nombres de platillos
    - Usa *cursiva* para enfatizar características
    - Usa listas con guiones para enumerar opciones
    `;

    // Configuración de la solicitud a la API de OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Eres un asistente especializado en recomendaciones gastronómicas.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 250
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('Error de OpenAI:', errorData);
      return new Response(
        JSON.stringify({ error: 'Error al comunicarse con OpenAI' }),
        { status: 500 }
      );
    }

    const data = await openaiResponse.json();
    const recommendation = data.choices[0].message.content.trim();

    return new Response(
      JSON.stringify({ recommendation }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error en el servidor:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500 }
    );
  }
};