import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const base = import.meta.env.PUBLIC_GO_API_URL;
    if (!base) throw new Error('PUBLIC_GO_API_URL no está configurada');
    const response = await fetch(new URL(`/api/public/shipping-zones${url.search}`, base), {
      headers: { Accept: 'application/json' },
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'No se pudieron cargar las zonas' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
