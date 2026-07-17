import { getStates } from '../lib/api';
import { escapeXml } from '../lib/xml';

export async function GET() {
  const baseUrl = 'https://menus.bysmax.com';
  
  const states = await getStates();
  
  const motelUrls: string[] = [
    '/moteles',
    '/moteles/estados',
    ...states.map(state => `/moteles/estados/${state.slug}`)
  ];
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${motelUrls.map(url => `
  <url>
    <loc>${escapeXml(baseUrl + url)}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${url === '/moteles' ? '1.0' : url === '/moteles/estados' ? '0.9' : '0.8'}</priority>
  </url>`).join('')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
    },
  });
}
