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

		const startToday = new Date();
		startToday.setHours(0, 0, 0, 0);
		const startWeek = new Date(startToday);
		startWeek.setDate(startWeek.getDate() - 6);

		let placeVisitStats: Array<{
			placeId: number;
			name: string;
			shortName: string;
			todayVisits: number;
			weekVisits: number;
			weekUniqueVisitors: number;
		}> = [];

		try {
			let allPlacesQuery = supabase
				.from("places")
				.select("id, name, short_name, user_id");

			if (!isRealAdmin || isImpersonating) {
				allPlacesQuery = allPlacesQuery.eq("user_id", userId);
			}

			const { data: allPlaces } = await allPlacesQuery;
			const placeMap = new Map<number, { name: string; short_name: string }>();

			(allPlaces || []).forEach((place: any) => {
				placeMap.set(place.id, {
					name: place.name || "Sin nombre",
					short_name: place.short_name || "",
				});
			});

			const allPlaceIds = Array.from(placeMap.keys());
			if (allPlaceIds.length > 0) {
				const { data: visitRows } = await supabase
					.from("place_menu_visits")
					.select("place_id, visitor_id, visited_at")
					.in("place_id", allPlaceIds)
					.gte("visited_at", startWeek.toISOString());

				const statsMap = new Map<number, {
					todayVisits: number;
					weekVisits: number;
					weekVisitors: Set<string>;
				}>();

				(visitRows || []).forEach((row: any) => {
					const placeId = Number(row.place_id);
					if (!statsMap.has(placeId)) {
						statsMap.set(placeId, {
							todayVisits: 0,
							weekVisits: 0,
							weekVisitors: new Set<string>(),
						});
					}

					const current = statsMap.get(placeId)!;
					const visitedAt = new Date(row.visited_at);

					current.weekVisits += 1;
					if (row.visitor_id) {
						current.weekVisitors.add(String(row.visitor_id));
					}

					if (visitedAt >= startToday) {
						current.todayVisits += 1;
					}
				});

				placeVisitStats = Array.from(statsMap.entries())
					.map(([placeId, stats]) => ({
						placeId,
						name: placeMap.get(placeId)?.name || "Sin nombre",
						shortName: placeMap.get(placeId)?.short_name || "",
						todayVisits: stats.todayVisits,
						weekVisits: stats.weekVisits,
						weekUniqueVisitors: stats.weekVisitors.size,
					}))
					.sort((a, b) => b.weekVisits - a.weekVisits)
					.slice(0, 10);
			}
		} catch (_analyticsError) {
			placeVisitStats = [];
		}

		return new Response(
			JSON.stringify({
				user,
				isAdmin: isAdminForUI,
				places: places || [],
				totalPlaces: totalPlaces || 0,
				recentComments: recentComments || [],
				history,
				placeVisitStats,
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
