export const prerender = false;
import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  // Verificar autenticación
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  if (!accessToken || !refreshToken) {
    return new Response(
      JSON.stringify({ error: 'No autorizado' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Crear cliente de Supabase con autenticación
    const supabase = await createAuthenticatedClient(accessToken, refreshToken);
    
    // Obtener usuario autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
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
    
    // Mapear category a type para la base de datos
    const { category, ...rest } = restaurantData;
    const dataToInsert = {
      ...rest,
      type: category || rest.type,
      user_id: user.id,
      created_at: new Date().toISOString()
    };
    
    // Insertar en la base de datos
    const { data, error } = await supabase
      .from('places')
      .insert(dataToInsert)
      .select()
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

export const GET: APIRoute = async ({ cookies }) => {
  // Verificar autenticación
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  if (!accessToken || !refreshToken) {
    return new Response(
      JSON.stringify({ error: 'No autorizado' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Crear cliente de Supabase con autenticación
    const supabase = await createAuthenticatedClient(accessToken, refreshToken);
    
    // Obtener usuario autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Obtener solo restaurantes del usuario
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    
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