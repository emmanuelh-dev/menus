#!/usr/bin/env node
// Extrae pares (nombre de producto -> URL de imagen) del catálogo público de
// Uber Eats / Rappi / DiDi Food, y opcionalmente los casa contra el menú que ya
// tenemos en la base.
//
// Por qué existe: buscar la foto de cada producto una por una no converge. Se
// intentó con un modelo (delegación a agy, 2026-07-28) sobre los 168 items de
// Starbucks y devolvió 18 imágenes únicas, con el LOGOTIPO de Starbucks
// asignado a 117 items, todos marcados "confianza alta" — porque lo único que
// verificaba era que la URL respondiera 200, y un PNG del logo también
// responde 200. En estos catálogos, en cambio, el nombre y la foto vienen ya
// juntos en el mismo objeto: no hay nada que adivinar.
//
// Uso:
//   node scripts/scrape-menu-images.js <url>
//   node scripts/scrape-menu-images.js <archivo.html>          # ver nota de 403
//   node scripts/scrape-menu-images.js <url> --place starbucks # cruza con la BD
//   node scripts/scrape-menu-images.js <url> --out fotos.json
//
// Sobre el 403: Uber Eats bloquea peticiones sin navegador. Cuando pase, abre
// la tienda en tu navegador, "Guardar como > Página web completa", y pásale el
// .html a este script — el HTML guardado trae el mismo JSON embebido y el
// resto del proceso es idéntico. Rappi sí responde a curl.

import fs from "node:fs";
import path from "node:path";

const UA =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
	"(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const API_PUBLICA = process.env.GO_PUBLIC_API || "https://adminm.bysmax.com";

/** Normaliza para comparar nombres entre el catálogo y nuestra base: sin
 *  acentos, sin puntuación, minúsculas. "Piñacoco Yogurt Frappuccino" y
 *  "PIÑACOCO YOGURT FRAPPUCCINO®" tienen que ser el mismo. */
const norm = (s) =>
	(s || "")
		.toString()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();

const CLAVES_NOMBRE = /^(name|title|productname|itemname|displayname)$/i;
const CLAVES_IMAGEN = /(image|imageurl|photo|picture|thumbnail|img)/i;

const esUrlImagen = (v) =>
	typeof v === "string" &&
	/^https?:\/\//.test(v) &&
	!/\.svg(\?|$)/i.test(v) &&
	!/sprite|placeholder|logo|wordmark|icon/i.test(v);

/** Recorre cualquier JSON buscando objetos que tengan a la vez un nombre y una
 *  imagen. Es a propósito agnóstico del esquema: Uber, Rappi y DiDi cambian sus
 *  estructuras seguido, pero los dos campos siempre viven en el mismo objeto. */
function cosechar(nodo, salida, visto = new Set()) {
	if (!nodo || typeof nodo !== "object") return;
	if (visto.has(nodo)) return;
	visto.add(nodo);

	if (Array.isArray(nodo)) {
		for (const hijo of nodo) cosechar(hijo, salida, visto);
		return;
	}

	let nombre = null;
	let imagen = null;
	for (const [k, v] of Object.entries(nodo)) {
		if (typeof v === "string") {
			if (!nombre && CLAVES_NOMBRE.test(k) && v.trim()) nombre = v.trim();
			if (!imagen && CLAVES_IMAGEN.test(k) && esUrlImagen(v)) imagen = v;
		}
	}
	if (nombre && imagen) salida.push({ name: nombre, image: imagen });

	for (const v of Object.values(nodo)) cosechar(v, salida, visto);
}

/** Saca todos los bloques JSON embebidos en el HTML: <script type="application/json">,
 *  __NEXT_DATA__, y los trozos que Next mete en self.__next_f.push([...]). */
