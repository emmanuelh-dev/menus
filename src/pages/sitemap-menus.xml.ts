import { getStates, getRestaurants } from '../lib/api';
import { escapeXml } from '../lib/xml';

export async function GET() {
  const baseUrl = 'https://menus.bysmax.com';

  const states = await getStates();
  const restaurantes = await getRestaurants({ type: 'restaurant' });

  const menuUrls: string[] = [
    '/menus',
    '/menus/estados',
    ...states.map((state) => `/menus/estados/${state.slug}`),
    ...restaurantes
      .filter((place: any) => {
        const template = place?.content?.view_settings?.template;
        return place.short_name && template !== 'tienda';
      })
      .map((place: any) => `/menus/${place.short_name}`),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${menuUrls
    .map(
      (url) => `
  <url>
    <loc>${escapeXml(baseUrl + url)}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${url === '/menus' ? '1.0' : url === '/menus/estados' ? '0.9' : url.split('/').length === 3 ? '0.7' : '0.8'}</priority>
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
