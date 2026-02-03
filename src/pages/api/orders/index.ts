import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const { data: order, error } = await supabase
      .from('orders')
      .insert([body])
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ order }), {
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

export const GET: APIRoute = async ({ url }) => {
  const placeId = url.searchParams.get('place_id');
  const status = url.searchParams.get('status');
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '50');

  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' });

  if (placeId) {
    query = query.eq('place_id', placeId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: orders, error, count: totalOrders } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ orders, totalOrders: totalOrders || 0 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
