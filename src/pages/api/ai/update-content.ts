import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { callGemini } from '../../../lib/gemini';
import { uploadToCloudinary } from '../../../lib/cloudinary';

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
      cleanContentForAI,
      cloudinaryUrls
    );

    if (!aiResponse) {
        return new Response(JSON.stringify({ 
          error: 'La IA no pudo procesar esta solicitud.',
          debug_info: 'AI_EMPTY_RESPONSE'
        }), { status: 500 });
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

    // PROCESAR NUEVAS IMÁGENES DE GALERÍA
    if (aiResponse.new_gallery_images && Array.isArray(aiResponse.new_gallery_images)) {
        if (!newContent.gallery) newContent.gallery = [];
        aiResponse.new_gallery_images.forEach((img: any) => {
            newContent.gallery.push({
                url: img.url,
                title: img.title || 'Imagen del lugar',
                id: `img-${Date.now()}-${Math.random()}`
            });
        });
    }

    const stats = {
      sections: newContent.blocks?.length || 0,
      items: newContent.blocks?.reduce((acc: number, b: any) => acc + (b.data?.items?.length || 0), 0) || 0,
      hasAddress: !!aiResponse.semantic_data?.address,
      hasPhone: !!aiResponse.semantic_data?.phone,
      newImages: aiResponse.new_gallery_images?.length || 0
    };

    if (preview) {
      return new Response(JSON.stringify({ 
        success: true, 
        preview: true,
        stats,
        content: newContent
      }), { status: 200 });
    }

    const { error: updateError } = await supabase
      .from('places')
      .update({ content: newContent })
      .eq('id', placeId);

    if (updateError) throw updateError;

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

