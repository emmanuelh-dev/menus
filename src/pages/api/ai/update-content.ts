export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { callGemini } from '../../../lib/gemini';
import { uploadToCloudinary } from '../../../lib/cloudinary';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const textBody = await request.text();
    if (!textBody) {
      return new Response(JSON.stringify({ error: 'Empty body' }), { status: 400 });
    }
    const body = JSON.parse(textBody);
    let { placeId, instruction, image, images, currentContent: providedContent, preview, saveOnly, token } = body;

    if (!placeId) {
      return new Response(JSON.stringify({ error: 'placeId is required' }), { status: 400 });
    }

    // --- AUTENTICACIÓN ---
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;
    let user: any = null;
    let isOwner = false;

    if (accessToken && refreshToken) {
      const { createAuthenticatedClient } = await import('../../../lib/supabase');
      const authSupabase = await createAuthenticatedClient(accessToken, refreshToken);
      const { data: { user: authUser } } = await authSupabase.auth.getUser();
      user = authUser;
    }

    // Verificar si es dueño
    const { data: placeData } = await supabase.from('places').select('user_id, content').eq('id', placeId).single();
    if (user && placeData && placeData.user_id === user.id) {
      isOwner = true;
    }

    // --- LÍMITES POR USUARIO ($20 MXN por mes) ---
    if (user && !saveOnly) {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      const { data: userPlaces } = await supabase.from('places').select('id').eq('user_id', user.id);
      const placeIds = userPlaces?.map(p => p.id) || [];
      
      if (placeIds.length > 0) {
        const { data: history } = await supabase
          .from('place_content_history')
          .select('version_label')
          .in('place_id', placeIds)
          .gte('created_at', firstDayOfMonth)
          .like('version_label', 'AI_GEN:%');
          
        // Extraer y sumar costos de las etiquetas guardadas
        let totalMonthCost = 0;
        history?.forEach(h => {
          const match = h.version_label.match(/cost:([0-9.]+)/);
          if (match) totalMonthCost += parseFloat(match[1]);
        });

        if (totalMonthCost >= 20) {
          return new Response(JSON.stringify({ 
            error: `Has alcanzado tu límite mensual de $20 MXN en consultas de IA (Consumido: $${totalMonthCost.toFixed(2)}).` 
          }), { status: 429 });
        }
      }
    }

    // --- CAPTCHA ---
    // Skip CAPTCHA if owner or saveOnly
    if (!saveOnly && !isOwner) {
      const { verifyTurnstileToken } = await import("../../../lib/turnstile");
      const verifyData = await verifyTurnstileToken(token);
      
      if (!verifyData.success) {
        return new Response(JSON.stringify({ error: "Verificación de CAPTCHA fallida" }), { status: 400 });
      }
    }

    // --- MODO SAVE ONLY ---
    if (saveOnly && providedContent) {
      if (placeData) {
        await supabase.from('place_content_history').insert({
          place_id: placeId,
          content: placeData.content,
          source: 'admin_editor',
          agent_reasoning: instruction || 'Edición manual desde el panel',
          version_label: 'Manual'
        });
      }

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

    if (instruction) {
      instruction = instruction
        .replace(/\s+/g, ' ')
        .replace(/BySMax.*$/i, '')
        .replace(/Crea tu menú digital.*$/i, '')
        .trim();
    }

    const imageList = images || (image ? [image] : []);

    // SUBIR A CLOUDINARY PRIMERO
    const cloudinaryUrls: string[] = [];
    for (const img of imageList) {
      if (img.startsWith('data:')) {
        const url = await uploadToCloudinary(img);
        if (url) cloudinaryUrls.push(url);
      } else if (img.startsWith('http')) {
        cloudinaryUrls.push(img);
      }
    }

    const { data: place, error: fetchError } = await supabase
      .from('places')
      .select('*')
      .eq('id', placeId)
      .single();
    
    if (fetchError || !place) {
      return new Response(JSON.stringify({ error: 'Place not found' }), { status: 404 });
    }

    let currentContent = providedContent || place.content || { blocks: [], semantic_data: {}, view_settings: { layout: 'grid', show_prices: true } };
    
    const cleanContentForAI = JSON.parse(JSON.stringify(currentContent));
    if (cleanContentForAI.blocks) {
      cleanContentForAI.blocks = cleanContentForAI.blocks.map((b: any) => {
        if (b.data?.image?.startsWith('data:') || b.data?.image?.includes('cloudinary.com')) {
          b.data.image = '[URL_DE_IMAGEN]';
        }
        if (b.data?.items) {
          b.data.items = b.data.items.map((i: any) => {
            if (i.image?.startsWith('data:') || i.image?.includes('cloudinary.com')) i.image = '[URL_DE_IMAGEN]';
            if (i.gallery) i.gallery = i.gallery.map((img: any) => (img.url?.startsWith('data:') || img.url?.includes('cloudinary.com') ? { ...img, url: '[URL]' } : img));
            return i;
          });
        }
        return b;
      });
    }

    const placeType = place.type || 'restaurant';

    let aiResponse = await callGemini(
      placeType as 'motel' | 'restaurant',
      instruction || 'Analiza las imágenes y actualiza el contenido.',
      imageList,
      cleanContentForAI,
      cloudinaryUrls
    );

    if (!aiResponse) {
        console.error('AI Empty Response for place:', placeId, 'Instruction:', instruction, 'Images count:', imageList.length);
        return new Response(JSON.stringify({ 
          error: 'La IA no pudo procesar la solicitud en este momento. Por favor, intenta ser más específico o añade una imagen.',
          debug_info: 'AI_EMPTY_RESPONSE'
        }), { status: 500 });
    }

    console.log('🤖 AI Response received:');
    console.log('  - change_summary:', aiResponse.change_summary || '(empty)');
    console.log('  - conversational_response:', aiResponse.conversational_response || '(empty)');
    console.log('  - blocks count:', aiResponse.blocks?.length || 0);
    if (aiResponse.repaired) {
      console.log('  - ⚠️ RESPONSE WAS REPAIRED (likely truncated)');
      if (aiResponse.conversational_response) {
        aiResponse.conversational_response += "\n\n⚠️ Nota: La respuesta fue muy larga y podría estar incompleta. Por favor revisa los últimos cambios.";
      }
    }

    const newContent = { ...currentContent };
    
    if (aiResponse.semantic_data) {
      newContent.semantic_data = aiResponse.semantic_data;
    }

    if (aiResponse.blocks && Array.isArray(aiResponse.blocks)) {
      const restoredBlocks = aiResponse.blocks.map((newBlock: any) => {
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
              if (!newItem.id && originalItem?.id) {
                newItem.id = originalItem.id;
              }
              if (newItem.gallery && Array.isArray(newItem.gallery) && originalItem?.gallery) {
                newItem.gallery = newItem.gallery.map((img: any, idx: number) => {
                  if (img.url === '[URL]' && originalItem.gallery[idx]) {
                    return { ...img, ...originalItem.gallery[idx] };
                  }
                  return img;
                });
              } else if (!newItem.gallery && originalItem?.gallery) {
                newItem.gallery = originalItem.gallery;
              }

              // Restaurar opciones si la IA no las devolvió para un item existente
              if (!newItem.options && originalItem?.options) {
                newItem.options = originalItem.options;
              }

              return newItem;
            });
          }
        }
        if (!newBlock.id && originalBlock?.id) {
          newBlock.id = originalBlock.id;
        }
        return newBlock;
      });

      newContent.blocks = restoredBlocks;
    }

    // PROCESAR TODAS LAS IMÁGENES DE CLOUDINARY (Auto-añadir a galería si no se usaron en items)
    if (!newContent.gallery) newContent.gallery = [];
    const usedInItems = new Set();
    newContent.blocks?.forEach((b: any) => {
        b.data?.items?.forEach((i: any) => { if (i.image?.includes('cloudinary.com')) usedInItems.add(i.image); });
    });

    cloudinaryUrls.forEach(url => {
        if (!usedInItems.has(url)) {
            const exists = newContent.gallery.some((img: any) => img.url === url);
            if (!exists) {
                newContent.gallery.push({
                    url,
                    title: 'Aporte de la comunidad',
                    id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                });
            }
        }
    });

    // PROCESAR IMÁGENES QUE LA IA DECIDIÓ AÑADIR ESPECÍFICAMENTE
    if (aiResponse.new_gallery_images && Array.isArray(aiResponse.new_gallery_images)) {
        aiResponse.new_gallery_images.forEach((img: any) => {
            const exists = newContent.gallery.some((existing: any) => existing.url === img.url);
            if (!exists) {
                newContent.gallery.push({
                    url: img.url,
                    title: img.title || 'Imagen del lugar',
                    id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                });
            }
        });
    }
    
    // CÁLCULO DE COSTO EN MXN (Basado en Gemini 2.0 Flash Lite / Flash)
    // Precios aprox USD: Input $0.10/1M, Output $0.40/1M. Exchange: $20 MXN/USD
    const inputCostMx = (aiResponse.usageMetadata?.promptTokenCount || 0) * (0.10 / 1000000) * 20;
    const outputCostMx = (aiResponse.usageMetadata?.candidatesTokenCount || 0) * (0.40 / 1000000) * 20;
    const totalCostMx = inputCostMx + outputCostMx;

    // GUARDAR HISTORIAL CON EL RESUMEN DE LA IA Y COSTO
    await supabase
      .from('place_content_history')
      .insert({
        place_id: placeId,
        content: currentContent, // El contenido anterior para poder hacer rollback
        source: providedContent ? 'admin_editor' : 'quick_feed_request',
        agent_reasoning: aiResponse.change_summary || instruction || 'Update request',
        version_label: `AI_GEN: cost:${totalCostMx.toFixed(4)} | ${aiResponse.change_summary?.substring(0, 30) || instruction?.substring(0, 30) || 'AI Scan'}`
      });

    const stats = {
      sections: newContent.blocks?.length || 0,
      items: newContent.blocks?.reduce((acc: number, b: any) => acc + (b.data?.items?.length || 0), 0) || 0,
      hasAddress: !!aiResponse.semantic_data?.address,
      hasPhone: !!aiResponse.semantic_data?.phone,
      newImages: aiResponse.new_gallery_images?.length || 0
    };

    // DETECTAR SI HUBO CAMBIOS REALES
    const contentChanged = JSON.stringify(currentContent.blocks) !== JSON.stringify(newContent.blocks) || 
                           JSON.stringify(currentContent.semantic_data) !== JSON.stringify(newContent.semantic_data);

    console.log('📝 Content change detection:');
    console.log('  - contentChanged:', contentChanged);
    console.log('  - has change_summary:', !!aiResponse.change_summary);
    console.log('  - blocks count before:', currentContent.blocks?.length || 0);
    console.log('  - blocks count after:', newContent.blocks?.length || 0);

    if (preview) {
      // Si no hay cambios y es una pregunta/conversación, no mandamos el flag de preview de contenido
      const isPurelyConversational = !contentChanged && !aiResponse.change_summary;
      
      console.log('  - isPurelyConversational:', isPurelyConversational);

    return new Response(JSON.stringify({ 
      success: true, 
      preview: !isPurelyConversational,
      stats: isPurelyConversational ? null : {
        ...stats,
        change_summary: aiResponse.change_summary
      },
      conversational_response: aiResponse.conversational_response,
      content: isPurelyConversational ? currentContent : newContent,
      usage: aiResponse.usageMetadata
    }), { status: 200 });
  }

  const { error: updateError } = await supabase
    .from('places')
    .update({ content: newContent })
    .eq('id', placeId);

  if (updateError) throw updateError;

  return new Response(JSON.stringify({ 
    success: true, 
    stats,
    conversational_response: aiResponse.conversational_response,
    content: newContent,
    usage: aiResponse.usageMetadata
  }), { status: 200 });

  } catch (err: any) {
    console.error('Error in AI update endpoint:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

