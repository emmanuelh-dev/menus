export const prerender = false;
import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { callGemini } from '../../../lib/gemini';
import { v4 as uuidv4 } from 'uuid';

/**
 * Función para subir una imagen base64 a Supabase Storage
 */
async function uploadBase64(base64String: string, originalName?: string) {
  try {
    // Limpiar el prefijo data:image/xxx;base64,
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;

    const contentType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Solo permitir imágenes para la galería
    if (!contentType.startsWith('image/')) return null;

    const extension = contentType.split('/')[1] || 'jpg';
    const fileName = `${uuidv4()}.${extension}`;

    const { data, error } = await supabase.storage
      .from('restaurant-images')
      .upload(fileName, buffer, {
        contentType,
        cacheControl: '3600'
      });

    if (error) {
      console.error('Error uploading to Supabase:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('restaurant-images')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (err) {
    console.error('Upload base64 error:', err);
    return null;
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    let { placeId, instruction, image, images, currentContent: providedContent, preview, saveOnly } = body;

    if (!placeId) {
      return new Response(JSON.stringify({ error: 'placeId is required' }), { status: 400 });
    }

    if (saveOnly && providedContent) {
      const { error: updateError } = await supabase
        .from('places')
        .update({ content: providedContent })
        .eq('id', placeId);

      if (updateError) throw updateError;
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Contenido guardado correctamente',
        content: providedContent
      }), { status: 200 });
    }

    // Simplificar la instrucción: eliminar saltos de línea excesivos y ruidos comunes
    if (instruction) {
      instruction = instruction
        .replace(/\s+/g, ' ')
        .replace(/BySMax.*$/i, '') // Eliminar publicidad de BySMax al final
        .replace(/Crea tu menú digital.*$/i, '')
        .trim();
    }

    // Normalizar a un array de imágenes (soporta el formato viejo 'image' y el nuevo 'images')
    const imageList = images || (image ? [image] : []);

    // 1. Obtener el lugar actual para tener el contexto y el tipo
    const { data: place, error: fetchError } = await supabase
      .from('places')
      .select('*')
      .eq('id', placeId)
      .single();
    
    if (fetchError || !place) {
      return new Response(JSON.stringify({ error: 'Place not found' }), { status: 404 });
    }

    let currentContent = providedContent || place.content || { blocks: [], semantic_data: {}, view_settings: { layout: 'grid', show_prices: true } };
    
    // Aligerar el contenido actual para la IA: eliminar datos de imágenes pesados que no necesite
    // (Solo le pasamos la estructura, no las base64 de las imágenes ya guardadas)
    const cleanContentForAI = JSON.parse(JSON.stringify(currentContent));
    if (cleanContentForAI.blocks) {
      cleanContentForAI.blocks = cleanContentForAI.blocks.map((b: any) => {
        if (b.data?.image?.startsWith('data:')) {
          b.data.image = '[URL_DE_IMAGEN]'; // No enviar base64 pesadas de vuelta a la IA
        }
        if (b.data?.items) {
          b.data.items = b.data.items.map((i: any) => {
            if (i.image?.startsWith('data:')) i.image = '[URL_DE_IMAGEN]';
            if (i.gallery) i.gallery = i.gallery.map((img: any) => (img.url?.startsWith('data:') ? { ...img, url: '[URL]' } : img));
            return i;
          });
        }
        return b;
      });
    }

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

    let aiResponse = await callGemini(
      placeType as 'motel' | 'restaurant',
      instruction || 'Analiza las imágenes y actualiza el contenido.',
      imageList,
      cleanContentForAI
    );

    if (!aiResponse) {
      console.error('Gemini error: Empty response or failed to parse. Instruction length:', instruction?.length);
      console.log('--- ATTEMPTING FALLBACK (SIMPLE SCAN) ---');
      aiResponse = await callGemini(
        placeType as 'motel' | 'restaurant',
        "Analiza el texto y extrae items/precios básicos. Sé breve. Texto: " + (instruction || "").substring(0, 1000),
        imageList.slice(0, 1),
        { semantic_data: cleanContentForAI.semantic_data }
      );

      if (!aiResponse) {
        return new Response(JSON.stringify({ 
          error: 'La IA no pudo procesar esta solicitud aún en modo simplificado.',
          debug_info: 'AI_EMPTY_RESPONSE_PERSISTENT'
        }), { status: 500 });
      }
    }

    // 3. Procesar la respuesta de la IA (Estado Final)
    const newContent = { ...currentContent };
    
    if (aiResponse.semantic_data) {
      newContent.semantic_data = aiResponse.semantic_data;
    }

    // Procesar secciones/bloques: La IA devuelve el array completo de bloques
    if (aiResponse.blocks && Array.isArray(aiResponse.blocks)) {
      // VALIDACIÓN DE SEGURIDAD: Si la IA devuelve drásticamente menos items de los que había,
      // y no hubo una instrucción de "borrar", intentamos una fusión conservadora.
      const currentItemCount = currentContent.blocks?.reduce((acc: number, b: any) => acc + (b.data?.items?.length || 0), 0) || 0;
      const newItemCount = aiResponse.blocks.reduce((acc: number, b: any) => acc + (b.data?.items?.length || 0), 0) || 0;

      let blocksToUse = aiResponse.blocks;

      // Si se perdieron más del 50% de los items y la instrucción fue corta (mantenimiento)
      // Ajuste: Si la instrucción menciona "limpiar" o "duplicados", permitimos más flexibilidad.
      const isCleanupRequested = instruction?.toLowerCase().includes('duplicado') || instruction?.toLowerCase().includes('limpiar') || instruction?.toLowerCase().includes('fix');
      const safetyThreshold = isCleanupRequested ? 0.2 : 0.5; // Si pide limpiar, permitimos que quede hasta el 20% (casos de muchos duplicados)

      if (currentItemCount > 4 && newItemCount < currentItemCount * safetyThreshold && (!instruction || instruction.length < 20)) {
        console.warn('Protección de datos activada: La IA intentó borrar demasiados items sin una instrucción clara de limpieza.');
        // En este caso extremo, preferimos fallar o avisar que borrar todo
        return new Response(JSON.stringify({ 
          error: 'La IA intentó eliminar demasiado contenido. Por seguridad, la operación se canceló. Intenta ser más específico con la instrucción.' 
        }), { status: 400 });
      }

      // 1. Mapear los placeholders [URL_DE_IMAGEN] de vuelta a sus URLs originales
      const restoredBlocks = blocksToUse.map((newBlock: any) => {
        // Buscar el bloque original por ID o por título para recuperar su imagen
        const originalBlock = currentContent.blocks?.find((b: any) => b.id === newBlock.id || b.data?.title === newBlock.data?.title);
        
        if (newBlock.data) {
          if (newBlock.data.image === '[URL_DE_IMAGEN]' && originalBlock?.data?.image) {
            newBlock.data.image = originalBlock.data.image;
          }

          if (newBlock.data.items) {
            newBlock.data.items = newBlock.data.items.map((newItem: any) => {
              const originalItem = originalBlock?.data?.items?.find((i: any) => i.id === newItem.id || i.name === newItem.name);
              
              if (newItem.image === '[URL_DE_IMAGEN]' && originalItem?.image) {
                newItem.image = originalItem.image;
              }
              // Restaurar IDs si se perdieron
              if (!newItem.id && originalItem?.id) {
                newItem.id = originalItem.id;
              }

              // Restaurar galería si existe y tiene marcadores [URL]
              if (newItem.gallery && Array.isArray(newItem.gallery) && originalItem?.gallery) {
                // Si la IA devolvió marcadores [URL], intentamos restaurar las reales
                newItem.gallery = newItem.gallery.map((img: any, idx: number) => {
                  if (img.url === '[URL]' && originalItem.gallery[idx]) {
                    return { ...img, ...originalItem.gallery[idx] };
                  }
                  return img;
                });
              } else if (!newItem.gallery && originalItem?.gallery) {
                // Si la IA olvidó la galería, pero el original la tenía, la preservamos
                newItem.gallery = originalItem.gallery;
              }
              return newItem;
            });
          }
        }
        // Restaurar ID de bloque si se perdió
        if (!newBlock.id && originalBlock?.id) {
          newBlock.id = originalBlock.id;
        }
        return newBlock;
      });

      newContent.blocks = restoredBlocks;
    }

    // Calcular estadísticas de lo detectado
    const stats = {
      sections: newContent.blocks?.length || 0,
      items: newContent.blocks?.reduce((acc: number, b: any) => acc + (b.data?.items?.length || 0), 0) || 0,
      hasAddress: !!aiResponse.semantic_data?.address,
      hasPhone: !!aiResponse.semantic_data?.phone,
      newImages: aiResponse.semantic_data?.new_gallery_images?.length || 0
    };

    if (preview) {
      return new Response(JSON.stringify({ 
        success: true, 
        preview: true,
        stats,
        content: newContent
      }), { status: 200 });
    }

    // 3.5. Procesar nuevas imágenes para la galería (si la IA detectó fotos nuevas en la subida)
    if (aiResponse.semantic_data?.new_gallery_images && Array.isArray(aiResponse.semantic_data.new_gallery_images)) {
      const gallery = [...(newContent.gallery || [])];
      
      for (const newImg of aiResponse.semantic_data.new_gallery_images) {
        const originalBase64 = imageList[newImg.index || 0];
        if (originalBase64 && originalBase64.startsWith('data:image')) {
          const uploadedUrl = await uploadBase64(originalBase64);
          if (uploadedUrl) {
            gallery.push({
              url: uploadedUrl,
              title: newImg.title || 'Imagen del lugar',
              id: `img-${Date.now()}-${Math.random()}`
            });
          }
        }
      }
      newContent.gallery = gallery;
      delete newContent.semantic_data.new_gallery_images;
    }

    // 5. Guardar en Supabase
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
