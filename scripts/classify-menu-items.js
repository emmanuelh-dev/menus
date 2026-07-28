#!/usr/bin/env node
// Clasifica cada item de menú sin foto en una categoría de `data/food-categories.js`.
//
// Por qué existe: hay 15,429 items sin imagen repartidos en 11,391 nombres
// distintos, así que conseguir una foto por producto es inviable. En vez de eso
// mapeamos cada item a una de ~97 categorías y curamos UNA foto por categoría.
//
// Dos pasadas:
//   1. Reglas de keywords — resuelve ~75% gratis y sin latencia.
//   2. Gemini Flash Lite — el resto. Son nombres que sólo se entienden con
//      contexto: `hawaiana` es pizza por la sección en la que vive, `domingo`
//      es una promo del día, `taro` es sushi. Ninguna regex saca eso.
//
// El resultado se cachea en disco por nombre normalizado, así que volver a
// correrlo sólo consulta lo que no estaba.
//
// Uso:
//   psql "$DATABASE_URL" -At -F$'\t' -f scripts/sql/items-sin-imagen.sql > /tmp/items.tsv
//   node scripts/classify-menu-items.js /tmp/items.tsv
//
// Entrada TSV: nombre \t veces \t {secciones} \t {lugares}
// Salida: scripts/data/item-categories.json  → { "<nombre normalizado>": "<id>" }

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORIES, classify, normalize } from "./data/food-categories.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(HERE, "data", "item-categories.json");

// Lite porque la tarea es clasificar contra una lista cerrada, no razonar.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const BATCH = 120;

const KEY = process.env.GEMINI_API_KEY || process.env.PUBLIC_GEMINI_API_KEY;
if (!KEY) {
	console.error("Falta GEMINI_API_KEY (o PUBLIC_GEMINI_API_KEY) en el entorno.");
	process.exit(1);
}

const IDS = new Set(CATEGORIES.map((c) => c.id));
const CATALOGO = CATEGORIES.map((c) => `${c.id} = ${c.label}`).join("\n");

/** Postgres imprime arrays como `{a,b}`; los elementos con coma vienen entre comillas. */
function parsePgArray(raw) {
	if (!raw || raw === "{}") return [];
	return (raw.replace(/^\{|\}$/g, "").match(/"(?:[^"\\]|\\.)*"|[^,]+/g) || [])
		.map((s) => s.replace(/^"|"$/g, "").replace(/\\"/g, '"').trim())
		.filter(Boolean);
}

function leerTsv(file) {
	return fs
		.readFileSync(file, "utf8")
		.split("\n")
		.filter(Boolean)
		.map((line) => {
			const [name, count, secciones, lugares] = line.split("\t");
			return {
				name,
				count: Number(count) || 1,
				secciones: parsePgArray(secciones),
				lugares: parsePgArray(lugares),
			};
		})
		.filter((r) => r.name && r.name.trim());
}

async function preguntarGemini(lote) {
	// El contexto es lo que hace que esta pasada valga la pena: sin la sección,
	// `hawaiana` no es clasificable ni por un humano.
	const lista = lote
		.map((r, i) => {
			const ctx = [r.secciones[0], r.lugares[0]].filter(Boolean).join(" · ");
			return `${i + 1}. ${r.name}${ctx ? `   [${ctx}]` : ""}`;
		})
		.join("\n");

	const prompt = `Eres un clasificador de productos de menús de restaurantes mexicanos.

Para cada producto responde con el ID de la categoría que mejor le corresponde.
El texto entre corchetes es el nombre de la sección del menú y del restaurante:
úsalo para desambiguar (por ejemplo "hawaiana" en una sección de PIZZAS es pizza).

Categorías válidas:
${CATALOGO}

Reglas:
- Responde SOLO con la categoría, nunca inventes IDs nuevos.
- Si el producto es una promoción, paquete o combo sin comida identificable, usa "combo".
- Si de plano no hay forma de saber qué es, usa "combo".

Productos:
${lista}`;

	const res = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				contents: [{ parts: [{ text: prompt }] }],
				generationConfig: {
					temperature: 0,
					responseMimeType: "application/json",
					responseSchema: {
						type: "ARRAY",
						items: {
							type: "OBJECT",
							properties: {
								i: { type: "INTEGER" },
								cat: { type: "STRING" },
							},
							required: ["i", "cat"],
						},
					},
				},
			}),
		},
	);

	if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
	const data = await res.json();
	const txt = data.candidates?.[0]?.content?.parts?.[0]?.text;
	if (!txt) throw new Error("Gemini respondió sin texto");

	const out = {};
	for (const { i, cat } of JSON.parse(txt)) {
		const row = lote[i - 1];
		// Descartamos IDs inventados en vez de escribirlos: una categoría que no
		// existe no tiene imagen y rompería el fallback en silencio.
		if (row && IDS.has(cat)) out[row.name] = cat;
	}
	return out;
}

async function main() {
	const file = process.argv[2];
	if (!file) {
		console.error("Uso: node scripts/classify-menu-items.js <items.tsv>");
		process.exit(1);
	}

	const rows = leerTsv(file);
	const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : {};

	let porReglas = 0;
	const pendientes = [];
	for (const r of rows) {
		const key = normalize(r.name);
		if (cache[key]) continue;
		const cat = classify(r.name);
		if (cat) {
			cache[key] = cat;
			porReglas++;
		} else {
			pendientes.push(r);
		}
	}

	console.log(`${rows.length} nombres · ${porReglas} por reglas · ${pendientes.length} a Gemini`);

	// Los más repetidos primero: si algo falla a media corrida, lo que ya quedó
	// resuelto es lo que más páginas afecta.
	pendientes.sort((a, b) => b.count - a.count);

	for (let i = 0; i < pendientes.length; i += BATCH) {
		const lote = pendientes.slice(i, i + BATCH);
		const n = Math.floor(i / BATCH) + 1;
		const total = Math.ceil(pendientes.length / BATCH);
		try {
			const res = await preguntarGemini(lote);
			for (const [name, cat] of Object.entries(res)) cache[normalize(name)] = cat;
			console.log(`  lote ${n}/${total} → ${Object.keys(res).length}/${lote.length}`);
		} catch (e) {
			console.error(`  lote ${n}/${total} FALLÓ: ${e.message}`);
		}
		// Se guarda en cada lote para poder cortar la corrida sin perder nada.
		fs.writeFileSync(CACHE, JSON.stringify(cache, null, "\t"));
	}

	const cubiertos = rows.filter((r) => cache[normalize(r.name)]);
	const items = rows.reduce((s, r) => s + r.count, 0);
	const itemsCub = cubiertos.reduce((s, r) => s + r.count, 0);
	console.log(
		`\nlisto · nombres ${cubiertos.length}/${rows.length} · items ${itemsCub}/${items} (${((100 * itemsCub) / items).toFixed(1)}%)`,
	);
	console.log(`cache → ${CACHE}`);
}

main();
