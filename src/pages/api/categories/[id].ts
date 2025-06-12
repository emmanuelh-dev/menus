export const prerender = false;
import type { APIRoute } from 'astro';
import { createSupabaseClient } from '../../../lib/supabase';

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  if (!accessToken || !refreshToken) {
    return new Response(
      JSON.stringify({ error: 'No autorizado' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createSupabaseClient(accessToken, refreshToken);
    const categoryId = params.id;

    if (!categoryId) {
      return new Response(
        JSON.stringify({ error: 'ID de categoría requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Primero verificar si la categoría existe
    const { data: category, error: fetchError } = await supabase
      .from('menu_categories')
      .select('id')
      .eq('id', categoryId)
      .single();

    if (fetchError || !category) {
      return new Response(
        JSON.stringify({ error: 'Categoría no encontrada' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Eliminar la categoría
    const { error } = await supabase
      .from('menu_categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ message: 'Categoría eliminada exitosamente' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
