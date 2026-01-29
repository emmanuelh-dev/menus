export const prerender = false;

import type { APIRoute } from "astro";
import { supabase } from "../lib/supabase";

export const GET: APIRoute = async ({ url }) => {
	const slug = url.searchParams.get("slug");
	const type = url.searchParams.get("type");

	// Valores base
	let name = "Menú Digital";
	let shortName = "Menú";
	let startUrl = "/";
	let themeColor = "#ffffff";
	let icon = "/android-chrome-512x512.png";

	if (type === "admin") {
		name = "Gestión de Menús";
		shortName = "Admin";
		startUrl = "/admin/dashboard";
		themeColor = "#10b981";
	} else if (slug) {
		// LOG: Intentando buscar datos para el slug
		console.log(`[PWA Manifest] Buscando datos para: ${slug}`);

		// Hacemos una búsqueda simple en la tabla places para obtener el nombre exacto
		const { data: place, error } = await supabase
			.from("places")
			.select("name, type, image, menu, short_name")
			.eq("short_name", slug)
			.maybeSingle();

		if (!error && place) {
			console.log(`[PWA Manifest] Encontrado: ${place.name}`);
			name = place.name;
			shortName = place.name;
			startUrl = place.menu || (place.type === "motel" ? `/moteles/${slug}` : `/menus/${slug}`);
			
			if (place.image) icon = place.image;
			if (place.type === "motel") themeColor = "#000000";
			else if (place.type === "cafe") themeColor = "#6f4e37";
		} else {
			console.error(`[PWA Manifest] No se pudo encontrar datos para el slug: ${slug}`, error);
			// Si falla la DB, al menos intentamos que el nombre no sea genérico usando el slug formateado
			const capitalizedSlug = slug.split('-').map(word => word.charAt(0)).join('').toUpperCase();
			name = `Menú ${slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ')}`;
			shortName = name;
		}
	}

	const manifest = {
		name: name,
		short_name: shortName.substring(0, 12),
		start_url: startUrl,
		display: "standalone",
		background_color: "#ffffff",
		theme_color: themeColor,
		icons: [
			{
				src: icon,
				sizes: "512x512",
				type: icon.toLowerCase().endsWith(".png") ? "image/png" : "image/webp",
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
			"Cache-Control": "no-cache, no-store, must-revalidate",
			"Pragma": "no-cache",
			"Expires": "0",
			"Access-Control-Allow-Origin": "*",
		},
	});
};
