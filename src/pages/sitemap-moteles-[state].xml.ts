import { getStates, getRestaurants } from '../lib/api';
import { escapeXml } from '../lib/xml';

export async function GET({ params }: { params: { state: string } }) {
  const baseUrl = 'https://menus.bysmax.com';
  const { state: stateSlug } = params;
  
  const states = await getStates();
  const currentState = states.find(s => s.slug === stateSlug);
  
  if (!currentState) {
    return new Response('State not found', { status: 404 });
  }
  
  const moteles = await getRestaurants({ type: 'motel', state_id: currentState.id });
  
  const motelUrls: string[] = moteles
    .filter(motel => motel.short_name)
    .map(motel => `/moteles/estados/${stateSlug}/${motel.short_name}`);
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${motelUrls.map(url => `
  <url>
    <loc>${escapeXml(baseUrl + url)}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
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

export async function getStaticPaths() {
  const states = await getStates();
  
  return states.map(state => ({
    params: { state: state.slug }
  }));
}
