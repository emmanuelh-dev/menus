export const prerender = false;

import type { APIRoute } from "astro";
import { createAuthenticatedClient } from "../../../../lib/supabase";

const ADMIN_EMAILS = [
	"emmanuelh.dev@gmail.com",
	"admin@bysmax.com",
	"e805177@gmail.com",
];

export const GET: APIRoute = async ({ params, cookies }) => {
	try {
		const accessToken = cookies.get("sb-access-token")?.value;
		const refreshToken = cookies.get("sb-refresh-token")?.value;

		if (!accessToken || !refreshToken) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
			});
		}

		const { id } = params;
		if (!id) {
			return new Response(JSON.stringify({ error: "ID missing" }), {
				status: 400,
			});
		}

		const supabase = await createAuthenticatedClient(accessToken, refreshToken);
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
			});
		}

		const isAdmin = ADMIN_EMAILS.includes(user.email || "");

		// 1. OBTENER EL LUGAR
		const { data: place, error: placeError } = await supabase
			.from("places")
			.select("*, states(*)")
			.eq("id", id)
			.single();

		if (placeError || !place) {
			return new Response(JSON.stringify({ error: "Place not found" }), {
				status: 404,
			});
		}

		// 2. VERIFICAR PROPIEDAD
		if (place.user_id !== user.id && !isAdmin) {
			return new Response(JSON.stringify({ error: "Forbidden" }), {
				status: 403,
			});
		}

		// 3. OBTENER REVIEWS
		const { data: reviews } = await supabase
			.from("reviews")
			.select("*")
			.eq("place_id", id) // Usamos place_id directamente
			.order("created_at", { ascending: false });

		return new Response(
			JSON.stringify({
				place,
				reviews: reviews || [],
				isAdmin,
			}),
			{
				status: 200,
				headers: {
					"Content-Type": "application/json",
				},
			},
		);
	} catch (error) {
		console.error("Place data error:", error);
		return new Response(
			JSON.stringify({ error: "Internal Server Error" }),
			{ status: 500 },
		);
	}
};
