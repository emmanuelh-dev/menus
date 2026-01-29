export const prerender = false;

import type { APIRoute } from "astro";
import { createAuthenticatedClient } from "../../../lib/supabase";

export const GET: APIRoute = async ({ cookies }) => {
	try {
		const accessToken = cookies.get("sb-access-token")?.value;
		const refreshToken = cookies.get("sb-refresh-token")?.value;

		if (!accessToken || !refreshToken) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
		}

		const supabase = await createAuthenticatedClient(accessToken, refreshToken);
		const { data: contacts, error } = await supabase
			.from("contact")
			.select("*")
			.order("created_at", { ascending: false });

		if (error) {
			return new Response(JSON.stringify({ error: error.message }), { status: 400 });
		}

		return new Response(JSON.stringify({ contacts }), { status: 200 });
	} catch (error) {
		return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
	}
};
