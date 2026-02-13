export const prerender = false;

import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { createAuthenticatedClient } from "../../../lib/supabase";
import { isAdmin } from "../../../lib/admin";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
    }

    const supabaseUser = await createAuthenticatedClient(accessToken, refreshToken);
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user || !isAdmin(user.email)) {
      return new Response(JSON.stringify({ error: "Prohibido" }), { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const userId = typeof body.userId === "string" ? body.userId : "";

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId es requerido" }), { status: 400 });
    }

    if (user.id === userId) {
      return new Response(JSON.stringify({ error: "No puedes eliminar tu propia cuenta" }), { status: 400 });
    }

    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY no configurada" }),
        { status: 500 },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error: placesDeleteError } = await adminClient
      .from("places")
      .delete()
      .eq("user_id", userId);

    if (placesDeleteError) {
      return new Response(JSON.stringify({ error: placesDeleteError.message }), { status: 500 });
    }

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      return new Response(JSON.stringify({ error: deleteUserError.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Delete user error:", error);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), { status: 500 });
  }
};