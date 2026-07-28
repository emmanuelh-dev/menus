#!/usr/bin/env node
/**
 * check-urls.js — verifica que no se haya caído ninguna página.
 *
 * Pega cada ruta contra el sitio y reporta cualquier cosa que no sea 200.
 * Pensado para correrse después de un deploy o una migración: si una ruta que
 * antes daba tráfico ahora tira 404/500, sale aquí.
 *
 * Uso:
 *   node scripts/check-urls.js                          # top-paths.txt contra prod
 *   node scripts/check-urls.js --source sitemap         # TODO el sitemap (1000+ URLs)
 *   node scripts/check-urls.js --source both
 *   node scripts/check-urls.js --base http://localhost:4321
 *   node scripts/check-urls.js --json out.json
 *
 * Flags:
 *   --base <url>        Origen a probar. Default https://menus.bysmax.com
 *   --file <ruta>       Lista de rutas. Default scripts/data/top-paths.txt
 *   --source file|sitemap|both
 *   --concurrency <n>   Peticiones en paralelo. Default 8
 *   --timeout <ms>      Default 20000
 *   --retries <n>       Reintentos ante 5xx / error de red. Default 1
 *   --all               Imprime también las OK, no solo los fallos
 *   --json <ruta>       Vuelca el resultado completo a JSON
 *
 * Sale con código 1 si hay al menos un fallo (sirve para CI).
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_BASE = "https://menus.bysmax.com";
const DEFAULT_FILE = "scripts/data/top-paths.txt";
const UA =
  "bysmax-link-checker/1.0 (+https://menus.bysmax.com) node-fetch";

function parseArgs(argv) {
  const args = {
    base: DEFAULT_BASE,
    file: DEFAULT_FILE,
    source: "file",
    concurrency: 8,
    timeout: 20000,
    retries: 1,
    all: false,
    json: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--base") args.base = next().replace(/\/$/, "");
    else if (a === "--file") args.file = next();
    else if (a === "--source") args.source = next();
    else if (a === "--concurrency") args.concurrency = Number(next());
    else if (a === "--timeout") args.timeout = Number(next());
    else if (a === "--retries") args.retries = Number(next());
    else if (a === "--all") args.all = true;
    else if (a === "--json") args.json = next();
    else if (a === "--help" || a === "-h") {
      console.log(HELP);
      process.exit(0);
    } else {
      console.error(`Flag desconocido: ${a}`);
      process.exit(2);
    }
  }
  if (!["file", "sitemap", "both"].includes(args.source)) {
    console.error(`--source debe ser file, sitemap o both (recibí "${args.source}")`);
    process.exit(2);
  }
  return args;
}

const HELP = `check-urls.js — verifica que no se haya caído ninguna página.

  node scripts/check-urls.js                      top-paths.txt contra prod
  node scripts/check-urls.js --source sitemap     todo el sitemap
  node scripts/check-urls.js --base http://localhost:4321

  --base <url>       default ${DEFAULT_BASE}
  --file <ruta>      default ${DEFAULT_FILE}
  --source <s>       file | sitemap | both      default file
  --concurrency <n>  default 8
  --timeout <ms>     default 20000
  --retries <n>      reintentos ante 5xx        default 1
  --all              imprime también las OK
  --json <ruta>      vuelca el resultado a JSON

Sale con código 1 si hay al menos un fallo.`;

/** Lee la lista de rutas. Tolera un volcado crudo de Analytics: se queda solo
 *  con las líneas que empiezan con "/" y descarta números y encabezados. */
async function pathsFromFile(file) {
  const raw = await readFile(file, "utf8");
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("/"));
}

const LOC_RE = /<loc>([^<]+)<\/loc>/g;

/** Descubre sitemaps vía robots.txt y extrae todas las <loc>, entrando a los
 *  <sitemapindex> de forma recursiva. */
