import * as cheerio from 'cheerio';
import fs from 'fs/promises';

async function test() {
  const html = `
  <div class="wp-block-columns has-background is-layout-flex wp-container-core-columns-is-layout-fc933d2a wp-block-columns-is-layout-flex" style="border-radius:20px;background-color:#3966e312;margin-top:20px;margin-bottom:20px;padding-top:40px;padding-right:40px;padding-bottom:40px;padding-left:40px;box-shadow:var(--wp--preset--shadow--natural)">
<div class="wp-block-column is-layout-flow wp-block-column-is-layout-flow">
<h3 class="wp-block-heading">1. Vulcanizadora</h3>

<div class="wp-block-columns is-layout-flex wp-container-core-columns-is-layout-28f84493 wp-block-columns-is-layout-flex">
<div class="wp-block-column is-layout-flow wp-block-column-is-layout-flow">
<figure class="wp-block-image size-large has-custom-border"><img decoding="async" src="https://lh5.googleusercontent.com/p/AF1QipOrxEx-PzrGFeiuqn0kgXEGr56nnFYkeIHV-uxw=w426-h240-k-no" alt="" style="border-radius:20px;aspect-ratio:1;object-fit:cover"></figure>
</div>

<div class="wp-block-column is-layout-flow wp-block-column-is-layout-flow">
<div class="wp-block-uagb-icon-list uagb-block-05bf74d9"><div class="uagb-icon-list__wrap">
<div class="wp-block-uagb-icon-list-child uagb-block-0f01fd22"><span class="uagb-icon-list__label"><strong>Valoraciones</strong></span></div>
</div></div>

<div class="wp-block-uagb-star-rating uagb-block-ca33de4e"><p class="uag-star-rating__title">4,6 de más de 722 reseñas</p></div>

<div class="wp-block-uagb-icon-list uagb-block-7813b303"><div class="uagb-icon-list__wrap">
<div class="wp-block-uagb-icon-list-child uagb-block-829cde59"><span class="uagb-icon-list__label"><strong>Dirección</strong></span></div>
<div class="wp-block-uagb-icon-list-child uagb-block-c62d724c"><span class="uagb-icon-list__label">Artículo 123 2402, Progreso, 64420 Monterrey</span></div>
<div class="wp-block-uagb-icon-list-child uagb-block-dff5ab10"><span class="uagb-icon-list__label"><strong>Teléfono</strong></span></div>
<div class="wp-block-uagb-icon-list-child uagb-block-51ae2b95"><span class="uagb-icon-list__label">81 8123 2386</span></div>
</div></div>

</div>

<div class="wp-block-column is-layout-flow wp-block-column-is-layout-flow">
<div class="wp-block-uagb-icon-list uagb-block-0b5bbe3b"><div class="uagb-icon-list__wrap">
<div class="wp-block-uagb-icon-list-child uagb-block-c610bf79"><span class="uagb-icon-list__label"><strong>Horarios</strong></span></div>
<div class="wp-block-uagb-icon-list-child uagb-block-4236a729"><span class="uagb-icon-list__label">Lunes: De 7:00 a 22:00</span></div>
<div class="wp-block-uagb-icon-list-child uagb-block-4877afa9"><span class="uagb-icon-list__label">Martes: De 7:00 a 22:00</span></div>
</div></div>
</div>
</div>

<div class="wp-block-columns is-layout-flex wp-container-core-columns-is-layout-28f84493 wp-block-columns-is-layout-flex">
<div class="wp-block-column is-layout-flow wp-block-column-is-layout-flow">
<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3595..." width="100%" height="250" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
</div>
</div>

<div class="wp-block-columns is-layout-flex wp-container-core-columns-is-layout-28f84493 wp-block-columns-is-layout-flex">
<div class="wp-block-column is-layout-flow wp-block-column-is-layout-flow">
Las vulcanizadoras son auténticos refugios para quienes buscan salvaguardar...
</div>
</div>

</div>
</div>
  `;
  
  const $ = cheerio.load(html);
  const container = $('.wp-block-columns.has-background');
  
  const title = container.find('h3.wp-block-heading').text().trim();
  const name = title.replace(/^\d+\.\s*/, '');
  
  const image = container.find('figure.wp-block-image img').attr('src');
  const ratingText = container.find('.uag-star-rating__title').text().trim();
  
  let address = '';
  let phone = '';
  let hours = [];
  
  let currentSection = '';
  container.find('.uagb-icon-list__label').each((i, el) => {
    const strongText = $(el).find('strong').text().trim();
    const text = $(el).text().trim();
    
    if (strongText === 'Dirección') currentSection = 'address';
    else if (strongText === 'Teléfono') currentSection = 'phone';
    else if (strongText === 'Horarios') currentSection = 'hours';
    else if (strongText === 'Valoraciones') currentSection = 'rating';
    else if (!strongText) {
      if (currentSection === 'address' && !address) address = text;
      else if (currentSection === 'phone' && !phone) phone = text;
      else if (currentSection === 'hours') hours.push(text);
    }
  });
  
  const mapUrl = container.find('iframe').attr('src');
  
  // Find description (column with just text and no tags)
  let description = '';
  container.find('.wp-block-column').each((i, el) => {
     // A crude way to find plain text blocks: it has text but no child divs or elements
     // Actually it might have a, br, p, etc. Let's look for columns with no block elements?
     const html = $(el).html();
     if (html && !html.includes('<') && html.trim().length > 20) {
         description = html.trim();
     }
  });

  console.log(JSON.stringify({name, image, ratingText, address, phone, hours, mapUrl, description}, null, 2));
}
test();
