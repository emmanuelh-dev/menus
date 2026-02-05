import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ params, cookies, request }) => {
  const { id } = params;

  const { getEffectiveUser } = await import("../../../middleware/auth");
  const authResult = await getEffectiveUser(request, cookies);

  if (!authResult) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }

  const { effectiveUser, isAdmin: isRealAdmin } = authResult;
  const isImpersonating = 'isImpersonated' in effectiveUser && effectiveUser.isImpersonated;

  let querySupabase = supabase;
  if (isImpersonating) {
    const { createClient } = await import("@supabase/supabase-js");
    querySupabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
  }

  const { data: customer, error } = await querySupabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !customer) {
    return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), { status: 404 });
  }

  // Verificar propiedad (si no es admin real)
  if (!isRealAdmin || isImpersonating) {
    const { data: order } = await querySupabase
      .from('orders')
      .select('place_id, places(user_id)')
      .eq('customer_phone', customer.phone)
      .eq('places.user_id', effectiveUser.id)
      .limit(1)
      .maybeSingle();

    if (!order) {
      return new Response(JSON.stringify({ error: 'No tienes permiso para ver este cliente' }), { status: 403 });
    }
  }

  return new Response(JSON.stringify({ customer }), { status: 200 });
};

export const DELETE: APIRoute = async ({ params, cookies, request }) => {
  const { id } = params;

  const { getEffectiveUser } = await import("../../../middleware/auth");
  const authResult = await getEffectiveUser(request, cookies);

  if (!authResult || !authResult.isAdmin) {
    return new Response(JSON.stringify({ error: "Solo administradores pueden eliminar clientes" }), { status: 401 });
  }

  // NOTA: Para eliminar, requerimos ser Admin Real (no detectamos impersonación para borrar data core)
  // O si decides permitirlo a impersonados, quita el check de isImpersonated.
  
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
