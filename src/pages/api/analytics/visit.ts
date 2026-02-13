export const prerender = false;

import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json().catch(() => null);
		const placeId = Number(body?.placeId);
		const visitorId = String(body?.visitorId || "").trim();
		const path = String(body?.path || "").slice(0, 255);
		const referer = request.headers.get("referer") || "";
		const userAgent = request.headers.get("user-agent") || "";

		console.log("[analytics/visit] incoming", {
			placeId,
			visitorId,
			path,
			referer,
		});

		if (!placeId || Number.isNaN(placeId) || !visitorId) {
			console.error("[analytics/visit] invalid payload", body);
			return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 });
		}

		const supabase = createClient(
			import.meta.env.PUBLIC_SUPABASE_URL,
			import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
			{ auth: { persistSession: false } },
		);

		const { error } = await supabase.from("place_menu_visits").insert({
			place_id: placeId,
			visitor_id: visitorId,
			path,
			user_agent: userAgent,
			referer,
		});

		if (error) {
			console.error("[analytics/visit] insert failed", {
				message: error.message,
				details: error.details,
				hint: error.hint,
				code: error.code,
			});
			return new Response(JSON.stringify({ error: "Insert failed", details: error.message }), { status: 500 });
		}

		console.log("[analytics/visit] saved", { placeId, path });

		return new Response(null, { status: 204 });
	} catch (error) {
		console.error("Visit tracking error:", error);
		return new Response(JSON.stringify({ error: "Internal Server Error" }), {
			status: 500,
		});
	}
};
