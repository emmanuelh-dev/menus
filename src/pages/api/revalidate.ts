import type { APIRoute } from 'astro';
import { invalidateByTag } from '@vercel/functions';
export const prerender = false;
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

export const POST: APIRoute = async ({ request }) => {
  try {
    const secret = request.headers.get('x-webhook-secret') || request.headers.get('authorization')?.replace('Bearer ', '');

    if (!secret || secret !== import.meta.env.WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
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

    await Promise.all([...tags].map((tag) => invalidateByTag(tag)));

    return new Response(JSON.stringify({ revalidated: true, tags: [...tags] }), {
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
