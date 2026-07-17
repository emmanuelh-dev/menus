import { getRestaurants } from '../lib/api';
import { SERVICES_MAP } from '../lib/services';

export async function GET() {
  const baseUrl = 'https://menus.bysmax.com';

  const serviceEntries = Object.entries(SERVICES_MAP); // [pluralSlug, dbType][]

  const placesByType = await Promise.all(
    serviceEntries.map(([, dbType]) => getRestaurants({ type: dbType }))
  );

  const serviceUrls: string[] = ['/servicios'];

  serviceEntries.forEach(([pluralSlug], i) => {
    serviceUrls.push(`/servicios/${pluralSlug}`);

    for (const place of placesByType[i]) {
      const stateSlug = place.states?.slug;
      const municipalitySlug = place.municipalities?.slug;
      if (!place.short_name || !stateSlug || !municipalitySlug) continue;
      serviceUrls.push(`/servicios/${pluralSlug}/${stateSlug}/${municipalitySlug}/${place.short_name}`);
    }
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${serviceUrls
    .map(
      (url) => `
  <url>
    <loc>${baseUrl}${url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${url === '/servicios' ? '1.0' : url.split('/').length === 3 ? '0.8' : '0.6'}</priority>
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
