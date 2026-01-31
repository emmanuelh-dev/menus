export const prerender = false;

import type { APIRoute } from "astro";
import { createAuthenticatedClient } from "../../../lib/supabase";

export const GET: APIRoute = async ({ cookies }) => {
	try {
		const accessToken = cookies.get("sb-access-token")?.value;
		const refreshToken = cookies.get("sb-refresh-token")?.value;

		if (!accessToken || !refreshToken) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
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

		const isAdmin = [
			"emmanuelh.dev@gmail.com",
			"admin@bysmax.com",
			"e805177@gmail.com",
		].includes(user.email || "");

		const query = supabase.from("places").select(
			`
				*,
				states (
					id,
					name,
					slug
				)
			`,
		);

		if (!isAdmin) {
			query.eq("user_id", user?.id);
		}

		const { data: places } = await query.order(
			"created_at",
			{
				ascending: false,
			},
		);

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
