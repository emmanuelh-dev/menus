import type { APIRoute } from "astro";
import { createAuthenticatedClient } from "../../../lib/supabase";

export const prerender = false;

export const GET: APIRoute = async ({ params, cookies }) => {
  const itemId = params.id;

  const accessToken = cookies.get("sb-access-token");
  const refreshToken = cookies.get("sb-refresh-token");

  if (!accessToken || !refreshToken) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = await createAuthenticatedClient(accessToken.value, refreshToken.value);

  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("id", itemId)
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const itemId = params.id;

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

    const { name, description, base_price, image, ingredients, allergens, calories, 
            preparation_time, display_order, is_active, is_featured, is_vegetarian, 
            is_vegan, is_gluten_free, is_spicy, spicy_level, stock_quantity } = body;

    if (!name || base_price === undefined) {
      return new Response(
        JSON.stringify({ error: "El nombre y el precio son obligatorios" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabase
      .from("menu_items")
      .update({
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
      })
      .eq("id", itemId)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const itemId = params.id;

  const accessToken = cookies.get("sb-access-token");
  const refreshToken = cookies.get("sb-refresh-token");

  if (!accessToken || !refreshToken) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = await createAuthenticatedClient(accessToken.value, refreshToken.value);

  const { error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
