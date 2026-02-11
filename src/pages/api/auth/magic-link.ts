export const prerender = false;

import type { APIRoute } from "astro";
import { createAuthenticatedClient } from "../../../lib/supabase";
import { getEffectiveUser } from "../../../middleware/auth";
import { randomUUID } from "node:crypto";

export const GET: APIRoute = async ({ cookies, request }) => {
    const authResult = await getEffectiveUser(request, cookies);
    if (!authResult) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { effectiveUser } = authResult;
    const url = new URL(request.url);
    const placeId = url.searchParams.get("placeId");

    if (!placeId) {
        return new Response(JSON.stringify({ error: "Place ID is required" }), { status: 400 });
    }

    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;
    const supabase = await createAuthenticatedClient(accessToken!, refreshToken!);

    // 1. Verificar propiedad y obtener token actual
    const { data: place, error: placeError } = await supabase
        .from("places")
        .select("id, user_id, content")
        .eq("id", placeId)
        .single();

    if (placeError || !place) {
        return new Response(JSON.stringify({ error: "Place not found" }), { status: 404 });
    }

    // Solo el dueño (o el efectivo si hay impersonación) puede ver su propio link
    if (place.user_id !== effectiveUser.id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    let magicToken = place.content?.admin?.magic_token;

    // 2. Si no tiene token, generar uno permanente
    if (!magicToken) {
        magicToken = randomUUID();
        const updatedContent = {
            ...(place.content || {}),
            admin: {
                ...(place.content?.admin || {}),
                magic_token: magicToken
            }
        };

        const { error: updateError } = await supabase
            .from("places")
            .update({ content: updatedContent })
            .eq("id", placeId);

        if (updateError) {
            console.error("Error saving magic token:", updateError);
            return new Response(JSON.stringify({ error: "Failed to create magic token" }), { status: 500 });
        }
    }

    // 3. Construir el link permanente
    const magicLinkUrl = new URL(import.meta.env.SITE || "https://menus.bysmax.com");
    magicLinkUrl.pathname = "/auth/magic";
    magicLinkUrl.searchParams.set("t", magicToken);
    magicLinkUrl.searchParams.set("p", placeId);

    return new Response(JSON.stringify({ magicLink: magicLinkUrl.toString() }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });
};
