export const prerender = false;
import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '../../../lib/supabase';

const ADMIN_EMAILS = [
  "emmanuelh.dev@gmail.com",
  "admin@bysmax.com",
  "e805177@gmail.com",
];

export const GET: APIRoute = async ({ params, cookies }) => {
  // Verificar autenticación
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  if (!accessToken || !refreshToken) {
    return new Response(
      JSON.stringify({ error: 'No autorizado' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { id } = params;
  if (!id) {
    return new Response(
      JSON.stringify({ error: 'ID de restaurante no proporcionado' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = await createAuthenticatedClient(accessToken, refreshToken);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email || "");
    
    // Obtener el restaurante por ID
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return new Response(
        JSON.stringify({ error: 'Restaurante no encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar propiedad o admin
    if (data.user_id !== user.id && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'No tienes permisos para ver este establecimiento' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
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

export const PUT: APIRoute = async ({ request, params, cookies }) => {
  // Verificar autenticación
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  if (!accessToken || !refreshToken) {
    return new Response(
      JSON.stringify({ error: 'No autorizado' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { id } = params;
  if (!id) {
    return new Response(
      JSON.stringify({ error: 'ID de restaurante no proporcionado' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = await createAuthenticatedClient(accessToken, refreshToken);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email || "");

    // Verificar que el restaurante pertenezca al usuario (o sea admin)
    const { data: existingPlace } = await supabase
      .from('places')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existingPlace) {
      return new Response(
        JSON.stringify({ error: 'Restaurante no encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (existingPlace.user_id !== user.id && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'No tienes permiso para editar este establecimiento' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener datos del cuerpo de la solicitud
    const restaurantData = await request.json();
    
    // Validar datos mínimos requeridos
    const isContentOnlyUpdate = Object.keys(restaurantData).length === 1 && 'content' in restaurantData;
    
    if (!isContentOnlyUpdate && (!restaurantData.name || !restaurantData.address)) {
      return new Response(
        JSON.stringify({ error: 'El nombre y la dirección son obligatorios' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Mapear type
    const { type, ...rest } = restaurantData;
    const dataToUpdate = {
      ...rest,
      type: type || rest.type,
    };
    
    // Actualizar en la base de datos
    const { data, error } = await supabase
      .from('places')
      .update(dataToUpdate)
      .eq('id', id)
      .select('*, states(*)')
      .single();
    
    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true, data }),
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

export const DELETE: APIRoute = async ({ params, cookies }) => {
  // Verificar autenticación
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  if (!accessToken || !refreshToken) {
    return new Response(
      JSON.stringify({ error: 'No autorizado' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { id } = params;
  if (!id) {
    return new Response(
      JSON.stringify({ error: 'ID de restaurante no proporcionado' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = await createAuthenticatedClient(accessToken, refreshToken);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email || "");

    // Verificar propiedad o admin
    const { data: existingPlace } = await supabase
      .from('places')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existingPlace) {
      return new Response(
        JSON.stringify({ error: 'Restaurante no encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (existingPlace.user_id !== user.id && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'No tienes permiso para eliminar este establecimiento' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Eliminar de la base de datos
    const { error } = await supabase
      .from('places')
      .delete()
      .eq('id', id);
    
    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true }),
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