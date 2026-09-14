import type { APIRoute } from 'astro';

export const prerender = false;

function goURL(path: string) {
  const base = import.meta.env.PUBLIC_GO_API_URL;
  if (!base) throw new Error('PUBLIC_GO_API_URL no está configurada');
  return new URL(path, base).toString();
}

const proxyOrderRequest: APIRoute = async ({ request, url }) => {
  try {
    const response = await fetch(goURL(`/api/orders${url.search}`), {
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

export const GET = proxyOrderRequest;
export const POST = proxyOrderRequest;
