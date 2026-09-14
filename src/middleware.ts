import { defineMiddleware } from "astro:middleware";

// Cachea en el edge las respuestas SSR que ya declaran Cache-Control público
// (s-maxage en HTML, max-age en /_image). Cloudflare NO cachea respuestas de
// Worker por defecto, así que sin esto el TTL era decorativo y cada request
// volvía a renderizar. La frescura se controla por purga (api/revalidate).
export const onRequest = defineMiddleware(async (context, next) => {
	const runtime = (context.locals as any)?.runtime;
	const cache = runtime?.caches?.default;
	const waitUntil = runtime?.ctx?.waitUntil;

	const request = context.request;
	if (!cache || request.method !== "GET" || context.url.pathname.startsWith("/api/")) {
		return next();
	}

	// Ignora cookies en la clave: son páginas públicas.
	const cacheKey = new Request(request.url, { method: "GET" });
	const hit = await cache.match(cacheKey);
	if (hit) return hit;

	const response = await next();

	const cc = response.headers.get("cache-control") || "";
	const cacheable =
		response.status === 200 &&
		!response.headers.has("set-cookie") &&
		/(s-maxage|max-age)=\d+/.test(cc) &&
		!/no-store|private/.test(cc);

	if (!cacheable || !waitUntil) return response;

	waitUntil(cache.put(cacheKey, response.clone()));
	return response;
});
