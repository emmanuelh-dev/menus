export const prerender = false;

import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json().catch(() => null);
		const placeId = Number(body?.placeId);
		const visitorId = String(body?.visitorId || "").trim();
		const path = String(body?.path || "").slice(0, 255);

		if (!placeId || Number.isNaN(placeId) || !visitorId) {
			return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 });
		}

		const supabase = createClient(
			import.meta.env.PUBLIC_SUPABASE_URL,
			import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
			{ auth: { persistSession: false } },
		);

		const userAgent = request.headers.get("user-agent") || "";
		const referer = request.headers.get("referer") || "";

		const { error } = await supabase.from("place_menu_visits").insert({
			place_id: placeId,
			visitor_id: visitorId,
			path,
			user_agent: userAgent,
			referer,
		});

		if (error) {
			return new Response(JSON.stringify({ error: "Insert failed" }), { status: 500 });
		}

		return new Response(null, { status: 204 });
	} catch (error) {
		console.error("Visit tracking error:", error);
		return new Response(JSON.stringify({ error: "Internal Server Error" }), {
			status: 500,
		});
	}
};
