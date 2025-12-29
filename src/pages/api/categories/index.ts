export const prerender = false;
import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '../../../lib/supabase';

export const GET: APIRoute = async ({ url, cookies }) => {
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  if (!accessToken || !refreshToken) {
    return new Response(
      JSON.stringify({ error: 'No autorizado' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = await createAuthenticatedClient(accessToken, refreshToken);
    const restaurantId = url.searchParams.get('restaurant_id');

    if (!restaurantId) {
      return new Response(
        JSON.stringify({ error: 'restaurant_id es requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: categories, error } = await supabase
      .from('menu_categories')
      .select(`
        *,
        parent:menu_categories!parent_id (
          id,
          name
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('display_order');

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ categories }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  if (!accessToken || !refreshToken) {
    return new Response(
      JSON.stringify({ error: 'No autorizado' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = await createAuthenticatedClient(accessToken, refreshToken);
    const categoryData = await request.json();

    if (!categoryData.name || !categoryData.restaurant_id) {
      return new Response(
        JSON.stringify({ error: 'El nombre y restaurant_id son obligatorios' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await supabase
      .from('menu_categories')
      .insert([categoryData])
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ category: data }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
