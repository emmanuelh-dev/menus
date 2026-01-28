export const prerender = false;

import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { createAuthenticatedClient } from "../../../lib/supabase";

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
    }

    // Verificar que el usuario sea admin
    const supabaseUser = await createAuthenticatedClient(accessToken, refreshToken);
    const { data: { user } } = await supabaseUser.auth.getUser();

    const isAdmin = user?.email === 'emmanuelh.dev@gmail.com' || user?.email === 'admin@bysmax.com';
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Prohibido" }), { status: 403 });
    }

    // Intentar obtener la Service Role Key (debe estar en el servidor)
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ 
        error: "SUPABASE_SERVICE_ROLE_KEY no configurada. Por favor agrégala a tu archivo .env para poder listar los usuarios." 
      }), { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    const { data: { users }, error } = await adminClient.auth.admin.listUsers();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    // Formatear la data para el componente
    const formattedUsers = users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.user_metadata?.name || '',
        whatsapp: u.user_metadata?.whatsapp || '',
        last_sign_in_at: u.last_sign_in_at,
        created_at: u.created_at
    }));

    return new Response(JSON.stringify({ users: formattedUsers }), { status: 200 });
  } catch (error) {
    console.error("List users error:", error);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), { status: 500 });
  }
};
