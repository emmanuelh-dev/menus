import { getStates } from '../lib/api';

export async function GET() {
  const baseUrl = 'https://menus.bysmax.com';
  
  const states = await getStates();
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap-moteles-main.xml</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>
  ${states.map(state => `
  <sitemap>
    <loc>${baseUrl}/sitemap-moteles-${state.slug}.xml</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>`).join('')}
</sitemapindex>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate=86400',
      'Vercel-Cache-Tag': 'places-all'
    },
  });
}
