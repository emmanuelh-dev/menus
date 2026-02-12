export const prerender = false;

import type { APIRoute } from "astro";
import { createAuthenticatedClient } from "../../../lib/supabase";

export const GET: APIRoute = async ({ cookies, request }) => {
	try {
		const { getEffectiveUser } = await import("../../../middleware/auth");
		const authResult = await getEffectiveUser(request, cookies);

		if (!authResult) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
			});
		}

		const { realUser: user, effectiveUser, isAdmin: isRealAdmin } = authResult;
		const userId = effectiveUser.id;
        const isImpersonating = !!(effectiveUser as any).isImpersonated;
        const isAdminForUI = isImpersonating ? false : isRealAdmin;

		const url = new URL(request.url);
		const page = parseInt(url.searchParams.get("page") || "1");
		const pageSize = parseInt(url.searchParams.get("pageSize") || "50");
		const search = url.searchParams.get("search") || "";
		const sortBy = url.searchParams.get("sortBy") || "newest";
		const filterType = url.searchParams.get("type") || "";
		
		const accessToken = cookies.get("sb-access-token")?.value;
		const refreshToken = cookies.get("sb-refresh-token")?.value;
		const isMagicOrImpersonating = !accessToken || !refreshToken || isImpersonating;

		// Si es Magic Link o Impersonación, usamos Service Role para saltar el RLS y ver la data del usuario destino
		let supabase;
		if (isMagicOrImpersonating) {
			const { createClient } = await import("@supabase/supabase-js");
			supabase = createClient(
				import.meta.env.PUBLIC_SUPABASE_URL,
				import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
				{ auth: { persistSession: false } }
			);
		} else {
			supabase = await createAuthenticatedClient(accessToken!, refreshToken!);
		}

		let query = supabase.from("places").select(
			`
				id,
				name,
				address,
				formatted_address,
				lat,
				lng,
				type,
				category,
				short_name,
				image,
				rating,
				priceRange,
				hours,
				featured,
				state_id,
				municipality_id,
				user_id,
				created_at,
				updated_at,
				states (
					id,
					name,
					slug
				)
			`,
			{ count: "exact" },
		);

		// Si no es admin real O si es admin pero está impersonando a alguien específico
		if (!isRealAdmin || isImpersonating) {
			query = query.eq("user_id", userId);
		}

		if (search) {
			query = query.ilike("name", `%${search}%`);
		}

		if (filterType) {
			query = query.eq("type", filterType);
		}

		// Sorting
		if (sortBy === "name") {
			query = query.order("name", { ascending: true });
		} else if (sortBy === "oldest") {
			query = query.order("created_at", { ascending: true });
		} else if (sortBy === "updated") {
			query = query.order("updated_at", { ascending: false, nullsFirst: false });
		} else {
			query = query.order("created_at", { ascending: false });
		}

		// Pagination
		const from = (page - 1) * pageSize;
		const to = from + pageSize - 1;

		const { data: places, count: totalPlaces } = await query.range(from, to);

		const commentsQuery = supabase.from("reviews").select(
			`
				*,
				places (
					name
				)
			`,
		);

		if (!isRealAdmin || isImpersonating) {
			commentsQuery.in(
				"place_id",
				(places || []).map((p: any) => p.id),
			);
		}

		const { data: recentComments } = await commentsQuery
			.order("created_at", { ascending: false })
			.limit(20);

		// Only fetch history if admin real and NOT impersonating
		let history: any[] = [];
		if (isRealAdmin && !isImpersonating) {
			const { data: historyData } = await supabase
				.from("place_content_history")
				.select(
					`
					*,
					places (
						name
					)
				`,
				)
				.order("created_at", { ascending: false })
				.limit(10);
			history = historyData || [];
		}

		return new Response(
			JSON.stringify({
				user,
				isAdmin: isAdminForUI,
				places: places || [],
				totalPlaces: totalPlaces || 0,
				recentComments: recentComments || [],
				history,
			}),
			{
				status: 200,
				headers: {
					"Content-Type": "application/json",
				},
			},
		);
	} catch (error) {
		console.error("Dashboard data error:", error);
		return new Response(
			JSON.stringify({ error: "Internal Server Error" }),
			{ status: 500 },
		);
	}
};
