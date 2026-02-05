import type { APIRoute } from "astro";
import { createAuthenticatedClient } from "../../../lib/supabase";
import { isAdmin as checkAdmin } from "../../../lib/admin";
import { getEffectiveUser } from "../../../middleware/auth";

export const prerender = false;

export const GET: APIRoute = async ({ cookies, request }) => {
  const authResult = await getEffectiveUser(request, cookies);

  if (!authResult) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { effectiveUser, isAdmin: isRealAdmin } = authResult;
  const isImpersonating = 'isImpersonated' in effectiveUser && effectiveUser.isImpersonated;

  let supabase;
  if (isImpersonating) {
    const { createClient } = await import("@supabase/supabase-js");
    supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
  } else {
    supabase = await createAuthenticatedClient(
      cookies.get("sb-access-token")!.value,
      cookies.get("sb-refresh-token")!.value
    );
  }

  try {
    // Si estamos impersonando, tratamos al usuario como cliente normal (no admin) para ver lo suyo
    const viewAsAdmin = isRealAdmin && !isImpersonating;

    // Obtener menús
    let menusQuery = supabase
      .from("menus")
      .select(`
        *,
        restaurants (
          id,
          name
        )
      `);

    if (!viewAsAdmin) {
      menusQuery = menusQuery.eq("user_id", effectiveUser.id);
    }
    
    const { data: menus, error: menusError } = await menusQuery.order("created_at", { ascending: false });

    if (menusError) throw menusError;

    // Obtener restaurantes para el selector
    let placesQuery = supabase
      .from("places")
      .select("id, name");

    if (!viewAsAdmin) {
      placesQuery = placesQuery.eq("user_id", effectiveUser.id);
    }

    const { data: restaurants, error: placesError } = await placesQuery.order("name");

    if (placesError) throw placesError;

    return new Response(JSON.stringify({ menus, restaurants }), {
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

export const POST: APIRoute = async ({ request, cookies }) => {
  const authResult = await getEffectiveUser(request, cookies);

  if (!authResult) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { effectiveUser } = authResult;
  const isImpersonating = 'isImpersonated' in effectiveUser && effectiveUser.isImpersonated;

  let supabase;
  if (isImpersonating) {
    const { createClient } = await import("@supabase/supabase-js");
    supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
  } else {
    supabase = await createAuthenticatedClient(
      cookies.get("sb-access-token")!.value,
      cookies.get("sb-refresh-token")!.value
    );
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
        user_id: effectiveUser.id,
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
