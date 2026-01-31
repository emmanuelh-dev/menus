import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
 
export const prerender = false;

export const PUT: APIRoute = async ({ params, request }) => {
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const text = await request.text();
    if (!text) {
      return new Response(JSON.stringify({ 
        error: 'Petición sin cuerpo',
        details: 'El servidor recibió el PUT pero el cuerpo está vacío.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = JSON.parse(text);

    const { data: zone, error } = await supabase
      .from('shipping_zones')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error in PUT /api/shipping-zones/[id]:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ zone }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error in PUT /api/shipping-zones/[id]:', error);
    return new Response(JSON.stringify({ 
      error: 'Invalid request body',
      details: error.message 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { error } = await supabase
    .from('shipping_zones')
    .delete()
    .eq('id', id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
