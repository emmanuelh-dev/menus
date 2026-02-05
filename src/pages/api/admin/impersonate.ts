export const prerender = false;

import type { APIRoute } from "astro";
import { createAuthenticatedClient } from "../../../lib/supabase";
import { isAdmin } from "../../../lib/admin";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
    }

    // 1. Verificar que el usuario real sea admin
    const supabase = await createAuthenticatedClient(accessToken, refreshToken);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isAdmin(user.email)) {
      return new Response(JSON.stringify({ error: "Prohibido: Solo admins pueden impersonar" }), { status: 403 });
    }

    const { userId } = await request.json();

    if (userId) {
      // 2. Iniciar impersonación: Guardar el ID del usuario objetivo en una cookie segura
      // Esta cookie NO es httpOnly para permitir detección en cliente si fuera necesario, 
      // pero el middleware es quien la valida seriamente.
      cookies.set("sb-impersonate-id", userId, {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 60 * 60 * 2, // 2 horas de impersonación max
      });

      return new Response(JSON.stringify({ success: true, message: "Impersonación iniciada" }), { status: 200 });
    } else {
      // 3. Detener impersonación: Borrar la cookie
      cookies.delete("sb-impersonate-id", { path: "/" });
      return new Response(JSON.stringify({ success: true, message: "Impersonación finalizada" }), { status: 200 });
    }

  } catch (error: any) {
    console.error("Impersonate error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
