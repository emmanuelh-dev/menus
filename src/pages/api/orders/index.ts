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

export const GET: APIRoute = async ({ url, cookies, request }) => {
  const { getEffectiveUser } = await import("../../../middleware/auth");
  const authResult = await getEffectiveUser(request, cookies);

  if (!authResult) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { effectiveUser, isAdmin: isRealAdmin } = authResult;
  const isImpersonating = 'isImpersonated' in effectiveUser && effectiveUser.isImpersonated;

  const placeId = url.searchParams.get('place_id');
  const status = url.searchParams.get('status');
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '50');

  // Si estamos impersonando o no es admin, usamos Service Role para filtrar correctamente
  let querySupabase = supabase;
  if (isImpersonating) {
    const { createClient } = await import("@supabase/supabase-js");
    querySupabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
  }

  let query = querySupabase
    .from('orders')
    .select('*', { count: 'exact' });

  // Seguridad: Si no es admin real o está impersonando, filtrar por sus propios lugares
  if (!isRealAdmin || isImpersonating) {
    const { data: myPlaces } = await querySupabase
      .from('places')
      .select('id')
      .eq('user_id', effectiveUser.id);
    
    if (!myPlaces || myPlaces.length === 0) {
      return new Response(JSON.stringify({ orders: [], totalOrders: 0 }), { status: 200 });
    }

    const placeIds = myPlaces.map(p => p.id);
    
    // Si especificó un placeId, verificar que le pertenezca
    if (placeId) {
      if (!placeIds.includes(placeId)) {
        return new Response(JSON.stringify({ error: "No tienes permiso para ver este lugar" }), { status: 403 });
      }
      query = query.eq('place_id', placeId);
    } else {
      // Si no especificó, ver todos sus lugares
      query = query.in('place_id', placeIds);
    }
  } else if (placeId) {
    // Admin real viendo un lugar específico
    query = query.eq('place_id', placeId);
  }

  if (status) {
    if (status.includes(',')) {
      query = query.in('status', status.split(','));
    } else {
      query = query.eq('status', status);
    }
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
