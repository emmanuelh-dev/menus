import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', body.phone)
      .single();

    if (existingCustomer) {
      const { data: customer, error } = await supabase
        .from('customers')
        .update({
          name: body.name,
          email: body.email,
          default_address: body.default_address,
          default_lat: body.default_lat,
          default_lng: body.default_lng,
          default_colony: body.default_colony
        })
        .eq('id', existingCustomer.id)
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ customer }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .insert([body])
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ customer }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Invalid request: ${error instanceof Error ? error.message : 'Unknown error'}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    if (!body.id) {
      return new Response(JSON.stringify({ error: 'id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .update(body)
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ customer }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
export const GET: APIRoute = async ({ url }) => {
  const phone = url.searchParams.get('phone');
  const placeId = url.searchParams.get('place_id');
  
  let query = supabase
    .from('customers')
    .select('*')
    .order('name', { ascending: true });

  if (phone) {
    query = query.eq('phone', phone);
  }

  // Si hay placeId, filtramos por clientes que hayan pedido en ese local
  if (placeId) {
    const { data: orders } = await supabase
      .from('orders')
      .select('customer_phone')
      .eq('place_id', placeId);
    
    if (orders && orders.length > 0) {
      const phones = Array.from(new Set(orders.map(o => o.customer_phone)));
      query = query.in('phone', phones);
    } else {
      // Si no hay órdenes, no hay clientes para este local
      return new Response(JSON.stringify({ customers: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  const { data: customers, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ customers }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
