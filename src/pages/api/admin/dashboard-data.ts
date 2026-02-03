export const prerender = false;

import type { APIRoute } from "astro";
import { createAuthenticatedClient } from "../../../lib/supabase";

export const GET: APIRoute = async ({ cookies, request }) => {
	try {
		const accessToken = cookies.get("sb-access-token")?.value;
		const refreshToken = cookies.get("sb-refresh-token")?.value;

		if (!accessToken || !refreshToken) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
			});
		}

		const url = new URL(request.url);
		const page = parseInt(url.searchParams.get("page") || "1");
		const pageSize = parseInt(url.searchParams.get("pageSize") || "50");
		const search = url.searchParams.get("search") || "";
		const sortBy = url.searchParams.get("sortBy") || "newest";

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

		const { isAdmin: checkAdmin } = await import("../../../lib/admin");
		const isAdmin = checkAdmin(user.email);

		let query = supabase.from("places").select(
			`
				*,
				states (
					id,
					name,
					slug
				)
			`,
			{ count: "exact" },
		);

		if (!isAdmin) {
			query = query.eq("user_id", user?.id);
		}

		if (search) {
			query = query.ilike("name", `%${search}%`);
		}

		// Sorting
		if (sortBy === "name") {
			query = query.order("name", { ascending: true });
		} else if (sortBy === "oldest") {
			query = query.order("created_at", { ascending: true });
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

		if (!isAdmin) {
			commentsQuery.in(
				"place_id",
				(places || []).map((p: any) => p.id),
			);
		}

		const { data: recentComments } = await commentsQuery
			.order("created_at", { ascending: false })
			.limit(20);

		// Only fetch history if admin
		let history: any[] = [];
		if (isAdmin) {
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
				isAdmin,
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
