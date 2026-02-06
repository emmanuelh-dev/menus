export async function GET() {
  const baseUrl = 'https://menus.bysmax.com';
  
  const robotsTxt = `User-agent: *
Allow: /

# Específicamente permitir páginas de cafeterías con filtros
Allow: /cafeterias
Allow: /cafeterias?zona=*
Allow: /cafeterias?tipo=*

# Sitemap
Sitemap: ${baseUrl}/sitemap-index.xml
Sitemap: ${baseUrl}/sitemap-moteles.xml
Sitemap: ${baseUrl}/sitemap-moteles-all.xml
Sitemap: ${baseUrl}/sitemap-menus-digitales.xml
Sitemap: ${baseUrl}/sitemap-cafeterias.xml

# Crawl-delay para bots agresivos
User-agent: Bingbot
Crawl-delay: 1

User-agent: Slurp
Crawl-delay: 1`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
