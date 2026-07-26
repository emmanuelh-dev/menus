import { getStates, getRestaurants } from '../lib/api';
import { escapeXml } from '../lib/xml';

export async function GET() {
  const baseUrl = 'https://menus.bysmax.com';
  
  const states = await getStates();
  const moteles = await getRestaurants({ type: 'motel' });
  
  const motelUrls: string[] = [
    '/moteles',
    '/moteles/estados',
    ...states.map(state => `/moteles/estados/${state.slug}`),
    ...moteles
      .filter(motel => motel.short_name)
      .map(motel => `/moteles/estados/${motel.state_slug || 'nuevo-leon'}/${motel.short_name}`)
  ];
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${motelUrls.map(url => `
  <url>
    <loc>${escapeXml(baseUrl + url)}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${url === '/moteles' ? '1.0' : url === '/moteles/estados' ? '0.9' : url.split('/').length === 4 ? '0.8' : '0.7'}</priority>
  </url>`).join('')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate=86400',
      'Vercel-Cache-Tag': 'places-all'
    },
  });
}
