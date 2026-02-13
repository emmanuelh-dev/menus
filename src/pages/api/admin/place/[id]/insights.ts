export const prerender = false;

import type { APIRoute } from "astro";
import { createAuthenticatedClient } from "../../../../../lib/supabase";

function getPublicPath(place: any) {
	if (place?.menu) return place.menu;
	if (place?.type === "motel" && place?.states?.slug) {
		return `/moteles/estados/${place.states.slug}/${place.short_name}`;
	}
	return `/menus/${place?.short_name || ""}`;
}

function getStartOfUtcDay(date: Date) {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export const GET: APIRoute = async ({ params, cookies, request }) => {
	try {
		const { getEffectiveUser } = await import("../../../../../middleware/auth");
		const authResult = await getEffectiveUser(request, cookies);

		if (!authResult) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
		}

		const { effectiveUser, isAdmin: isRealAdmin } = authResult;
		const isImpersonating = !!(effectiveUser as any).isImpersonated;

		const accessToken = cookies.get("sb-access-token")?.value;
		const refreshToken = cookies.get("sb-refresh-token")?.value;

		if (!accessToken || !refreshToken) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
		}

		const id = params.id;
		if (!id) {
			return new Response(JSON.stringify({ error: "Invalid place ID" }), { status: 400 });
		}

		const supabase = await createAuthenticatedClient(accessToken, refreshToken);

		const { data: place, error: placeError } = await supabase
			.from("places")
			.select("id, name, type, menu, short_name, user_id, states(name, slug)")
			.eq("id", id)
			.single();

		if (placeError || !place) {
			return new Response(JSON.stringify({ error: "Place not found" }), { status: 404 });
		}

		if ((!isRealAdmin || isImpersonating) && place.user_id !== effectiveUser.id) {
			return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
		}

		const now = new Date();
		const startToday = getStartOfUtcDay(now);
		const startYesterday = new Date(startToday);
		startYesterday.setUTCDate(startYesterday.getUTCDate() - 1);
		const startWeek = new Date(startToday);
		startWeek.setUTCDate(startWeek.getUTCDate() - 6);

		const [{ data: visits, error: visitsError }, { data: rates }, { data: recentReviews }] = await Promise.all([
			supabase
				.from("place_menu_visits")
				.select("visited_at, visitor_id")
				.eq("place_id", id)
				.gte("visited_at", startWeek.toISOString()),
			supabase.from("reviews").select("rate").eq("place_id", id),
			supabase
				.from("reviews")
				.select("*")
				.eq("place_id", id)
				.order("created_at", { ascending: false })
				.limit(20),
		]);

		const safeVisits = visitsError ? [] : visits || [];
		const todayRows = safeVisits.filter((row: any) => new Date(row.visited_at) >= startToday);
		const yesterdayRows = safeVisits.filter((row: any) => {
			const date = new Date(row.visited_at);
			return date >= startYesterday && date < startToday;
		});
		const weekRows = safeVisits.filter((row: any) => new Date(row.visited_at) >= startWeek);

		const todayUnique = new Set(todayRows.map((row: any) => row.visitor_id)).size;
		const yesterdayUnique = new Set(yesterdayRows.map((row: any) => row.visitor_id)).size;
		const weekUnique = new Set(weekRows.map((row: any) => row.visitor_id)).size;

		const ratesList = (rates || []).map((entry: any) => Number(entry.rate || 0)).filter((rate: number) => rate > 0);
		const totalReviews = ratesList.length;
		const averageRating = totalReviews > 0
			? Number((ratesList.reduce((sum: number, rate: number) => sum + rate, 0) / totalReviews).toFixed(1))
			: 0;

		const statesData: any = (place as any)?.states;
		const stateName = Array.isArray(statesData)
			? statesData[0]?.name || ""
			: statesData?.name || "";
		const location = stateName;
		const publicPath = getPublicPath(place);

		return new Response(
			JSON.stringify({
				place: {
					id: place.id,
					name: place.name,
					location,
					short_name: place.short_name,
					publicPath,
				},
				visits: {
					today: { total: todayRows.length, unique: todayUnique },
					yesterday: { total: yesterdayRows.length, unique: yesterdayUnique },
					week: { total: weekRows.length, unique: weekUnique },
				},
				rating: {
					average: averageRating,
					totalReviews,
				},
				recentComments: (recentReviews || []).map((review: any) => ({
					id: review.id,
					created_at: review.created_at,
					rate: review.rate,
					name: review.name,
					comment: review.comments || review.comment || "",
				})),
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Insights error:", error);
		return new Response(JSON.stringify({ error: "Internal Server Error" }), {
			status: 500,
		});
	}
};
