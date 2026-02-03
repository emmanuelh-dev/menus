import type { APIRoute } from "astro";
import { resend } from "../../../lib/resend";
import { isAdmin } from "../../../lib/admin";
import { createAuthenticatedClient } from "../../../lib/supabase";
export const prerender = false;
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Verify Admin Session
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
    }

    const supabase = await createAuthenticatedClient(accessToken, refreshToken);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    const { isAdmin } = await import("../../../lib/admin");
    if (authError || !user || !isAdmin(user.email)) {
      return new Response(JSON.stringify({ error: "No tienes permisos de administrador" }), { status: 403 });
    }

    // 2. Parse request
    const { to, subject, html } = await request.json();

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "Faltan datos (to, subject, html)" }), { status: 400 });
    }

    if (!resend) {
      return new Response(JSON.stringify({ error: "Resend no está configurado (RESEND_API_KEY)" }), { status: 500 });
    }

    // 3. Send Email
    const { data, error } = await resend.emails.send({
      from: 'Menús BysMax <info@bysmax.com>',
      to: [to],
      replyTo: 'info@bysmax.com',
      subject: subject,
      html: html,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, data }), { status: 200 });

  } catch (error) {
    console.error("Email API error:", error);
    return new Response(JSON.stringify({ error: "Error interno" }), { status: 500 });
  }
};
