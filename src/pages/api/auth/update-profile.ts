export const prerender = false;

import type { APIRoute } from "astro";
import { createAuthenticatedClient } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
    }

    const { name, whatsapp } = await request.json();

    const supabase = await createAuthenticatedClient(accessToken, refreshToken);
    
    // Actualizar metadata del usuario en Auth
    const { data, error } = await supabase.auth.updateUser({
      data: { 
        name: name || null,
        whatsapp: whatsapp || null
      }
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, user: data.user }), { status: 200 });
  } catch (error) {
    console.error("Update profile error:", error);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), { status: 500 });
  }
};
