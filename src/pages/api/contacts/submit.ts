export const prerender = false;

import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { resend } from "../../../lib/resend";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, message, token } = await request.json();

    if (!email || !message || !token) {
      return new Response(JSON.stringify({ error: "Faltan datos (email, mensaje, captcha)" }), { status: 400 });
    }

    // Verificar Turnstile token
    const { verifyTurnstileToken } = await import("../../../lib/turnstile");
    const verifyData = await verifyTurnstileToken(token);
    
    if (!verifyData.success) {
      return new Response(JSON.stringify({ error: "Verificación de CAPTCHA fallida" }), { status: 400 });
    }

    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Guardar en la base de datos (Usando admin para bypass RLS)
    const { data: contact, error: insertError } = await supabaseAdmin
      .from("contact")
      .insert([{ email, message }])
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { status: 400 });
    }

    // 2. Enviar email de notificación al Administrador
    if (resend) {
      await resend.emails.send({
        from: 'Menús BysMax <info@bysmax.com>',
        to: ['info@bysmax.com'],
        replyTo: email,
        subject: '📩 Nuevo mensaje de contacto recibido',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
            <div style="background: #000; padding: 20px; text-align: center;">
              <h2 style="color: white; margin: 0;">Nuevo Contacto</h2>
            </div>
            <div style="padding: 24px;">
              <p>Has recibido un nuevo mensaje a través del formulario de contacto:</p>
              <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-top: 20px; border: 1px solid #e2e8f0;">
                <p><strong>De:</strong> ${email}</p>
                <p><strong>Mensaje:</strong></p>
                <p style="white-space: pre-wrap;">${message}</p>
              </div>
              <p style="margin-top: 24px; font-size: 12px; color: #64748b;">
                Puedes responder directamente a este email para contactar al usuario.
              </p>
            </div>
          </div>
        `
      });

      // 3. (Opcional) Confirmación al usuario
      try {
        await resend.emails.send({
          from: 'Menús BysMax <info@bysmax.com>',
          to: [email],
          subject: 'Confirmación: Hemos recibido tu mensaje',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
              <div style="background: #10b981; padding: 20px; text-align: center;">
                <h2 style="color: white; margin: 0;">¡Hola!</h2>
              </div>
              <div style="padding: 24px;">
                <p>Gracias por contactarnos. Hemos recibido tu mensaje correctamente y nuestro equipo lo revisará lo antes posible.</p>
                <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-top: 20px; border: 1px solid #e2e8f0;">
                  <p><strong>Tu mensaje:</strong></p>
                  <p style="font-style: italic;">"${message}"</p>
                </div>
                <p style="margin-top: 24px;">Saludos,<br>El equipo de BySMax</p>
              </div>
            </div>
          `
        });
      } catch (confirmError) {
        console.error("Error sending confirmation email:", confirmError);
      }
    }

    return new Response(JSON.stringify({ success: true, contact }), { status: 200 });

  } catch (error: any) {
    console.error("Contact submit error:", error);
    return new Response(JSON.stringify({ error: "Error interno" }), { status: 500 });
  }
};
