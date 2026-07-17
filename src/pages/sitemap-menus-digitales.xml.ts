import { getStates } from '../lib/api';

export async function GET() {
  const baseUrl = 'https://menus.bysmax.com';
  const states = await getStates();
  
  const urls = [
    `${baseUrl}/menus-digitales`,
    ...states.map(state => `${baseUrl}/menus-digitales/${state.slug}`)
  ];
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map(url => `
  <url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
    },
  });
}
