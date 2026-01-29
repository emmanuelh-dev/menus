import type { APIRoute } from "astro";
import { supabase } from "../lib/supabase";

export const GET: APIRoute = async ({ request }) => {
	const url = new URL(request.url);
	const slug = url.searchParams.get("slug");
	const type = url.searchParams.get("type"); // 'admin' or establishment type

	let name = "Menús";
	let shortName = "Menús";
	let startUrl = "/";
	let themeColor = "#ffffff";
	let icon = "/android-chrome-512x512.png";

	if (type === "admin") {
		name = "Admin Panel | Menús";
		shortName = "Admin";
		startUrl = "/admin/dashboard";
		themeColor = "#000000";
	} else if (slug) {
		const { data: place } = await supabase
			.from("places")
			.select("*")
			.eq("short_name", slug)
			.single();

		if (place) {
			name = place.name;
			shortName = place.name.substring(0, 12);
			// Determine the correct start_url
			if (place.type === "motel") {
				// Motels have state-based URLs usually, but we can try to deduce or just use the menu field
				startUrl = place.menu || `/moteles/${slug}`;
			} else {
				startUrl = place.menu || `/menus/${slug}`;
			}
			
			if (place.image) {
				icon = place.image;
			}
			
			// Custom theme color based on type if wanted
			if (place.type === "motel") themeColor = "#1a1a1a";
			else if (place.type === "cafe") themeColor = "#6f4e37";
		}
	}

	const manifest = {
		name: name,
		short_name: shortName,
		start_url: startUrl,
		display: "standalone",
		background_color: "#ffffff",
		theme_color: themeColor,
		icons: [
			{
				src: icon,
				sizes: "512x512",
				type: icon.endsWith(".png") ? "image/png" : "image/webp",
				purpose: "any maskable",
			},
			{
				src: "/android-chrome-192x192.png",
				sizes: "192x192",
				type: "image/png",
			},
		],
	};

	return new Response(JSON.stringify(manifest), {
		headers: {
			"Content-Type": "application/manifest+json",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
