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

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();

    const { restaurant_id, name, menu, description, address, menu_type, image,
            is_active, start_date, end_date, availability_start, availability_end,
            display_order, availability_days } = body;

    if (!restaurant_id || !name) {
      return new Response(
        JSON.stringify({ error: "Faltan campos obligatorios" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabase
      .from("menus")
      .insert([{
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
        user_id: user.id,
      }])
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
