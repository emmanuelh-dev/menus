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
              <h2 style="color: #10b981; margin-top: 0;">¡Nuevo contacto guardado!</h2>
              <p>Un visitante de un menú ha guardado sus datos:</p>
              <ul style="list-style: none; padding: 0; font-size: 14px; color: #1e293b;">
                <li><strong>Nombre:</strong> ${customer.name || 'N/A'}</li>
                <li><strong>WhatsApp:</strong> ${customer.phone || 'N/A'}</li>
                <li><strong>Dirección:</strong> ${customer.default_address || 'No proporcionada'}</li>
                <li><strong>Colonia:</strong> ${customer.default_colony || 'N/A'}</li>
              </ul>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 11px; color: #64748b;">Este dato se guardó automáticamente desde el carrito o checkout de un restaurante.</p>
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
