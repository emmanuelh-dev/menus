import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
 
export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const placeId = url.searchParams.get('place_id');

  if (!placeId) {
    return new Response(JSON.stringify({ error: 'place_id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { data: zones, error } = await supabase
    .from('shipping_zones')
    .select('*')
    .eq('place_id', placeId)
    .order('name');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ zones }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const text = await request.text();
    
    if (!text) {
      return new Response(JSON.stringify({ 
        error: 'Petición sin cuerpo',
        details: 'El servidor recibió el POST pero el cuerpo está vacío. Content-Type: ' + request.headers.get('content-type') 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = JSON.parse(text);

    if (!body.place_id) {
      return new Response(JSON.stringify({ error: 'place_id is required in body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: zone, error } = await supabase
      .from('shipping_zones')
      .insert([body])
      .select()
      .single();

    if (error) {
      console.error('Database error in POST /api/shipping-zones:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ zone }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error in POST /api/shipping-zones:', error);
    return new Response(JSON.stringify({ 
      error: 'Invalid request body',
      details: error.message 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
