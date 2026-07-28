#!/usr/bin/env node
// Purga el cache de borde de Vercel por tag, a mano.
//
// Por qué existe: las páginas públicas se sirven con s-maxage de un año, así
// que la frescura depende por completo del purge por tag. Normalmente lo
// dispara admin-menus-go en cada escritura — pero si a ese servicio le faltan
// REVALIDATE_URL / REVALIDATE_SECRET, su cliente de purge es nil y no hace
// nada NI avisa (ver internal/revalidate/revalidate.go). Este script es la
// salida manual mientras eso no esté configurado, y la herramienta de rescate
// si algún día una página se queda pegada.
//
// Uso:
//   node scripts/purge-cache.js el-pollo-loco            # una ficha + listados
//   node scripts/purge-cache.js foo bar baz              # varias fichas
//   node scripts/purge-cache.js --all                    # TODOS los places
//   node scripts/purge-cache.js --listados               # solo places-all
//
// Requiere WEBHOOK_SECRET en el entorno (o en .env, que es de donde lo lee).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(HERE, "..");

const SITIO = process.env.PURGE_SITE || "https://menus.bysmax.com";
const API_PUBLICA = process.env.GO_PUBLIC_API || "https://adminm.bysmax.com";

// El tag global de listados y sitemaps. Debe coincidir con revalidate.TagAll
// en admin-menus-go y con el Vercel-Cache-Tag que emiten esas páginas.
const TAG_TODOS = "places-all";

function leerSecreto() {
	if (process.env.WEBHOOK_SECRET) return process.env.WEBHOOK_SECRET;
	const env = path.join(RAIZ, ".env");
	if (fs.existsSync(env)) {
		const m = fs.readFileSync(env, "utf8").match(/^WEBHOOK_SECRET=(.*)$/m);
		if (m) return m[1].trim();
	}
	return null;
}

/** El tag usa el short_name TAL CUAL, sin slugificar: hay short_name con puntos
 *  ("quesabirrias.laregia.mty") cuya URL real los conserva. Slugificar aquí
 *  purgaría un tag que ninguna página emite. */
const tagDeFicha = (shortName) => `place-${shortName}`;

async function todosLosShortNames() {
	const res = await fetch(`${API_PUBLICA}/api/public/places`);
	if (!res.ok) throw new Error(`API pública ${res.status}`);
	const body = await res.json();
	return (body.data || body || [])
		.map((p) => p.short_name)
		.filter(Boolean);
}

async function purgar(tags, secreto) {
	const res = await fetch(`${SITIO}/api/revalidate`, {
		method: "POST",
		headers: { "Content-Type": "application/json", "x-webhook-secret": secreto },
		body: JSON.stringify({ tags }),
	});
	const txt = await res.text();
	if (!res.ok) throw new Error(`revalidate ${res.status}: ${txt.slice(0, 200)}`);
	return txt;
}

async function main() {
	const secreto = leerSecreto();
	if (!secreto) {
		console.error("Falta WEBHOOK_SECRET (en el entorno o en .env).");
		process.exit(1);
	}

	const args = process.argv.slice(2);
	let tags;

	if (args.includes("--listados")) {
		tags = [TAG_TODOS];
	} else if (args.includes("--all")) {
		const nombres = await todosLosShortNames();
		console.log(`${nombres.length} places`);
		tags = [TAG_TODOS, ...nombres.map(tagDeFicha)];
	} else if (args.length > 0) {
		tags = [TAG_TODOS, ...args.map(tagDeFicha)];
	} else {
		console.error("Uso: node scripts/purge-cache.js <short_name...> | --all | --listados");
		process.exit(1);
	}

	// En lotes: --all son más de mil tags y el endpoint hace un invalidateByTag
	// por cada uno. Mandarlos todos en un request agota el tiempo de la función.
	const LOTE = 50;
	for (let i = 0; i < tags.length; i += LOTE) {
		const lote = tags.slice(i, i + LOTE);
		await purgar(lote, secreto);
		console.log(`  purgados ${Math.min(i + LOTE, tags.length)}/${tags.length}`);
	}
	console.log("listo");
}

main().catch((e) => {
	console.error(e.message);
	process.exit(1);
});
