export async function GET() {
  const baseUrl = 'https://menus.bysmax.com';
  
  // URLs principales con filtros importantes
  const cafeteriaUrls = [
    '/cafeterias',
    '/cafeterias?zona=barrio-antiguo',
    '/cafeterias?zona=san-pedro', 
    '/cafeterias?zona=centro',
    '/cafeterias?zona=sur',
    '/cafeterias?tipo=especialidad',
    '/cafeterias?zona=barrio-antiguo&tipo=especialidad',
    '/cafeterias?zona=san-pedro&tipo=especialidad',
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${cafeteriaUrls.map(url => `
  <url>
    <loc>${baseUrl}${url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${url === '/cafeterias' ? '1.0' : '0.8'}</priority>
  </url>`).join('')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
