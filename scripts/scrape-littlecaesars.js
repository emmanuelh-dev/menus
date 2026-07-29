#!/usr/bin/env node
// Baja el menú de una sucursal de Little Caesars México y lo escribe en su ficha.
//
// Cómo se llegó al endpoint, por si algún día deja de funcionar:
//
//   1. El sitio de pedidos es un Next.js estático — el HTML son 2.8 KB y el
//      menú llega después por API.
//   2. La URL de la API NO está en el bundle: ahí sólo hay hosts de test. La
//      real vive en GrowthBook (`bff_url`), que se consulta con la clave
//      pública que sí está en el bundle. De ahí sale onlo-bff-api.
//   3. La ruta se arma con constantes ofuscadas: v4 + /stores/ + tienda +
//      método + /menu.
//   4. Y el detalle que costaba: sin `accept-language: es-MX` el endpoint
//      responde 404 DATA_NOT_FOUND aunque la ruta y los ids sean correctos.
//      El menú está indexado por idioma, no por país.
//
// OJO CON LOS PRECIOS: cambian por sucursal. Super Cheese Pepperoni cuesta
// $159 en Guadalupe N.L. y $179 en Pachuca. Por eso la ficha dice de qué
// sucursal son los precios en vez de presentarlos como nacionales.
//
// Uso:
//   node scripts/scrape-littlecaesars.js 12049 little-caesars-mexico
//   node scripts/scrape-littlecaesars.js 12049 little-caesars-mexico --escribir

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { leerPlace, escribirContent } from "./lib/places-go.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(HERE, "..");

const GROWTHBOOK = "https://cdn.growthbook.io/api/features/sdk-kcx5P3BvEzwvrRT";
const ORIGEN = "https://order.mexico.littlecaesars.com";
const SEMILLA = "menus.bysmax.com/littlecaesars";

// Igual que en el scraper de Delitech: el id sale del identificador que el
// platillo ya tiene allá, para que al re-escrapear el diff sea el cambio de
// precio y no la ficha entera reescrita.
function idEstable(clave) {
  const h = crypto.createHash("sha1").update(SEMILLA + ":" + clave).digest("hex");
  return (
    h.slice(0, 8) + "-" + h.slice(8, 12) + "-5" + h.slice(13, 16) + "-a" +
    h.slice(17, 20) + "-" + h.slice(20, 32)
  );
}

const limpiar = (t) => (t || "").replace(/\s+/g, " ").trim();

// La URL del API sale de GrowthBook y no se escribe a mano: si Little Caesars
// mueve el backend, cambia ahí y este script la sigue sin tocarse.
async function baseDelApi() {
  const gb = await (await fetch(GROWTHBOOK)).json();
  const reglas = gb.features?.bff_url?.rules ?? [];
  // La última regla sin condición es la de producción para el resto del mundo
  // (las condicionadas son por país: ca tiene la suya).
  const prod = [...reglas].reverse().find((r) => !r.condition && r.force);
  const base = prod?.force ?? gb.features?.bff_url?.defaultValue;
  if (!base || base.includes("development") || base.includes("test")) {
    throw new Error(`GrowthBook devolvió una URL que no es de producción: ${base}`);
  }
  return base.replace(/\/+$/, "");
}

async function pedir(url) {
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      // Sin esto: 404 DATA_NOT_FOUND. Es el encabezado que decide todo.
      "accept-language": "es-MX",
      origin: ORIGEN,
      referer: ORIGEN + "/",
    },
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function main() {
  const [tienda, slug] = process.argv.slice(2);
  const escribir = process.argv.includes("--escribir");
  if (!tienda || !slug) {
    console.error("uso: node scripts/scrape-littlecaesars.js <locationNumber> <slug> [--escribir]");
    process.exit(1);
  }

  const base = await baseDelApi();
  console.log(`api: ${base}`);

  const { storeInfo } = await pedir(`${base}/v6/store/location/${tienda}`);
  const dir = storeInfo.address;
  const sucursal = `${dir.city}, ${dir.state}`;
  console.log(`tienda ${tienda}: ${sucursal} — ${storeInfo.phoneNumber}`);

  // methodId sale de la propia tienda; no todas ofrecen los mismos servicios.
  const metodo = (storeInfo.serviceMethods ?? []).find((m) => m.availability)?.methodId ?? 1;
  const menu = await pedir(`${base}/v4/stores/${tienda}/${metodo}/menu`);

  const bloques = [];
  let total = 0;
  for (const tipo of menu.menuTypes ?? []) {
    const items = (tipo.menuItems ?? [])
      // Los banners de "personaliza tu pizza" no son platillos: son un botón
      // con precio 0. En una ficha de menú sólo confunden.
      .filter((it) => it.itemType !== "CUS" && (it.price ?? 0) > 0)
      .map((it) => ({
        id: idEstable(it.menuItemCode || it.itemName),
        name: limpiar(it.itemName),
        image: (it.images ?? []).find((i) => i.imageURL)?.imageURL || "",
        available: it.orderable !== false,
        price: it.price,
        description: limpiar(it.itemDescription || it.additionalDescription),
      }));
    if (!items.length) continue;
    total += items.length;
    bloques.push({
      id: idEstable("cat:" + tipo.itemType),
      type: "section",
      data: { title: limpiar(tipo.typeDescription), items },
    });
  }

  console.log(`${bloques.length} secciones, ${total} platillos`);
  for (const b of bloques) {
    const ps = b.data.items.map((i) => i.price);
    console.log(`  ${String(b.data.items.length).padStart(3)}  $${Math.min(...ps)}-$${Math.max(...ps)}  ${b.data.title}`);
  }
  const conFoto = bloques.reduce((n, b) => n + b.data.items.filter((i) => i.image).length, 0);
  console.log(`con foto: ${conFoto}/${total}`);

  const place = await leerPlace(slug);
  const anterior = place.content || {};

  const nuevo = {
    ...anterior,
    blocks: bloques,
    semantic_data: {
      ...(anterior.semantic_data || {}),
      // Decir de qué sucursal son los precios no es un detalle: varían hasta
      // 12% entre tiendas, y publicarlos como "nacionales" sería incorrecto
      // para casi todo el país.
      description:
        `Menú y precios de Little Caesars. Precios de la sucursal ${sucursal}; ` +
        `pueden variar entre sucursales.`,
      price_source: `Little Caesars sucursal ${tienda} — ${sucursal}`,
    },
  };

  const salida = `/tmp/lc-${slug}-${Date.now()}`;
  fs.writeFileSync(`${salida}-nuevo.json`, JSON.stringify(nuevo, null, 1));
  fs.writeFileSync(`${salida}-respaldo.json`, JSON.stringify(anterior, null, 1));
  console.log(`nuevo:    ${salida}-nuevo.json`);
  console.log(`respaldo: ${salida}-respaldo.json`);

  if (!escribir) {
    console.log("\n(nada escrito; agrega --escribir cuando lo hayas revisado)");
    return;
  }

  await escribirContent(place.id, nuevo);
  console.log(`escrito en place ${place.id} (por Go: repuebla catalog_* y purga el borde)`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
