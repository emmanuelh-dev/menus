export const prerender = false;
import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { placeId, historyId } = await request.json();

    if (!placeId || !historyId) {
      return new Response(JSON.stringify({ error: 'placeId and historyId are required' }), { status: 400 });
    }

    // 1. Obtener la versión del historial
    const { data: history, error: historyError } = await supabase
      .from('place_content_history')
      .select('content')
      .eq('id', historyId)
      .eq('place_id', placeId)
      .single();

    if (historyError || !history) {
      return new Response(JSON.stringify({ error: 'History record not found' }), { status: 404 });
    }

    // 2. Actualizar el lugar con el contenido del historial
    const { error: updateError } = await supabase
      .from('places')
      .update({ content: history.content })
      .eq('id', placeId);

    if (updateError) throw updateError;

    // 3. Opcional: Registrar que se hizo un rollback
    await supabase.from('place_content_history').insert({
      place_id: placeId,
      content: history.content,
      source: 'admin_rollback',
      agent_reasoning: `Restaurado desde la versión ${historyId}`,
      version_label: 'Rollback manual'
    });

    return new Response(JSON.stringify({ success: true, message: 'Rollback completado' }), { status: 200 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
