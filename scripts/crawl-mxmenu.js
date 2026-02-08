import axios from 'axios';
import * as cheerio from 'cheerio';
import { scrapeMxMenu } from './scrape-mxmenu.js';

/**
 * Crawler para mxmenu.net que soporta Sitemaps y Páginas de Categoría.
 */

async function getUrlsFromSitemap(url) {
  try {
    const { data: xml } = await axios.get(url);
    const $ = cheerio.load(xml, { xmlMode: true });
    const urls = [];
    
    // Si es un Sitemap Index, procesar sub-sitemaps
    if (xml.includes('<sitemapindex')) {
      const sitemaps = [];
      $('sitemap loc').each((i, el) => {
        const loc = $(el).text();
        if (loc.includes('post-sitemap') || loc.includes('page-sitemap')) {
            sitemaps.push(loc);
        }
      });
      
      console.log(`Detectado Sitemap Index con ${sitemaps.length} sub-sitemaps.`);
      for (const sm of sitemaps) {
        const subUrls = await getUrlsFromSitemap(sm);
        urls.push(...subUrls);
      }
      return Array.from(new Set(urls));
    }

    $('url loc').each((i, el) => {
      const loc = $(el).text();
      // Filtros más agresivos para evitar spam y archivos estáticos
      const skipKeywords = [
        'casino', 'author', 'tag', '/page/', 'wp-content', '.jpg', '.png', '.webp', '.pdf', '.xml', 
        'login', 'register', 'signin', 'bet', 'slot', 'gaming', 'vavada', 'pin-up', '1xbet', 'mostbet', 
        'bonus', 'poker', 'gambling', 'crypto', 'replica-watches', 'carousel-manufacturer', 'fertilizer'
      ];
      
      // Permitir posts de blog que parezcan contenido útil de comida/dieta
      const goodKeywords = ['diet', 'keto', 'nutri', 'salud', 'receta', 'food', 'comida', 'healthy'];
      const isGoodBlog = loc.includes('/category/blog/') && goodKeywords.some(k => loc.toLowerCase().includes(k));

      // En mxmenu.net, los menús reales suelen tener "-menu" en la URL o ser de categorías de comida
      const isLikelyMenu = loc.includes('-menu') || loc.includes('/category/') || loc.includes('precio') || isGoodBlog;
      
      if (!skipKeywords.some(k => loc.toLowerCase().includes(k))) {
        urls.push(loc);
      }
    });
    return urls;
  } catch (error) {
    console.error(`Error procesando sitemap ${url}:`, error.message);
    return [];
  }
}

async function getUrlsFromCategory(url) {
  let allUrls = [];
  let currentPage = 1;
  let hasNext = true;

  while (hasNext && currentPage <= 10) { // Límite de 10 páginas por categoría para evitar loops
    const targetUrl = currentPage === 1 ? url : `${url.replace(/\/$/, '')}/page/${currentPage}/`;
    console.log(`Buscando URLs en categoría: ${targetUrl}...`);
    
    try {
      const { data: html } = await axios.get(targetUrl);
      const $ = cheerio.load(html);
      const pageUrls = [];
      
      $('h2.entry-title a, h3.entry-title a, article a').each((i, el) => {
        const href = $(el).attr('href');
        if (href && !allUrls.includes(href) && !pageUrls.includes(href)) {
          // Filtrar links obvios de navegación
          if (href.includes('mxmenu.net') && !href.includes('/category/') && !href.includes('/tag/') && !href.includes('/author/')) {
            pageUrls.push(href);
          }
        }
      });

      if (pageUrls.length === 0) {
        hasNext = false;
      } else {
        allUrls.push(...pageUrls);
        currentPage++;
      }
    } catch (error) {
      hasNext = false;
    }
  }

  return Array.from(new Set(allUrls));
}

async function processUrls(urls, limit = 0) {
  const targetUrls = limit > 0 ? urls.slice(0, limit) : urls;
  console.log(`Se procesarán ${targetUrls.length} URLs potenciales.`);

  const batchSize = 5;
  for (let i = 0; i < targetUrls.length; i += batchSize) {
    const batch = targetUrls.slice(i, i + batchSize);
    console.log(`\nProcesando lote ${Math.floor(i/batchSize) + 1} de ${Math.ceil(targetUrls.length/batchSize)}...`);
    
    await Promise.all(batch.map(url => scrapeMxMenu(url)));
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function main() {
  const inputUrl = process.argv[2];
  const limit = parseInt(process.argv[3]) || 0;

  if (!inputUrl) {
    console.log('Uso: node scripts/crawl-mxmenu.js <url_sitemap_o_categoria> [limite]');
    console.log('Ejemplo Sitemap: node scripts/crawl-mxmenu.js https://mxmenu.net/post-sitemap.xml 10');
    console.log('Ejemplo Categoría: node scripts/crawl-mxmenu.js https://mxmenu.net/category/comida-asiatica/ 5');
    return;
  }

  console.log(`\n=== Iniciando Crawl: ${inputUrl} ===\n`);
  
  let urls = [];
  if (inputUrl.includes('.xml')) {
    urls = await getUrlsFromSitemap(inputUrl);
  } else if (inputUrl.includes('/category/')) {
    urls = await getUrlsFromCategory(inputUrl);
  } else {
    // Si es un link directo de un solo restaurante
    urls = [inputUrl];
  }

  await processUrls(urls, limit);
  
  console.log(`\n=== Crawl finalizado ===\n`);
}

main().catch(console.error);
