// Leer y escribir fichas a través de Go.
//
// Existe porque los scrapers escribían con la service-role key de Supabase, y
// eso dejó de funcionar el 2026-07-28: Go se mudó al Postgres del VPS y desde
// entonces una escritura a Supabase entra a una base que nadie lee. No falla,
// no avisa — simplemente no pasa nada. Ya nos pasó con Little Caesars.
//
// Escribir por Go además hace lo que el PATCH directo no hacía: repuebla
// catalog_*, recompila el content y purga el cache del borde.
//
// La sesión se toma de BM_SESSION (el valor de la cookie bm_session, se copia
// de las DevTools del navegador ya logueado). No hay token de servicio todavía;
// cuando lo haya, se cambia aquí y los scrapers no se enteran.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(HERE, "..", "..");

export function cargarEnv() {
  const env = {};
  const ruta = path.join(RAIZ, ".env");
  if (fs.existsSync(ruta)) {
    for (const linea of fs.readFileSync(ruta, "utf8").split("\n")) {
      const m = linea.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  }
  return { ...env, ...process.env };
}

function baseGo(env) {
  return (env.PUBLIC_GO_API_URL || "https://adminm.bysmax.com").replace(/\/+$/, "");
}

// Lee la ficha por el endpoint público: no necesita sesión y devuelve el
// content completo, que es lo que hace falta para no pisar lo que el scraper
// no toca (view_settings, el resto de semantic_data).
export async function leerPlace(slug, env = cargarEnv()) {
  const res = await fetch(`${baseGo(env)}/api/public/places/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error(`no existe el place ${slug} (${res.status})`);
  return res.json();
}

export async function escribirContent(placeId, content, env = cargarEnv()) {
  const sesion = env.BM_SESSION;
  if (!sesion) {
    throw new Error(
      "falta BM_SESSION.\n" +
        "  Entra a https://admin-menus.bysmax.com logueado, abre DevTools →\n" +
        "  Application → Cookies, copia el valor de `bm_session` y córrelo así:\n" +
        "    BM_SESSION='...' node scripts/<script>.js ... --escribir",
    );
  }

  const res = await fetch(`${baseGo(env)}/api/places/${placeId}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      cookie: `bm_session=${sesion}`,
    },
    // El historial deja punto de retorno: si el scraper se equivoca, el menú
    // anterior se puede restaurar desde el panel.
    body: JSON.stringify({
      content,
      history: {
        source: "scraper",
        reasoning: "Menú re-escrapeado del sitio oficial",
        label: `SCRAPER: ${new Date().toISOString()}`,
      },
    }),
  });

  if (!res.ok) {
    const cuerpo = await res.text();
    if (res.status === 401) {
      throw new Error("Go rechazó la sesión (401). El BM_SESSION caducó; saca uno nuevo.");
    }
    throw new Error(`PUT ${res.status}: ${cuerpo.slice(0, 200)}`);
  }

  // Go purga el borde solo al escribir, si tiene REVALIDATE_URL configurado.
  return true;
}
