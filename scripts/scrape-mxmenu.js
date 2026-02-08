import axios from 'axios';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Scraper para mxmenu.net
 * Extrae categorías, ítems, precios e imágenes y los formatea al sistema de bloques de BySMax.
 */
export async function scrapeMxMenu(url, shortNameArg = null) {
  try {
    console.log(`Scrapeando: ${url}...`);
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(html);
    const blocks = [];
    
    // Extraer nombre del restaurante
    let restaurantName = $('h1.entry-title').text()
      .split('Menú')[0]
      .split('Menu')[0]
      .replace(/Precios México.*/i, '')
      .replace(/Precio México.*/i, '')
      .replace(/Precio.*/i, '')
      .replace(/Actualizado.*/i, '')
      .replace(/Tarifas.*/i, '')
      .trim();

    if (!restaurantName) {
        // Fallback al OG title
        restaurantName = ($('meta[property="og:title"]').attr('content') || '').split('Menú')[0].split('Menu')[0].trim();
    }

    if (!restaurantName) return null;

    const shortName = shortNameArg || restaurantName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

    if (shortName.length < 3) return null;

    // Extraer imagen destacada
    const featuredImage = $('meta[property="og:image"]').attr('content') || $('img.wp-post-image').attr('src') || '';

    // Buscamos todos los H3 que suelen ser las categorías
    const h3s = $('h3.wp-block-heading');

    h3s.each((i, el) => {
      const title = $(el).text().trim();
      
      const skipKeywords = ['historia', 'faq', 'sobre nosotros', 'ubicación', 'contacto', 'comentarios', 'preguntas', 'populares', 'relacionados', 'navegación', 'blog', 'privacidad'];
      if (skipKeywords.some(k => title.toLowerCase().includes(k))) return;

      const items = [];
      const images = [];
      
      let current = $(el).next();
      let limit = 0;
      while (current.length && current[0].tagName !== 'h3' && limit < 20) {
        limit++;
        const table = current[0].tagName === 'table' ? current : current.find('table');
        if (table.length) {
          table.find('tr').each((j, tr) => {
            const cells = $(tr).find('td');
            if (cells.length >= 2) {
              const name = $(cells[0]).text().trim();
              const priceStr = $(cells[1]).text().trim().replace('$', '').replace(',', '');
              const price = parseFloat(priceStr);

              if (name && !isNaN(price) && !name.toLowerCase().includes('menú') && !name.toLowerCase().includes('producto')) {
                items.push({
                  id: uuidv4(),
                  name: name,
                  price: price,
                  description: "",
                  image: "",
                  available: true
                });
              }
            }
          });
        }

        const imgTags = current[0].tagName === 'img' ? [current[0]] : current.find('img').toArray();
        imgTags.forEach(img => {
          const src = $(img).attr('src') || $(img).attr('data-src');
          const alt = $(img).attr('alt') || title;
          if (src && src.startsWith('http') && !src.includes('avatar') && !src.includes('logo') && !src.includes('ads') && (src.includes('.webp') || src.includes('.jpg') || src.includes('.png'))) {
            images.push({ src, alt });
          }
        });

        current = current.next();
      }

      if (images.length > 0) {
        blocks.push({
          id: uuidv4(),
          type: 'gallery',
          data: {
            images: images.slice(0, 8).map(img => ({
              src: img.src,
              alt: img.alt,
              title: ""
            }))
          }
        });
      }

      if (items.length > 0) {
        blocks.push({
          id: uuidv4(),
          type: 'section',
          data: {
            title: title,
            items: items
          }
        });
      }
    });

    if (blocks.length === 0) return null;

    const semantic_data = {
      description: `Menú de ${restaurantName} en México. Precios actualizados.`,
      price_range: "$$",
      cuisine_type: "Restaurante",
      address: "México"
    };

    const content = {
      blocks,
      semantic_data,
      view_settings: {
        layout: 'list',
        show_prices: true
      }
    };

    const placeData = {
      name: restaurantName,
      short_name: shortName,
      type: 'restaurant',
      content: content,
      featured: false,
      rating: 4.5,
      priceRange: "$$",
      address: "México",
      state_id: 19,
      image: featuredImage
    };

    console.log(`[OK] Datos procesados para: ${restaurantName} (${shortName})`);
    
    const { data: existing } = await supabase
      .from('places')
      .select('id')
      .eq('short_name', shortName)
      .maybeSingle();

    let result;
    if (existing) {
      result = await supabase
        .from('places')
        .update({ 
          content: content,
          image: featuredImage || undefined
        })
        .eq('id', existing.id);
    } else {
      result = await supabase
        .from('places')
        .insert([placeData]);
    }

    if (result.error) {
      console.error(`[ERROR] Supabase (${shortName}):`, result.error.message);
    } else {
      console.log(`[SUCCESS] Supabase (${shortName})`);
    }

    return content;
  } catch (error) {
    console.error(`[FATAL] ${url}:`, error.message);
    return null;
  }
}

// CLI check
if (process.argv[1].endsWith('scrape-mxmenu.js')) {
    const url = process.argv[2];
    const shortName = process.argv[3];
    if (url) {
        scrapeMxMenu(url, shortName).then(() => process.exit(0));
    }
}
