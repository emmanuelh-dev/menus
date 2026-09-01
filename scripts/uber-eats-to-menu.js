#!/usr/bin/env node
// Convierte una página de Uber Eats guardada en "Página web completa" en un
// menú listo para la base: extrae los productos (nombre + precio + sección),
// sube las fotos a Cloudinary y aplica el resultado al place, ya sea
// rellenando solo los items que no tienen foto o reemplazando el menú entero.
//
// Por qué sube las imágenes: las fotos salen del CDN de Uber Eats, que
// bloquea hotlinks y puede morir. Subiéndolas a Cloudinary (res.cloudinary.com)
// el menú queda con URLs propias estables.
//
// Uso:
//   # Rellenar los items sin foto (casa por nombre, no pisa fotos existentes):
//   node scripts/uber-eats-to-menu.js "<archivo.html>" starbucks --modo rellenar
//
//   # Reemplazar todo el menú con lo extraído (agrupado por sección o por --categorias):
//   node scripts/uber-eats-to-menu.js "<archivo.html>" burger-king \
//     --modo reemplazar --categorias scripts/data/burger-king-categorias.json
//
//   # Aplicar a la base (requiere BM_SESSION en el entorno):
//   BM_SESSION='...' node scripts/uber-eats-to-menu.js "<archivo.html>" <slug> ... --escribir
//
// Con --escribir se guarda el content por Go y se purga el cache del borde.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { leerPlace, escribirContent, cargarEnv } from "./lib/places-go.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(HERE, "..");
const ENV = cargarEnv();

const CLOUD = ENV.PUBLIC_CLOUDINARY_CLOUD_NAME || "dvdq078aa";
const PRESET = ENV.PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default";
const CACHE_IMAGENES = path.join(HERE, "data", "cloudinary-uploaded.json");

// Secciones promocionales del carrusel de Uber Eats: duplican productos de las
// categorías reales, así que se descartan al agrupar por sección.
const SECCIONES_BASURA = new Set(["Featured items", "Save on Select Items"]);

const norm = (s) =>
	(s || "")
		.toString()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();

async function leerBytes(origen) {
	if (fs.existsSync(origen)) return fs.readFileSync(origen);
	if (/^https?:\/\//.test(origen)) {
		const r = await fetch(origen, {
			headers: { "User-Agent": "Mozilla/5.0" },
		});
		if (!r.ok) throw new Error(`HTTP ${r.status} al bajar ${origen.slice(0, 80)}`);
		const buf = Buffer.from(await r.arrayBuffer());
		if (buf.length < 4) throw new Error(`respuesta vacía de ${origen.slice(0, 80)}`);
		return buf;
	}
	throw new Error(`no existe el archivo: ${origen}`);
}

const MIME_POR_FIRMAS = [
	[0xff, 0xd8, 0xff], // jpeg
	[0x89, 0x50, 0x4e, 0x47], // png
	[0x52, 0x49, 0x46, 0x46], // webp (RIFF....WEBP)
	[0x47, 0x49, 0x46], // gif
];
function mimeDe(buf) {
	for (const f of MIME_POR_FIRMAS) {
		if (f.every((b, i) => buf[i] === b)) {
			if (buf[0] === 0x52) return "image/webp"; // RIFF
			if (buf[0] === 0x89) return "image/png";
			if (buf[0] === 0x47) return "image/gif";
			return "image/jpeg";
		}
	}
	return "image/jpeg";
}

async function subirImagen(origen) {
	const datos = await leerBytes(origen);
	const md5 = crypto.createHash("md5").update(datos).digest("hex");
	const cache = fs.existsSync(CACHE_IMAGENES)
		? JSON.parse(fs.readFileSync(CACHE_IMAGENES, "utf8"))
		: {};
	if (cache[md5]) return cache[md5];
	const b64 = `data:${mimeDe(datos)};base64,` + datos.toString("base64");
	const form = new FormData();
	form.append("file", b64);
	form.append("upload_preset", PRESET);
	const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
		method: "POST",
		body: form,
	});
	if (!r.ok) throw new Error(`Cloudinary ${r.status}: ${(await r.text()).slice(0, 200)}`);
	const d = await r.json();
	let url = d.secure_url;
	if (url.includes("/upload/")) url = url.replace("/upload/", "/upload/f_auto,q_auto,w_1000/");
	cache[md5] = url;
	fs.writeFileSync(CACHE_IMAGENES, JSON.stringify(cache, null, 1));
	return url;
}