function jsonsDelHtml(html) {
	const bloques = [];

	const scripts = html.matchAll(
		/<script[^>]*type="application\/(?:ld\+)?json"[^>]*>([\s\S]*?)<\/script>/gi
	);
	for (const m of scripts) bloques.push(m[1]);

	const next = html.match(
		/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i
	);
	if (next) bloques.push(next[1]);

	// Uber guarda su estado en un script con el JSON escapado como texto.
	for (const m of html.matchAll(/<script[^>]*>\s*(\{[\s\S]{200,}?\})\s*<\/script>/gi)) {
		bloques.push(m[1]);
	}

	const parseados = [];
	for (const b of bloques) {
		try {
			parseados.push(JSON.parse(b.trim()));
		} catch {
			// Un bloque que no parsea no es un error: muchos <script> son JS, no
			// JSON. Se ignora y seguimos con los demás.
		}
	}
	return parseados;
}

async function traer(destino) {
	if (fs.existsSync(destino)) {
		return { html: fs.readFileSync(destino, "utf8"), origen: destino };
	}
	const res = await fetch(destino, {
		headers: {
			"User-Agent": UA,
			"Accept-Language": "es-MX,es;q=0.9",
			Accept: "text/html,application/xhtml+xml",
		},
		redirect: "follow",
	});
	if (!res.ok) {
		throw new Error(
			`${res.status} al pedir la página.` +
				(res.status === 403
					? "\nUber Eats bloquea a curl. Abre la tienda en el navegador," +
					  '\n"Guardar como > Página web completa", y pásale el .html a este script.'
					: "")
		);
	}
	return { html: await res.text(), origen: res.url };
}

async function menuDeLaBase(shortName) {
	const res = await fetch(`${API_PUBLICA}/api/public/places/${shortName}`);
	if (!res.ok) throw new Error(`API pública ${res.status} para ${shortName}`);
	const body = await res.json();
	const place = body.data || body;
	const items = [];
	for (const b of place.content?.blocks || []) {
		for (const it of b.data?.items || []) {
			items.push({ id: it.id, name: it.name, image: it.image || "" });
		}
	}
	return items;
}

async function main() {
	const args = process.argv.slice(2);
	const destino = args.find((a) => !a.startsWith("--"));
	if (!destino) {
		console.error(
			"Uso: node scripts/scrape-menu-images.js <url|archivo.html> [--place <short_name>] [--out <archivo.json>]"
		);
		process.exit(1);
	}
	const place = args.includes("--place") ? args[args.indexOf("--place") + 1] : null;
	const out = args.includes("--out")
		? args[args.indexOf("--out") + 1]
		: "menu-images.json";

	const { html, origen } = await traer(destino);
	console.log(`origen: ${origen} (${html.length} bytes)`);

	const cosecha = [];
	for (const json of jsonsDelHtml(html)) cosechar(json, cosecha);

	// Un mismo producto aparece varias veces (carrusel, categoría, buscador).
	// Nos quedamos con la primera imagen de cada nombre.
	const porNombre = new Map();
	for (const c of cosecha) {
		const k = norm(c.name);
		if (k && !porNombre.has(k)) porNombre.set(k, c);
	}
	console.log(`productos con foto en el catálogo: ${porNombre.size}`);

	if (porNombre.size === 0) {
		console.error(
			"\nNo se encontró ningún par nombre+imagen. Puede que la página cargue el\n" +
				"menú por JavaScript: guarda el HTML ya renderizado desde el navegador."
		);
		process.exit(2);
	}

	let resultado = [...porNombre.values()];

	if (place) {
		const nuestros = await menuDeLaBase(place);
		const casados = [];
		let yaTenian = 0;
		for (const it of nuestros) {
			if (it.image) {
				yaTenian++;
				continue; // nunca pisar una foto que ya pusiste a mano
			}
			const hit = porNombre.get(norm(it.name));
			if (hit) casados.push({ id: it.id, name: it.name, image: hit.image });
		}
		console.log(
			`\n${place}: ${nuestros.length} items · ${yaTenian} ya tenían foto · ` +
				`${casados.length} casados · ${nuestros.length - yaTenian - casados.length} sin resolver`
		);
		resultado = casados;
	}

	fs.writeFileSync(path.resolve(out), JSON.stringify(resultado, null, 1));
	console.log(`\nescrito: ${out} (${resultado.length} registros)`);
	console.log(
		"Nada se subió ni se guardó en la base. Revisa el archivo antes de aplicarlo."
	);
}

main().catch((e) => {
	console.error(e.message);
	process.exit(1);
});
