import type { APIRoute } from "astro";
import { createAuthenticatedClient } from "../../../lib/supabase";

export const prerender = false;

export const GET: APIRoute = async ({ params, cookies }) => {
  const menuId = params.id;

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
    .from("menus")
    .select(`
      *,
      restaurants (
        id,
        name
      )
    `)
    .eq("id", menuId)
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
  const menuId = params.id;

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

    const { restaurant_id, name, menu, description, address, menu_type, image,
            is_active, start_date, end_date, availability_start, availability_end,
            display_order, availability_days } = body;

    if (!restaurant_id || !name) {
      return new Response(
        JSON.stringify({ error: "El restaurante y el nombre son obligatorios" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabase
      .from("menus")
      .update({
        restaurant_id,
        name,
        menu,
        description,
        address,
        menu_type,
        image,
        is_active,
        start_date,
        end_date,
        availability_start,
        availability_end,
        display_order,
        availability_days,
      })
      .eq("id", menuId)
      .select(`
        *,
        restaurants (
          id,
          name
        )
      `)
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
  const menuId = params.id;

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
    .from("menus")
    .delete()
    .eq("id", menuId);

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