/** Extrae items [nombre, precio, seccion, src] de un HTML guardado de Uber Eats. */
function parsearUber(html, dirHtml) {
	const SECCIONES_CANDIDATAS = /Featured items|Save on Select Items|Saca Las Mexas|Baby Burgers|Combos para 1|A La Carta|Noches BK|Promociones BK|Family King|Kids|Complementos|Postres|Bebidas|Desayunos|Extras/;

	const secs = [];
	for (const m of html.matchAll(/<h[23][^>]*>([^<]{2,50})<\/h[23]>/gi)) {
		const t = m[1].trim();
		if (SECCIONES_CANDIDATAS.test(t)) secs.push([m.index, t]);
	}
	const seccionDe = (pos) => {
		let s = "?";
		for (const [p, t] of secs) if (p < pos) s = t;
		return s;
	};

	// Mapa nombre -> src con el alt de cada <img> (Chrome guarda las fotos en
	// ../<nombre>.html_files/ y reescribe el src a la ruta local).
	const imgPorAlt = new Map();
	for (const m of html.matchAll(/<img[^>]*alt="([^"]+)"[^>]*src="([^"]+)"/gi)) {
		let alt = m[1].trim();
		const src = m[2].trim();
		if (!alt || !src || src.startsWith("data:")) continue;
		alt = alt
			.replace(/&amp;/g, "&")
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'");
		imgPorAlt.set(alt, src);
	}

	const resolucionDe = (src) => {
		// El HTML guarda los src con entidades ("Menu &amp; Prices"); el archivo
		// real se llama con el carácter ya desescapado.
		const limpio = src.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
		if (/^https?:\/\//.test(limpio)) return limpio;
		const ruta = path.resolve(dirHtml, limpio.replace(/^\.\//, ""));
		return fs.existsSync(ruta) ? ruta : limpio;
	};

	const items = [];
	const vistos = new Set();
	// La tarjeta cambia de markup entre builds y marcas de Uber Eats: a veces es
	// un `<li class="_jN">`, otras un `<div data-testid="store-item-…">`. Se
	// casan ambos y se procesan en orden de aparición.
	const CARD = /<li class="_j\d+">|data-testid="store-item-[^"]*"/gi;
	for (const card of html.matchAll(CARD)) {
		const blk = html.slice(card.index, card.index + 2500);
		const nm = blk.match(/data-testid="rich-text"[^>]*>([^<]{2,80})<\/span>/);
		if (!nm) continue;
		const name = nm[1]
			.trim()
			.replace(/&amp;/g, "&")
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'");
		if (!name || vistos.has(name)) continue;
		if (/^(Uber Eats|Google|Download on the App Store|Get it on Google Play)$/.test(name)) continue;
		vistos.add(name);
		const precio = blk.match(/MX\$(\d+\.?\d*)/);
		const src = imgPorAlt.get(name);
		items.push({
			name,
			price: precio ? Number(precio[1]) : null,
			seccion: seccionDe(card.index),
			src: src ? resolucionDe(src) : null,
		});
	}
	return items;
}

/** Arma los bloques de content a partir de los items extraídos. */
function bloquesDesdeItems(items, categorias) {
	const porNombre = new Map(items.map((i) => [i.name, i]));
	const bloques = [];

	const emitir = (title, nombres) => {
		const dataItems = [];
		for (const nombre of nombres) {
			const it = porNombre.get(nombre);
			if (!it) {
				console.error(`  !! no extraído: ${nombre}`);
				continue;
			}
			dataItems.push({
				id: randomUUID(),
				name: it.name,
				image: "",
				price: it.price ?? 0,
				available: true,
				description: "",
			});
		}
		if (dataItems.length) {
			bloques.push({ id: randomUUID(), data: { title, items: dataItems }, type: "section" });
		}
	};

	if (categorias) {
		for (const [title, nombres] of categorias.bloques) emitir(title, nombres);
		return bloques;
	}

	// Agrupación genérica por sección de Uber Eats (sin carruseles promocionales).
	const porSeccion = new Map();
	for (const it of items) {
		if (SECCIONES_BASURA.has(it.seccion)) continue;
		if (!porSeccion.has(it.seccion)) porSeccion.set(it.seccion, []);
		porSeccion.get(it.seccion).push(it.name);
	}
	for (const [seccion, nombres] of porSeccion) emitir(seccion, nombres);
	return bloques;
}

async function main() {
	const args = process.argv.slice(2);
	const posicionales = args.filter((a) => !a.startsWith("--"));
	const archivo = posicionales[0];
	const slug = posicionales[1];
	const extraer = (flag, fallo) => {
		const i = args.indexOf(flag);
		return i >= 0 ? args[i + 1] : fallo;
	};
	const modo = extraer("--modo", "rellenar");
	const categoriasArchivo = extraer("--categorias", null);
	const escribir = args.includes("--escribir");

	if (!archivo || !slug) {
		console.error(
			"Uso: node scripts/uber-eats-to-menu.js <archivo.html> <slug> " +
				"[--modo rellenar|reemplazar] [--categorias <json>] [--escribir]"
		);
		process.exit(1);
	}
	if (!["rellenar", "reemplazar"].includes(modo)) {
		console.error(`modo inválido: ${modo} (usa rellenar o reemplazar)`);
		process.exit(1);
	}
	if (!fs.existsSync(archivo)) {
		console.error(`no existe el archivo: ${archivo}`);
		process.exit(1);
	}

	const categorias = categoriasArchivo
		? JSON.parse(fs.readFileSync(path.resolve(categoriasArchivo), "utf8"))
		: null;

	const html = fs.readFileSync(archivo, "utf8");
	const items = parsearUber(html, path.dirname(path.resolve(archivo)));
	console.log(`extraídos: ${items.length} productos`);
	const conFoto = items.filter((i) => i.src).length;
	const sinPrecio = items.filter((i) => !i.price).length;
	console.log(`con foto: ${conFoto} · sin precio: ${sinPrecio}`);

	const place = await leerPlace(slug);
	console.log(`${slug}: id ${place.id} · ${(place.content?.blocks || []).length} bloques`);

	const content = JSON.parse(JSON.stringify(place.content));

	if (modo === "rellenar") {
		const porNombre = new Map(items.map((i) => [norm(i.name), i]));
		let aplicados = 0;
		let conFotoBase = 0;
		for (const b of content.blocks || []) {
			for (const it of b.data?.items || []) {
				if (it.image) {
					conFotoBase++;
					continue; // nunca pisar una foto que ya existe
				}
				const hit = porNombre.get(norm(it.name));
				if (hit?.src) {
					it.image = await subirImagen(hit.src);
					aplicados++;
					console.log(`ok ${it.name}`);
				}
			}
		}
		console.log(`\nrellenados: ${aplicados} · ya tenían foto: ${conFotoBase}`);
	} else {
		const nuevos = bloquesDesdeItems(items, categorias);
		const porNombre = new Map(items.map((i) => [i.name, i]));
		let conImagen = 0;
		for (const b of nuevos) {
			for (const it of b.data?.items || []) {
				const ex = porNombre.get(it.name);
				if (ex?.src) {
					it.image = await subirImagen(ex.src);
					conImagen++;
					console.log(`ok ${it.name}`);
				}
			}
		}
		const total = nuevos.reduce((n, b) => n + (b.data?.items?.length || 0), 0);
		content.blocks = nuevos;
		console.log(`\nbloques: ${nuevos.length} · items: ${total} · con imagen: ${conImagen}`);
	}

	const salida = path.join(ENV.TMPDIR || "/tmp", `${slug}_content_nuevo.json`);
	fs.writeFileSync(salida, JSON.stringify(content, null, 2));
	console.log(`content preparado: ${salida}`);

	if (!escribir) {
		console.log("\nNada se guardó. Revisa el archivo y corre con --escribir para aplicarlo.");
		return;
	}

	await escribirContent(place.id, content, ENV);
	console.log("escrito por Go ✓");

	const purge = spawnSync("node", [path.join(HERE, "purge-cache.js"), slug], {
		stdio: "inherit",
		env: process.env,
	});
	if (purge.status !== 0) process.exit(purge.status ?? 1);
}

main().catch((e) => {
	console.error(e.message);
	process.exit(1);
});
