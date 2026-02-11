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
  console.log(`[GET] Request for ID: ${id}, isUUID: ${isUUID}`);

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
      console.error(`[GET] Order not found for ${id}:`, error?.message);
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

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
  }

  // 1. Verificar autenticación básica (necesaria para cambiar estatus)
  const { getEffectiveUser } = await import("../../../middleware/auth");
  const authResult = await getEffectiveUser(request, cookies);

  if (!authResult) {
    return new Response(JSON.stringify({ error: "No autorizado. Debes iniciar sesión." }), { status: 401 });
  }

  const { realUser, effectiveUser, isAdmin: isRealAdmin } = authResult;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  console.log(`[PUT] Request for ID: ${id}, isUUID: ${isUUID}, user: ${realUser.email}`);

  try {
    const body = await request.json();

    // 2. Obtener el pedido actual para verificar propiedad
    let checkQuery = supabase.from('orders').select('place_id, places(user_id)');
    if (isUUID) {
      checkQuery = checkQuery.eq('uuid', id);
    } else {
      checkQuery = checkQuery.eq('id', id);
    }

    const { data: currentOrder, error: checkError } = await checkQuery.single();

    if (checkError || !currentOrder) {
      console.error(`[PUT] Pre-check failed for ${id}:`, checkError?.message);
      return new Response(JSON.stringify({ error: "Pedido no encontrado" }), { status: 404 });
    }

    // 3. Verificar si es el dueño o admin
    const placeData = Array.isArray(currentOrder.places) ? currentOrder.places[0] : currentOrder.places;
    const isOwner = placeData?.user_id === effectiveUser.id;
    console.log(`[PUT] Ownership check: isOwner=${isOwner}, isRealAdmin=${isRealAdmin}`);
    
    if (!isRealAdmin && !isOwner) {
      return new Response(JSON.stringify({ error: "No tienes permiso para modificar este pedido" }), { status: 403 });
    }

    // 4. Proceder con el update
    let query = supabase.from('orders').update(body);

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
