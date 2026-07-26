export const prerender = false;

import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { invalidateByTag } from "@vercel/functions";
import { resend } from "../../../lib/resend";

export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = await request.json();

    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    // Usamos el cliente admin para poder obtener info de usuarios si es necesario
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Insertar la reseña
    const { data: review, error: insertError } = await supabaseAdmin
      .from("reviews")
      .insert([payload])
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { status: 400 });
    }

    // 2. Obtener información del lugar y del dueño
    const { data: place, error: placeError } = await supabaseAdmin
      .from("places")
      .select("name, user_id, short_name, type")
      .eq("id", payload.place_id)
      .single();

    // Una reseña cambia el rating y el conteo que se pintan en la ficha y en
    // los listados. Sin este purge, con el s-maxage de un año la reseña no se
    // vería nunca. El tag usa short_name tal cual (es el slug de la URL).
    if (place?.short_name) {
      try {
        await Promise.all([
          invalidateByTag(`place-${place.short_name}`),
          invalidateByTag("places-all"),
        ]);
      } catch (purgeError) {
        // Best-effort: la reseña ya quedó guardada, no se revierte por esto.
        console.error("submit-review: falló el purge de cache", purgeError);
      }
    }

    if (place && place.user_id && resend) {
      // 3. Obtener el email del dueño desde Auth
      const { data: { user: owner }, error: ownerError } = await supabaseAdmin.auth.admin.getUserById(place.user_id);

      if (owner && owner.email) {
        // 4. Enviar notificación al dueño
        await resend.emails.send({
          from: 'Menús BysMax <info@bysmax.com>',
          to: [owner.email],
          replyTo: 'info@bysmax.com',
          subject: `⭐ Nueva reseña disponible: ${place.name}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
              <div style="background: #10b981; padding: 30px; text-align: center;">
                <h2 style="color: white; margin: 0; font-size: 20px;">¡Tienes una nueva reseña!</h2>
              </div>
              <div style="padding: 30px; background: white;">
                <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">
                  Un cliente ha dejado un comentario en <strong>${place.name}</strong>:
                </p>
                
                <div style="background: #f8fafc; p: 20px; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid #10b981; padding: 15px;">
                  <p style="margin: 0; font-size: 16px; color: #1e293b; font-style: italic;">"${payload.comment}"</p>
                  <p style="margin: 10px 0 0 0; font-size: 12px; font-weight: bold; color: #fbbf24;">
                    ${'★'.repeat(payload.rate)}${'☆'.repeat(5 - payload.rate)}
                  </p>
                </div>

                <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
                  <strong>Cliente:</strong> ${payload.content?.author?.name || 'Anónimo'}<br>
                  <strong>WhatsApp:</strong> ${payload.content?.author?.whatsapp || 'No proporcionado'}
                </p>

                <div style="margin-top: 30px; text-align: center;">
                  <a href="https://menus.bysmax.com/admin/place/${payload.place_id}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 14px;">Gestionar en mi Panel</a>
                </div>
              </div>
            </div>
          `
        });

        // 5. Notificar también al admin (copia detallada)
        await resend.emails.send({
          from: 'Menús BysMax <info@bysmax.com>',
          to: ['info@bysmax.com'],
          subject: `💬 Nueva reseña en ${place.name} (${payload.rate}★)`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
              <h2 style="color: #10b981; margin-top: 0;">¡Nueva Actividad!</h2>
              <p>Se ha publicado una reseña en <strong>${place.name}</strong>:</p>
              
              <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
                <p style="margin: 0; font-style: italic;">"${payload.comment}"</p>
                <p style="margin: 10px 0 0 0; color: #fbbf24;">${'★'.repeat(payload.rate)}${'☆'.repeat(5 - payload.rate)}</p>
              </div>

              <ul style="list-style: none; padding: 0; font-size: 14px; color: #64748b;">
                <li><strong>Cliente:</strong> ${payload.content?.author?.name || 'Anónimo'}</li>
                <li><strong>WhatsApp:</strong> ${payload.content?.author?.whatsapp || 'No proporcionado'}</li>
                <li><strong>Dueño avisado:</strong> ${owner.email}</li>
              </ul>

              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
              <a href="https://menus.bysmax.com/admin/place/${payload.place_id}" style="display: inline-block; padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px;">Ver en el Panel</a>
            </div>
          `
        });
      }
    }

    return new Response(JSON.stringify({ success: true, review }), { status: 200 });

  } catch (error: any) {
    console.error("Review API error:", error);
    return new Response(JSON.stringify({ error: "Error interno" }), { status: 500 });
  }
};
