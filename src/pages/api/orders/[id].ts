import type { APIRoute } from 'astro';

export const prerender = false;

const proxyOrder: APIRoute = async ({ params, request }) => {
  const id = params.id;
  const base = import.meta.env.PUBLIC_GO_API_URL;
  if (!id || !base) {
    return new Response(JSON.stringify({ error: id ? 'PUBLIC_GO_API_URL no está configurada' : 'ID is required' }), {
      status: id ? 502 : 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await fetch(new URL(`/api/orders/${encodeURIComponent(id)}`, base), {
      method: request.method,
      headers: {
        'Content-Type': request.headers.get('content-type') || 'application/json',
        ...(request.headers.get('cookie') ? { cookie: request.headers.get('cookie')! } : {}),
      },
      body: request.method === 'GET' ? undefined : await request.text(),
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'No se pudo conectar con pedidos' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const GET = proxyOrder;
export const PUT = proxyOrder;
