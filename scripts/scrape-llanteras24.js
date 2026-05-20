import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  const url = process.argv[2] || 'https://vulcanizadoras.llanteras24.com.mx/monterrey/';
  console.log(`🚀 Iniciando scraping en: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const results = [];
    
    // Cada negocio está en un contenedor resaltado
    $('.wp-block-columns.has-background').each((i, el) => {
      const container = $(el);
      
      const title = container.find('h3.wp-block-heading').text().trim();
      if (!title) return; // Si no hay título, saltar
      
      // Remover el número inicial (ej: "1. Vulcanizadora" -> "Vulcanizadora")
      const name = title.replace(/^\d+\.\s*/, '');
      
      const image = container.find('figure.wp-block-image img').attr('src');
      
      // Parsear estrellas/rating
      const ratingFullText = container.find('.uag-star-rating__title').text().trim();
      let rating = 0;
      let reviewCount = 0;
      if (ratingFullText) {
         const match = ratingFullText.match(/([\d,]+)\s+de\s+más\s+de\s+(\d+)\s+reseñas/);
         if (match) {
             rating = parseFloat(match[1].replace(',', '.'));
             reviewCount = parseInt(match[2], 10);
         }
      }
      
      let address = '';
      let phone = '';
      let hours = [];
      let is24x7 = false;
      let isMobile = false; // "Vulcanizadora Móvil" o "A domicilio"
      
      // Revisar si el título sugiere "móvil"
      if (name.toLowerCase().includes('móvil') || name.toLowerCase().includes('movil') || name.toLowerCase().includes('domicilio')) {
          isMobile = true;
      }
      
      let currentSection = '';
      container.find('.uagb-icon-list__label').each((_, labelEl) => {
        const strongText = $(labelEl).find('strong').text().trim();
        const text = $(labelEl).text().trim();
        
        if (strongText === 'Dirección') currentSection = 'address';
        else if (strongText === 'Teléfono') currentSection = 'phone';
        else if (strongText === 'Horarios') currentSection = 'hours';
        else if (strongText === 'Valoraciones') currentSection = 'rating';
        else if (!strongText) {
          if (currentSection === 'address' && !address) {
              address = text;
              if (text.toLowerCase().includes('móvil') || text.toLowerCase().includes('movil') || text.toLowerCase().includes('domicilio') || text.toLowerCase().includes('servicio express')) {
                  isMobile = true;
              }
          }
          else if (currentSection === 'phone' && !phone) phone = text;
          else if (currentSection === 'hours') {
              hours.push(text);
              if (text.toLowerCase().includes('abierto 24 horas') || text.toLowerCase().includes('24 horas')) {
                  is24x7 = true;
              }
          }
        }
      });
      
      const mapUrl = container.find('iframe').attr('src');
      
      // Buscar la descripción
      let description = '';
      container.find('.wp-block-column').each((_, colEl) => {
         const colText = $(colEl).text().trim();
         const colHtml = $(colEl).html() || '';
         if (colText.length > 50 && !colHtml.includes('wp-block-') && !colHtml.includes('iframe') && !colHtml.includes('img') && !colHtml.includes('</svg>')) {
             description = colText;
             
             // Revisar en descripción si es a domicilio
             if (description.toLowerCase().includes('a domicilio') || description.toLowerCase().includes('servicio móvil') || description.toLowerCase().includes('a donde estés')) {
                 isMobile = true;
             }
             if (description.toLowerCase().includes('24 horas') || description.toLowerCase().includes('24/7') || description.toLowerCase().includes('toda la noche')) {
                 is24x7 = true;
             }
         }
      });

      // Construir la estructura similar al content column (JSONB)
      const placeData = {
          name,
          image,
          rating,
          reviewCount,
          rating_text: ratingFullText,
          address,
          phone,
          hours,
          is_24_7: is24x7,
          is_mobile: isMobile,
          map_iframe: mapUrl,
          description: description.replace(/\s+/g, ' '),
          // La exportaremos usando el formato 'content' para Inserción
          content: {
             semantic_data: {
                 description: description.replace(/\s+/g, ' '),
                 address: address,
                 phone: phone,
                 whatsapp: phone,
                 hours: hours.join(', '),
                 is_24_7: is24x7,
                 is_mobile: isMobile,
                 additional_features: []
             },
             blocks: [],
             view_settings: {
                 layout: "list",
                 show_prices: true
             }
          }
      };

      if (is24x7) placeData.content.semantic_data.additional_features.push("Servicio 24 Horas");
      if (isMobile) placeData.content.semantic_data.additional_features.push("Servicio a Domicilio");

      placeData.content.blocks.push({
          id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: "section",
          data: {
              title: "Servicios Frecuentes",
              description: "Precios sujetos a variación y horario.",
              image: "",
              items: [
                 {
                    id: `item-${Date.now()}-1`,
                    name: "Desponchado / Parche (Auto)",
                    price: 80,
                    description: "Reparación básica de llanta con parche en local.",
                    image: ""
                 },
                 {
                    id: `item-${Date.now()}-2`,
                    name: "Servicio a Domicilio",
                    price: 250,
                    description: "Acudimos a tu ubicación dentro de la zona de cobertura.",
                    image: ""
                 }
              ]
          }
      });

      results.push(placeData);
    });

    console.log(`✅ Scraping exitoso. Se encontraron ${results.length} vulcanizadoras.`);
    
    // Guardar en data
    const dir = path.join(process.cwd(), 'scripts/data');
    await fs.mkdir(dir, { recursive: true });
    
    const urlObj = new URL(url);
    const slug = urlObj.pathname.split('/').filter(Boolean).pop() || 'index';
    const filePath = path.join(dir, `vulcanizadoras_${slug}.json`);
    
    await fs.writeFile(filePath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`💾 Datos guardados en ${filePath}`);
    
  } catch (error) {
    console.error('❌ Error durante el scraping:', error);
  }
}

main();