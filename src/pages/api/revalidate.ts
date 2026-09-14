import type { APIRoute } from 'astro';
export const prerender = false;

// Purga real en el edge. En Cloudflare no hay purga por tag salvo Enterprise,
// así que mapeamos los tags del webhook a URLs concretas y usamos la API de
// purge_cache por archivo. Requiere CF_ZONE_ID y CF_API_TOKEN en el runtime.
const SITE = 'https://menus.bysmax.com';

const HUB_URLS = [
  `${SITE}/`,
  `${SITE}/menus`,
  `${SITE}/menus/estados`,
  `${SITE}/moteles`,
  `${SITE}/moteles/estados`,
  `${SITE}/cafeterias`,
  `${SITE}/servicios`,
  `${SITE}/tienda`,
  `${SITE}/tienda/estados`,
  `${SITE}/plantillas`,
  `${SITE}/sitemap-index.xml`,
  `${SITE}/sitemap-menus.xml`,
  `${SITE}/sitemap-tienda.xml`,
];

const toSlug = (value: string) =>
  (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

function urlsForTags(tags: string[]): string[] {
  const urls = new Set<string>(HUB_URLS);
  for (const tag of tags) {
    const match = tag.match(/^place-(.+)$/);
    if (!match) continue;
    const slug = match[1];
    urls.add(`${SITE}/menus/${slug}`);
    urls.add(`${SITE}/moteles/${slug}`);
    urls.add(`${SITE}/qr/${slug}`);
  }
  return [...urls];
}

async function purgeUrls(urls: string[], env: Record<string, unknown>) {
  const zone = env.CF_ZONE_ID as string | undefined;
  const token = env.CF_API_TOKEN as string | undefined;
  if (!zone || !token) {
    console.warn('[revalidate] CF_ZONE_ID/CF_API_TOKEN ausentes; no se purga nada');
    return;
  }

  // Cloudflare acepta hasta 30 URLs por request en planes Free.
  for (let i = 0; i < urls.length; i += 30) {
    const files = urls.slice(i, i + 30);
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files }),
    });
    if (!res.ok) {
      console.error(`[revalidate] purge failed (${res.status}):`, await res.text());
    }
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = ((locals as any)?.runtime?.env ?? {}) as Record<string, unknown>;
    const secret =
      request.headers.get('x-webhook-secret') ||
      request.headers.get('authorization')?.replace('Bearer ', '');
    const expected = (env.WEBHOOK_SECRET as string) || import.meta.env.WEBHOOK_SECRET;

    if (!secret || secret !== expected) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();

    // Camino nuevo: admin-menus-go manda los tags ya formados
    // ({ tags: ["place-foo", "places-all"] }). Es el camino correcto para las
    // escrituras del dashboard, y a propósito NO pasa por toSlug(): esa
    // función corrompe los short_name con puntos — "quesabirrias.laregia.mty"
    // se vuelve "quesabirriaslaregiamty" — y purgaría una URL que ninguna
    // página emite.
    if (Array.isArray(body?.tags)) {
      const rawTags = body.tags as unknown[];
      const tags: string[] = [...new Set(
        rawTags.filter((t): t is string => typeof t === 'string' && t.length > 0)
      )];
      const urls = urlsForTags(tags);
      await purgeUrls(urls, env);
      return new Response(JSON.stringify({ revalidated: true, tags, purged: urls }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Camino legacy: webhook con forma de Supabase, que deriva el slug de
    // record.short_name/name. Se conserva por si algo lo sigue llamando.
    const table = body?.table || body?.type?.table;
    if (table && table !== 'places') {
      return new Response(JSON.stringify({ skipped: true, reason: 'Only places table is supported' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const record = body?.record || body?.new || body?.data || {};
    const oldRecord = body?.old_record || body?.old || {};

    const currentSlug = toSlug(record?.short_name || record?.name || body?.name || body?.slug || '');
    const previousSlug = toSlug(oldRecord?.short_name || oldRecord?.name || body?.oldName || '');

    if (!currentSlug && !previousSlug) {
      return new Response(JSON.stringify({ error: 'name/short_name missing in payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tags = new Set<string>();

    if (currentSlug) {
      tags.add(`place-${currentSlug}`);
      const categorySlug = toSlug(body?.categorySlug || record?.categorySlug || '');
      if (categorySlug) {
        tags.add(`place-${currentSlug}-cat-${categorySlug}`);
      }

      const productSlug = toSlug(body?.productSlug || record?.productSlug || '');
      if (productSlug) {
        tags.add(`place-${currentSlug}-product-${productSlug}`);
      }
    }

    if (previousSlug && previousSlug !== currentSlug) {
      tags.add(`place-${previousSlug}`);
    }

    const urls = urlsForTags([...tags]);
    await purgeUrls(urls, env);

    return new Response(JSON.stringify({ revalidated: true, tags: [...tags], purged: urls }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Revalidate error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
