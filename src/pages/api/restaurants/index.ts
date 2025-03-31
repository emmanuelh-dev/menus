import type { APIRoute } from 'astro';
import { createSupabaseClient } from '../../../lib/supabase';

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
    const supabase = createSupabaseClient(accessToken, refreshToken);
    
    // Obtener datos del cuerpo de la solicitud
    const restaurantData = await request.json();
    
    // Validar datos mínimos requeridos
    if (!restaurantData.name || !restaurantData.address) {
      return new Response(
        JSON.stringify({ error: 'El nombre y la dirección son obligatorios' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Agregar fecha de creación
    const dataToInsert = {
      ...restaurantData,
      created_at: new Date().toISOString()
    };
    
    // Insertar en la base de datos
    const { data, error } = await supabase
      .from('restaurants')
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
    const supabase = createSupabaseClient(accessToken, refreshToken);
    
    // Obtener todos los restaurantes
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
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