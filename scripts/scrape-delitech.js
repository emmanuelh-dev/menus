#!/usr/bin/env node
// Baja el menú de un restaurante que corre sobre Delitech y lo escribe en su
// ficha.
//
// Delitech (delitech.app) es la plataforma de pedidos que usan varias cadenas
// mexicanas —Pollo Pepe entre ellas—. Su tienda es un Next.js que se pinta en
// el navegador, así que bajar el HTML no sirve de nada: el menú llega después,
// por GraphQL. Este script hace lo que hace el navegador.
//
// Tres pasos:
//   1. Leer __NEXT_DATA__ del HTML para sacar `restaurantId` y `apiUri`. Están
//      ahí porque Next serializa runtimeConfig en la página.
//   2. Pedir un token a /api/generateToken del propio sitio. El GraphQL rechaza
//      todo sin JWT, pero el sitio reparte uno anónimo a quien lo pida: es el
//      mismo que usa cualquier visitante.
//   3. Correr getCategories y traducir el catálogo al `content` de un place.
//
// Uso:
//   node scripts/scrape-delitech.js https://ordena.pollopepe.com pollo-pepe
//   node scripts/scrape-delitech.js https://ordena.pollopepe.com pollo-pepe --escribir
//
// Sin --escribir sólo imprime lo que encontró y deja el JSON en /tmp, que es
// como conviene correrlo la primera vez. Con --escribir hace PATCH a
// places.content y purga el borde.
//
// Requiere PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(HERE, "..");

const NAVEGADOR =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Los ids de los platillos se derivan del id que ya tienen en Delitech, no se
// sortean. Así, al re-escrapear, el mismo platillo conserva su id y el diff es
// el cambio de precio — no la ficha entera reescrita.
const SEMILLA = "menus.bysmax.com/delitech";

function idEstable(clave) {
  const h = crypto.createHash("sha1").update(SEMILLA + ":" + clave).digest("hex");
  return (
    h.slice(0, 8) + "-" + h.slice(8, 12) + "-5" + h.slice(13, 16) + "-a" +
    h.slice(17, 20) + "-" + h.slice(20, 32)
  );
}

function cargarEnv() {
  const env = {};
  const ruta = path.join(RAIZ, ".env");
  if (!fs.existsSync(ruta)) return env;
  for (const linea of fs.readFileSync(ruta, "utf8").split("\n")) {
    const m = linea.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return env;
}

const limpiar = (t) => (t || "").replace(/\s+/g, " ").trim();

function fotoDe(art) {
  const imgs = art.art_images || [];
  const destacada = imgs.find((i) => i.art_image_featured && i.art_image_url);
  return (destacada || imgs.find((i) => i.art_image_url) || {}).art_image_url || "";
}

const CONSULTA = `query getCategories($geTree: Boolean, $restaurant_id: Int, $store_id: Int) {
  getCategories(options: {
    geTree: $geTree
    client: { restaurant_id: $restaurant_id, store_id: $store_id }
    attributes: {
      modifiers: { dbFields: "complete" }
      articles: { dbFields: "ArticleCategory" }
      categories: { dbFields: "complete" }
    }
  }) {
    categories { cat_id cat_name cat_order articles }
  }
}`;

async function main() {
  const [sitio, slug] = process.argv.slice(2);
  const escribir = process.argv.includes("--escribir");
  if (!sitio || !slug) {
    console.error("uso: node scripts/scrape-delitech.js <url-tienda> <slug> [--escribir]");
    process.exit(1);
  }

  // 1. runtimeConfig del HTML.
  const html = await (await fetch(new URL("/es-MX/menu", sitio), {
    headers: { "user-agent": NAVEGADOR },
  })).text();
  const bruto = html.match(/__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
  if (!bruto) throw new Error("no se encontró __NEXT_DATA__: ¿cambió la plataforma?");
  const { apiUri, restaurantId } = JSON.parse(bruto[1]).runtimeConfig;
  console.log(`restaurante ${restaurantId} en ${apiUri}`);

  // 2. Token anónimo.
  const token = await (await fetch(new URL("/api/generateToken", sitio), {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": NAVEGADOR },
    body: "{}",
  })).text();
  if (!token.startsWith("ey")) throw new Error("generateToken no devolvió un JWT");

  // 3. El catálogo.
  const res = await fetch(apiUri, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: token, origin: sitio },
    body: JSON.stringify({
      operationName: "getCategories",
      variables: { geTree: true, restaurant_id: Number(restaurantId) },
      query: CONSULTA,
    }),
  });
  const cuerpo = await res.json();
  if (cuerpo.errors) throw new Error(JSON.stringify(cuerpo.errors));

  const bloques = [];
  for (const cat of [...cuerpo.data.getCategories.categories].sort(
    (a, b) => (a.cat_order || 0) - (b.cat_order || 0),
  )) {
    const items = [...(cat.articles || [])]
      .sort((a, b) => (a.art_order || 0) - (b.art_order || 0))
      .map((art) => ({
        id: idEstable(art.art_id),
        name: limpiar(art.art_name),
        image: fotoDe(art),
        // Apagado en la cadena entera se muestra como no disponible, igual que
        // en la tienda de ellos. Borrarlo sería mentirle a quien busca el precio.
        available: art.art_restaurant_status !== false,
        price: art.art_price || 0,
        description: limpiar(art.art_description),
      }));
    if (items.length) {
      bloques.push({
        id: idEstable("cat:" + cat.cat_id),
        type: "section",
        data: { title: limpiar(cat.cat_name), items },
      });
    }
  }

  const total = bloques.reduce((n, b) => n + b.data.items.length, 0);
  console.log(`${bloques.length} secciones, ${total} platillos`);
  for (const b of bloques) console.log(`  ${String(b.data.items.length).padStart(3)}  ${b.data.title}`);

  const env = { ...cargarEnv(), ...process.env };
  const base = env.PUBLIC_SUPABASE_URL;
  const llave = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !llave) throw new Error("faltan PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

  const cab = { apikey: llave, authorization: `Bearer ${llave}` };
  const fila = await (await fetch(
    `${base}/rest/v1/places?select=id,content&short_name=eq.${encodeURIComponent(slug)}`,
    { headers: cab },
  )).json();
  if (!fila.length) throw new Error(`no existe el place ${slug}`);
  const { id, content: anterior } = fila[0];

  // Se conservan view_settings y semantic_data: son ajustes de la ficha, no del
  // menú, y este script no sabe nada de ellos.
  const nuevo = { ...(anterior || {}), blocks: bloques };

  const salida = `/tmp/delitech-${slug}-${Date.now()}`;
  fs.writeFileSync(`${salida}-nuevo.json`, JSON.stringify(nuevo, null, 1));
  fs.writeFileSync(`${salida}-respaldo.json`, JSON.stringify(anterior, null, 1));
  console.log(`nuevo:    ${salida}-nuevo.json`);
  console.log(`respaldo: ${salida}-respaldo.json`);

  if (!escribir) {
    console.log("\n(nada escrito; agrega --escribir cuando lo hayas revisado)");
    return;
  }

  const put = await fetch(`${base}/rest/v1/places?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...cab, "content-type": "application/json", prefer: "return=minimal" },
    body: JSON.stringify({ content: nuevo }),
  });
  if (!put.ok) throw new Error(`PATCH ${put.status}: ${await put.text()}`);
  console.log(`escrito en place ${id}`);
  console.log(`ahora: node scripts/purge-cache.js ${slug}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
