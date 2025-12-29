import type { APIRoute } from "astro";
import { createAuthenticatedClient } from "../../../lib/supabase";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const accessToken = cookies.get("sb-access-token");
  const refreshToken = cookies.get("sb-refresh-token");

  if (!accessToken || !refreshToken) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = await createAuthenticatedClient(accessToken.value, refreshToken.value);

  try {
    const body = await request.json();

    const { category_id, restaurant_id, name, description, base_price, image, 
            ingredients, allergens, calories, preparation_time, display_order, 
            is_active, is_featured, is_vegetarian, is_vegan, is_gluten_free, 
            is_spicy, spicy_level, stock_quantity } = body;

    if (!category_id || !restaurant_id || !name || base_price === undefined) {
      return new Response(
        JSON.stringify({ error: "Faltan campos obligatorios" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabase
      .from("menu_items")
      .insert([{
        category_id,
        restaurant_id,
        name,
        description,
        base_price,
        image,
        ingredients,
        allergens,
        calories,
        preparation_time,
        display_order,
        is_active,
        is_featured,
        is_vegetarian,
        is_vegan,
        is_gluten_free,
        is_spicy,
        spicy_level,
        stock_quantity,
      }])
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
