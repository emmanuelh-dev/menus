import axios from 'axios';
import * as cheerio from 'cheerio';
import { scrapeMxMenu } from './scrape-mxmenu.js';

/**
 * Crawler para mxmenu.net que soporta Sitemaps y Páginas de Categoría.
 */

async function getUrlsFromSitemap(url) {
  const { data: xml } = await axios.get(url);
  const $ = cheerio.load(xml, { xmlMode: true });
  const urls = [];
  $('loc').each((i, el) => {
    const loc = $(el).text();
    const skipKeywords = ['casino', 'blog', 'category', 'author', 'tag', '/page/'];
    if (!skipKeywords.some(k => loc.includes(k))) {
      urls.push(loc);
    }
  });
  return urls;
}

async function getUrlsFromCategory(url) {
  const { data: html } = await axios.get(url);
  const $ = cheerio.load(html);
  const urls = [];
  
  // En mxmenu.net, los links de restaurantes en categorías suelen estar en h2 o h3
  $('h2.entry-title a, h3.entry-title a').each((i, el) => {
    const href = $(el).attr('href');
    if (href && !urls.includes(href)) {
      urls.push(href);
    }
  });

  // Si no encuentra nada, intentar con selectores genéricos de posts
  if (urls.length === 0) {
    $('article a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('-menu') && !urls.includes(href)) {
        urls.push(href);
      }
    });
  }

  return urls;
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
