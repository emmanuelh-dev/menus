import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
  }

  // Verificar si es un UUID o un ID numérico
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  try {
    let query = supabase
      .from('orders')
      .select('*, places(name, short_name, user_id)');
    
    if (isUUID) {
      query = query.eq('uuid', id);
    } else {
      query = query.eq('id', id);
    }

    const { data: order, error } = await query.single();

    if (error || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ order }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Invalid request: ${error instanceof Error ? error.message : 'Unknown error'}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PUT: APIRoute = async ({ params, request }) => {
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
  }

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  try {
    const body = await request.json();

    let query = supabase
      .from('orders')
      .update(body);

    if (isUUID) {
      query = query.eq('uuid', id);
    } else {
      query = query.eq('id', id);
    }

    const { data: order, error } = await query.select('*, places(name, short_name, user_id)').single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ order }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Invalid request: ${error instanceof Error ? error.message : 'Unknown error'}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