async function pathsFromSitemap(base, timeout) {
  const robots = await fetchText(`${base}/robots.txt`, timeout);
  if (!robots) {
    console.error(`No pude leer ${base}/robots.txt`);
    return { paths: [], sitemapErrors: [`${base}/robots.txt`] };
  }

  const queue = [
    ...new Set(
      robots
        .split("\n")
        .filter((l) => /^\s*sitemap:/i.test(l))
        .map((l) => l.split(/:\s*/).slice(1).join(":").trim())
        .filter(Boolean),
    ),
  ];

  const seenSitemaps = new Set();
  const locs = new Set();
  const sitemapErrors = [];

  while (queue.length) {
    const url = queue.shift();
    if (seenSitemaps.has(url)) continue;
    seenSitemaps.add(url);

    const xml = await fetchText(url, timeout);
    if (!xml) {
      sitemapErrors.push(url);
      continue;
    }
    const isIndex = /<sitemapindex/i.test(xml);
    for (const m of xml.matchAll(LOC_RE)) {
      const loc = decodeXmlEntities(m[1].trim());
      if (isIndex) queue.push(loc);
      else locs.add(loc);
    }
  }

  const paths = [...locs]
    .map((u) => {
      try {
        return new URL(u).pathname + new URL(u).search;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return { paths, sitemapErrors, sitemapCount: seenSitemaps.size };
}

function decodeXmlEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function fetchText(url, timeout) {
  try {
    const res = await withTimeout(
      (signal) => fetch(url, { signal, headers: { "user-agent": UA } }),
      timeout,
    );
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function withTimeout(fn, ms) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  return Promise.resolve(fn(ac.signal)).finally(() => clearTimeout(t));
}

/** Una petición. GET con redirect manual: un 301 no es un fallo duro, pero
 *  quiero verlo, porque una redirección a "/" es un 404 disfrazado. */
async function check(url, { timeout, retries }) {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const started = Date.now();
    try {
      const res = await withTimeout(
        (signal) =>
          fetch(url, {
            signal,
            redirect: "manual",
            headers: { "user-agent": UA, accept: "text/html,*/*" },
          }),
        timeout,
      );
      const ms = Date.now() - started;
      // No necesito el cuerpo; soltarlo libera el socket para el siguiente.
      res.body?.cancel().catch(() => {});

      const result = {
        url,
        status: res.status,
        ms,
        location: res.headers.get("location") ?? null,
        cache: res.headers.get("x-vercel-cache") ?? null,
        age: res.headers.get("age") ?? null,
        attempt: attempt + 1,
      };
      // Reintentar solo 5xx: un 404 es estable, no gana nada con repetirse.
      if (res.status >= 500 && attempt < retries) {
        lastError = result;
        continue;
      }
      return result;
    } catch (err) {
      lastError = {
        url,
        status: 0,
        ms: Date.now() - started,
        error: err.name === "AbortError" ? `timeout ${timeout}ms` : String(err.message ?? err),
        attempt: attempt + 1,
      };
      if (attempt < retries) continue;
    }
  }
  return lastError;
}

function classify(r) {
  if (r.status === 0) return "error";
  if (r.status >= 500) return "5xx";
  if (r.status === 404 || r.status === 410) return "404";
  if (r.status >= 400) return "4xx";
  if (r.status >= 300) return "redirect";
  return "ok";
}

async function runPool(items, concurrency, worker, onProgress) {
  const results = new Array(items.length);
  let cursor = 0;
  let done = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
      onProgress(++done, items.length);
    }
  });
  await Promise.all(runners);
  return results;
}

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  bold: "\x1b[1m",
};
const color = process.stdout.isTTY;
const c = (code, s) => (color ? code + s + C.reset : s);

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let paths = [];
  let sitemapMeta = null;

  if (args.source === "file" || args.source === "both") {
    const file = path.isAbsolute(args.file) ? args.file : path.resolve(process.cwd(), args.file);
    paths.push(...(await pathsFromFile(file)));
  }
  if (args.source === "sitemap" || args.source === "both") {
    sitemapMeta = await pathsFromSitemap(args.base, args.timeout);
    paths.push(...sitemapMeta.paths);
  }

  paths = [...new Set(paths)];
  if (paths.length === 0) {
    console.error("No hay rutas que revisar.");
    process.exit(2);
  }

  console.log(
    `${c(C.bold, "Revisando")} ${paths.length} rutas contra ${c(C.bold, args.base)} ` +
      `${c(C.dim, `(concurrencia ${args.concurrency})`)}`,
  );
  if (sitemapMeta) {
    console.log(
      c(C.dim, `  sitemaps leídos: ${sitemapMeta.sitemapCount}`) +
        (sitemapMeta.sitemapErrors.length
          ? c(C.red, `  · sitemaps que fallaron: ${sitemapMeta.sitemapErrors.join(", ")}`)
          : ""),
    );
  }

  const started = Date.now();
  const results = await runPool(
    paths,
    args.concurrency,
    // new URL() en vez de encodeURI(): las rutas del sitemap ya vienen
    // percent-encoded (motel-se%C3%B1orial) y encodeURI las volvería a
    // codificar (%25C3%25B1), disparando 404 falsos.
    (p) => check(new URL(p, args.base + "/").href, args),
    (done, total) => {
      if (process.stdout.isTTY) {
        process.stdout.write(`\r${c(C.dim, `  ${done}/${total}`)}`);
      }
    },
  );
  if (process.stdout.isTTY) process.stdout.write("\r\x1b[K");

  const buckets = { ok: [], redirect: [], "404": [], "4xx": [], "5xx": [], error: [] };
  for (const r of results) buckets[classify(r)].push(r);

  const line = (r) => {
    const status = r.status === 0 ? "ERR" : String(r.status);
    const extra = [
      r.location ? `→ ${r.location}` : null,
      r.error ?? null,
      r.cache ? c(C.dim, r.cache + (r.age ? ` age=${r.age}` : "")) : null,
    ]
      .filter(Boolean)
      .join(" ");
    return `  ${status.padEnd(4)} ${new URL(r.url).pathname.padEnd(60)} ${c(C.dim, String(r.ms) + "ms")} ${extra}`;
  };

  const problem = [...buckets.error, ...buckets["5xx"], ...buckets["404"], ...buckets["4xx"]];

  if (problem.length) {
    console.log(`\n${c(C.red + C.bold, `✗ ${problem.length} rutas caídas`)}`);
    for (const r of problem) console.log(c(C.red, line(r)));
  }
  if (buckets.redirect.length) {
    console.log(
      `\n${c(C.yellow + C.bold, `↻ ${buckets.redirect.length} redirecciones`)} ${c(C.dim, "(revisa que no apunten a la home)")}`,
    );
    for (const r of buckets.redirect) console.log(c(C.yellow, line(r)));
  }
  if (args.all && buckets.ok.length) {
    console.log(`\n${c(C.green + C.bold, `✓ ${buckets.ok.length} OK`)}`);
    for (const r of buckets.ok) console.log(line(r));
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  const hits = buckets.ok.filter((r) => r.cache === "HIT").length;
  console.log(
    `\n${c(C.bold, "Resumen")} ${c(C.dim, `(${elapsed}s)`)}\n` +
      `  ${c(C.green, `OK       ${buckets.ok.length}`)}\n` +
      `  ${c(C.yellow, `Redirect ${buckets.redirect.length}`)}\n` +
      `  ${c(C.red, `404      ${buckets["404"].length}`)}\n` +
      `  ${c(C.red, `4xx      ${buckets["4xx"].length}`)}\n` +
      `  ${c(C.red, `5xx      ${buckets["5xx"].length}`)}\n` +
      `  ${c(C.red, `Error    ${buckets.error.length}`)}\n` +
      c(C.dim, `  cache HIT ${hits}/${buckets.ok.length} de las OK`),
  );

  if (args.json) {
    await writeFile(
      args.json,
      JSON.stringify(
        { base: args.base, checkedAt: new Date().toISOString(), elapsed, results },
        null,
        2,
      ),
    );
    console.log(c(C.dim, `\nJSON en ${args.json}`));
  }

  process.exit(problem.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
