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

    // --- Notificar al Admin sobre el nuevo Lead ---
    try {
      const { resend } = await import("../../../lib/resend");
      if (resend) {
        await resend.emails.send({
          from: 'Menús BysMax <info@bysmax.com>',
          to: ['info@bysmax.com'],
          subject: '👤 Nuevo Lead de Cliente',
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
              <h2 style="color: #1052ba; margin-top: 0;">¡Nuevo contacto guardado!</h2>
              <p>Un visitante de un menú ha guardado sus datos:</p>
              <ul style="list-style: none; padding: 0; font-size: 14px; color: #262626;">
                <li><strong>Nombre:</strong> ${customer.name || 'N/A'}</li>
                <li><strong>WhatsApp:</strong> ${customer.phone || 'N/A'}</li>
                <li><strong>Dirección:</strong> ${customer.default_address || 'No proporcionada'}</li>
                <li><strong>Colonia:</strong> ${customer.default_colony || 'N/A'}</li>
              </ul>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 11px; color: #737373;">Este dato se guardó automáticamente desde el carrito o checkout de un restaurante.</p>
            </div>
          `
        });
      }
    } catch (emailError) {
      console.error("Lead notification failed:", emailError);
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

export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    const { getEffectiveUser } = await import("../../../middleware/auth");
    const authResult = await getEffectiveUser(request, cookies);

    if (!authResult) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
    }

    const { effectiveUser, isAdmin: isRealAdmin } = authResult;
    const isImpersonating = 'isImpersonated' in effectiveUser && effectiveUser.isImpersonated;

    const body = await request.json();

    if (!body.id) {
      return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
    }

    let querySupabase = supabase;
    if (isImpersonating) {
      const { createClient } = await import("@supabase/supabase-js");
      querySupabase = createClient(
        import.meta.env.PUBLIC_SUPABASE_URL,
        import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
      );
    }

    // Verificar si el usuario tiene permiso para este cliente antes de actualizar
    if (!isRealAdmin || isImpersonating) {
      // Obtener el cliente actual para saber su teléfono
      const { data: targetCustomer } = await querySupabase
        .from('customers')
        .select('phone')
        .eq('id', body.id)
        .single();
      
      if (!targetCustomer) {
        return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), { status: 404 });
      }

      const { data: hasOrder } = await querySupabase
        .from('orders')
        .select('id, places(user_id)')
        .eq('customer_phone', targetCustomer.phone)
        .eq('places.user_id', effectiveUser.id)
        .limit(1)
        .maybeSingle();
      
      if (!hasOrder) {
        return new Response(JSON.stringify({ error: 'No tienes permiso para actualizar este cliente' }), { status: 403 });
      }
    }

    const { data: customer, error } = await querySupabase
      .from('customers')
      .update(body)
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ customer }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
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

  const phone = url.searchParams.get('phone');
  const placeId = url.searchParams.get('place_id');
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '50');
  const search = url.searchParams.get('search') || '';
  
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
    .from('customers')
    .select('*', { count: 'exact' });

  // Seguridad: Si no es admin real o está impersonando, filtrar por sus propios lugares
  if (!isRealAdmin || isImpersonating) {
    // 1. Obtener los IDs de los lugares del usuario
    const { data: myPlaces } = await querySupabase
      .from('places')
      .select('id')
      .eq('user_id', effectiveUser.id);
    
    if (!myPlaces || myPlaces.length === 0) {
      return new Response(JSON.stringify({ customers: [], totalCustomers: 0 }), { status: 200 });
    }

    const placeIds = myPlaces.map(p => p.id);

    // 2. Obtener los teléfonos de clientes que han pedido en esos lugares
    const { data: orders } = await querySupabase
      .from('orders')
      .select('customer_phone')
      .in('place_id', placeIds);
    
    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ customers: [], totalCustomers: 0 }), { status: 200 });
    }

    const customerPhones = Array.from(new Set(orders.map(o => o.customer_phone).filter(Boolean)));
    
    if (customerPhones.length === 0) {
      return new Response(JSON.stringify({ customers: [], totalCustomers: 0 }), { status: 200 });
    }

    query = query.in('phone', customerPhones);
  }

  if (phone) {
    query = query.eq('phone', phone);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  // Si hay un placeId específico en el query (filtro adicional)
  if (placeId) {
    const { data: orders } = await querySupabase
      .from('orders')
      .select('customer_phone')
      .eq('place_id', placeId);
    
    if (orders && orders.length > 0) {
      const phones = Array.from(new Set(orders.map(o => o.customer_phone)));
      query = query.in('phone', phones);
    } else {
      return new Response(JSON.stringify({ customers: [], totalCustomers: 0 }), { status: 200 });
    }
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: customers, error, count: totalCustomers } = await query
    .order('name', { ascending: true })
    .range(from, to);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ customers, totalCustomers: totalCustomers || 0 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
