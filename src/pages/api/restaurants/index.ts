export const prerender = false;
import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '../../../lib/supabase';
import { getEffectiveUser } from '../../../middleware/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const authResult = await getEffectiveUser(request, cookies);
    if (!authResult) {
       return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
    }

    const { effectiveUser, isAdmin } = authResult;
    
    // Decidir qué cliente usar
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;
    const isMagicOrImpersonating = !accessToken || !refreshToken || (effectiveUser as any).isImpersonated;

    let supabase;
    if (isMagicOrImpersonating || isAdmin) {
      // Usamos service role si es admin para poder asignar user_id arbitrarios
      const { createClient } = await import("@supabase/supabase-js");
      supabase = createClient(
        import.meta.env.PUBLIC_SUPABASE_URL,
        import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
      );
    } else {
      supabase = await createAuthenticatedClient(accessToken!, refreshToken!);
    }
    
    // Obtener datos del cuerpo de la solicitud
    const restaurantData = await request.json();
    
    // Validar datos mínimos requeridos
    if (!restaurantData.name || !restaurantData.address) {
      return new Response(
        JSON.stringify({ error: 'El nombre y la dirección son obligatorios' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Verificar si ya existe un lugar con el mismo short_name
    if (restaurantData.short_name) {
      const { data: existing } = await supabase
        .from('places')
        .select('id, name')
        .eq('short_name', restaurantData.short_name)
        .single();
      
      if (existing) {
        return new Response(
          JSON.stringify({ 
            error: `Ya existe un lugar con el slug "${restaurantData.short_name}". Por favor usa otro nombre.`
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Mapear category a type para la base de datos
    const { category, user_id: requestedUserId, ...rest } = restaurantData;
    
    // Si es admin y envió un user_id, lo usamos. Si no, usamos su propio ID.
    const targetUserId = (isAdmin && requestedUserId) ? requestedUserId : effectiveUser.id;

    const dataToInsert = {
      ...rest,
      type: category || rest.type,
      user_id: targetUserId,
      created_at: new Date().toISOString()
    };
    
    // Insertar en la base de datos
    const { data, error } = await supabase
      .from('places')
      .insert(dataToInsert)
      .select('*, states(*)')
      .single();
    
    if (error) {
      console.error('Error al crear restaurante:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error inesperado:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async ({ cookies, request }) => {
  try {
    const authResult = await getEffectiveUser(request, cookies);
    if (!authResult) {
       return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
    }

    const { effectiveUser, isAdmin } = authResult;
    
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;
    const isMagicOrImpersonating = !accessToken || !refreshToken || (effectiveUser as any).isImpersonated;

    let supabase;
    if (isMagicOrImpersonating || isAdmin) {
      const { createClient } = await import("@supabase/supabase-js");
      supabase = createClient(
        import.meta.env.PUBLIC_SUPABASE_URL,
        import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
      );
    } else {
      supabase = await createAuthenticatedClient(accessToken!, refreshToken!);
    }
    
    let query = supabase.from('places').select('*').order('name');
    
    // Si no es admin, solo sus restaurantes
    if (!isAdmin) {
      query = query.eq('user_id', effectiveUser.id);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error al obtener restaurantes:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ data }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error inesperado:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};