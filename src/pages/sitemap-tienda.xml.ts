import { getStates, getRestaurants } from '../lib/api';

export async function GET() {
  const baseUrl = 'https://menus.bysmax.com';

  const states = await getStates();
  const restaurantes = await getRestaurants({ type: 'restaurant' });

  const tiendaUrls: string[] = [
    '/tienda',
    '/tienda/estados',
    ...states.map((state) => `/tienda/estados/${state.slug}`),
    ...restaurantes
      .filter((place: any) => {
        const template = place?.content?.view_settings?.template;
        return place.short_name && template === 'tienda';
      })
      .map((place: any) => `/tienda/${place.short_name}`),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${tiendaUrls
    .map(
      (url) => `
  <url>
    <loc>${baseUrl}${url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${url === '/tienda' ? '1.0' : '0.7'}</priority>
  </url>`
    )
    .join('')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
