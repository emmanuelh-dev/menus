export const prerender = false;
import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { callGemini } from '../../../lib/gemini';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { placeId, instruction, image, currentContent: providedContent } = await request.json();

    if (!placeId) {
      return new Response(JSON.stringify({ error: 'placeId is required' }), { status: 400 });
    }

    // 1. Obtener el lugar actual para tener el contexto y el tipo
    const { data: place, error: fetchError } = await supabase
      .from('places')
      .select('*')
      .eq('id', placeId)
      .single();
    
    if (fetchError || !place) {
      return new Response(JSON.stringify({ error: 'Place not found' }), { status: 404 });
    }

    const currentContent = providedContent || place.content || { blocks: [], semantic_data: {}, view_settings: { layout: 'grid', show_prices: true } };
    const placeType = place.type || 'restaurant';

    // 1.5. Guardar el estado previo en el historial para auditoría
    await supabase
      .from('place_content_history')
      .insert({
        place_id: placeId,
        content: currentContent,
        source: providedContent ? 'admin_editor' : 'quick_feed_request',
        agent_reasoning: instruction || 'Update request',
        version_label: `Revision before: ${instruction?.substring(0, 30) || 'AI Scan'}`
      });

    // 2. Llamar a Gemini
    const aiResponse = await callGemini(
      placeType as 'motel' | 'restaurant',
      instruction || 'Analiza la imagen y actualiza el contenido.',
      image,
      currentContent
    );

    if (!aiResponse) {
      return new Response(JSON.stringify({ error: 'Failed to get AI response' }), { status: 500 });
    }

    // 3. Procesar y fusionar la respuesta (Lógica similar a ContentEditor.tsx)
    const newContent = { ...currentContent };
    
    // Fusionar semantic_data
    if (aiResponse.semantic_data) {
      newContent.semantic_data = {
        ...newContent.semantic_data,
        ...aiResponse.semantic_data
      };
    }

    // Procesar secciones a bloques
    if (aiResponse.sections) {
      const existingBlocks = [...(newContent.blocks || [])];
      
      aiResponse.sections.forEach((section: any) => {
        // Buscar sección similar por título
        const sectionIndex = existingBlocks.findIndex(
          b => b.type === 'section' && 
          b.data.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 
          section.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        );

        if (sectionIndex !== -1) {
          // Fusionar items en sección existente
          const existingSection = { ...existingBlocks[sectionIndex] };
          const existingItems = [...(existingSection.data.items || [])];
          
          section.items?.forEach((newItem: any) => {
            const itemIndex = existingItems.findIndex(i => 
              i.name.toLowerCase().trim() === newItem.name.toLowerCase().trim()
            );

            if (itemIndex !== -1) {
              // Actualizar item existente
              existingItems[itemIndex] = {
                ...existingItems[itemIndex],
                price: newItem.price || existingItems[itemIndex].price,
                description: newItem.description || existingItems[itemIndex].description,
                // Fusionar features sin duplicar
                features: [...new Set([...(existingItems[itemIndex].features || []), ...(newItem.features || [])])]
              };
            } else {
              // Añadir nuevo item
              existingItems.push({
                id: `item-${Date.now()}-${Math.random()}`,
                ...newItem
              });
            }
          });

          existingSection.data.items = existingItems;
          existingBlocks[sectionIndex] = existingSection;
        } else {
          // Crear nueva sección
          existingBlocks.push({
            id: `block-${Date.now()}-${Math.random()}`,
            type: 'section',
            data: {
              title: section.title,
              description: section.description || '',
              items: (section.items || []).map((item: any) => ({
                id: `item-${Date.now()}-${Math.random()}`,
                ...item
              }))
            }
          });
        }
      });
      newContent.blocks = existingBlocks;
    }

    // 4. Guardar en Supabase
    const { error: updateError } = await supabase
      .from('places')
      .update({ content: newContent })
      .eq('id', placeId);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Contenido actualizado correctamente',
      content: newContent
    }), { status: 200 });

  } catch (err: any) {
    console.error('Error in AI update endpoint:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
