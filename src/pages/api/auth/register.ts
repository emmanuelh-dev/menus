export const prerender = false;

import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { email, password, name, whatsapp, business_name, token } = await request.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email y contraseña son requeridos" }),
        { status: 400 }
      );
    }

    // Verificar Turnstile token
    const { verifyTurnstileToken } = await import("../../../lib/turnstile");
    const verifyData = await verifyTurnstileToken(token);
    
    if (!verifyData.success) {
      return new Response(JSON.stringify({ error: "Verificación de CAPTCHA fallida" }), { status: 400 });
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "La contraseña debe tener al menos 6 caracteres" }),
        { status: 400 }
      );
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || null,
          whatsapp: whatsapp || null,
          business_name: business_name || null,
        },
      },
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400 }
      );
    }

    if (data.session) {
      cookies.set("sb-access-token", data.session.access_token, {
        path: "/",
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });

      cookies.set("sb-refresh-token", data.session.refresh_token, {
        path: "/",
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    // --- Enviar Email de Bienvenida Automático ---
    try {
      const { resend } = await import("../../../lib/resend");
      if (resend && email) {
        await resend.emails.send({
          from: 'Menús BysMax <info@bysmax.com>',
          to: [email],
          replyTo: 'info@bysmax.com',
          subject: `¡Bienvenido a Menús BysMax, ${name || 'amigo(a)'}!`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #f0f0f0; border-radius: 24px; overflow: hidden;">
              <div style="background: #1052ba; padding: 40px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">¡Tu menú digital está listo!</h1>
              </div>
              <div style="padding: 40px; background: white;">
                <p style="font-size: 18px; color: #262626; font-weight: bold;">¡Hola ${name || 'hola'}!</p>
                <p style="color: #737373; line-height: 1.6; font-size: 16px;">
                  Gracias por unirte a <strong>Menús BysMax</strong>. Hemos registrado correctamente tu negocio 
                  ${business_name ? `<strong>"${business_name}"</strong>` : 'tu negocio'}.
                </p>
                <div style="margin: 32px 0; background: #fafafa; padding: 24px; border-radius: 16px; border: 1px solid #e5e5e5;">
                  <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: bold; color: #525252;">¿Qué sigue?</p>
                  <ul style="margin: 0; padding-left: 20px; color: #737373; font-size: 14px; line-height: 2;">
                    <li>Entra a tu panel de administración</li>
                    <li>Sube las fotos de tus platillos</li>
                    <li>¡Comparte tu link con tus clientes!</li>
                  </ul>
                </div>
                <p style="color: #737373; font-size: 14px;">
                  Si tienes cualquier duda, simplemente responde a este correo y nuestro equipo de soporte te ayudará de inmediato.
                </p>
              </div>
              <div style="background: #fafafa; padding: 20px; text-align: center; border-top: 1px solid #f0f0f0;">
                <p style="margin: 0; color: #a3a3a3; font-size: 12px;">&copy; ${new Date().getFullYear()} BysMax. Todos los derechos reservados.</p>
              </div>
            </div>
          `
        });
        // --- Notificar al Administrador ---
        await resend.emails.send({
          from: 'Menús BysMax <info@bysmax.com>',
          to: ['info@bysmax.com'],
          subject: '🔔 Nuevo Registro en la Plataforma',
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
              <h2 style="color: #1052ba;">¡Nuevo usuario registrado!</h2>
              <p>Se ha registrado un nuevo negocio en la plataforma:</p>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Nombre:</strong> ${name || 'N/A'}</li>
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>Negocio:</strong> ${business_name || 'N/A'}</li>
                <li><strong>WhatsApp:</strong> ${whatsapp || 'N/A'}</li>
                <li><strong>Fecha:</strong> ${new Date().toLocaleString()}</li>
              </ul>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
              <a href="${import.meta.env.SITE || 'https://menus.bysmax.com'}/admin/users" style="display: inline-block; padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">Ver en el Panel</a>
            </div>
          `
        });
      }
    } catch (emailError) {
      console.error("Auto-welcome email failed:", emailError);
      // No bloqueamos el registro si el email falla
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        user: data.user,
        session: data.session,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return new Response(
      JSON.stringify({ error: "Error al crear la cuenta" }),
      { status: 500 }
    );
  }
};
