import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
 
export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const stateId = url.searchParams.get('state_id');

  if (!stateId) {
    return new Response(JSON.stringify({ error: 'state_id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { data: municipalities, error } = await supabase
    .from('municipalities')
    .select('*')
    .eq('state_id', stateId)
    .order('name');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify(municipalities), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, state_id, slug } = body;

    if (!name || !state_id) {
      return new Response(JSON.stringify({ error: 'Name and state_id are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: municipality, error } = await supabase
      .from('municipalities')
      .insert([{ name, state_id, slug: slug || name.toLowerCase().replace(/\s+/g, '-') }])
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(municipality), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Invalid request body', details: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
