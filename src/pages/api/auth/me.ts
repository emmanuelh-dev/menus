import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const base = import.meta.env.PUBLIC_GO_API_URL;
  if (!base) {
    return new Response(JSON.stringify({ error: 'PUBLIC_GO_API_URL no está configurada' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await fetch(new URL('/api/auth/me', base), {
      headers: request.headers.get('cookie') ? { cookie: request.headers.get('cookie')! } : undefined,
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'No se pudo validar la sesión' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
