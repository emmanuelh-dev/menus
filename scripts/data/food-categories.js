// Taxonomía de categorías de producto para el fallback de imágenes.
//
// El catálogo tiene 11,391 nombres distintos sin foto y la distribución es cola
// pura: los 500 nombres más repetidos cubren apenas el 17%. Buscar una imagen
// por producto es inviable (y las búsquedas automáticas devuelven basura), así
// que en vez de eso clasificamos cada item en una categoría y curamos UNA foto
// por categoría.
//
// El orden importa: se evalúa de arriba hacia abajo y gana la primera regla que
// haga match. Las reglas específicas van antes que las genéricas — `pizza
// hawaiana` tiene que caer en `pizza` antes de que `hawaiana` la mande a otro
// lado, y `pay de manzana` en `postre-pay` antes que `manzana` la mande a fruta.
//
// `id` es el nombre del asset en Cloudinary. `label` es solo para revisar.

/** @type {{id: string, label: string, re: RegExp}[]} */
export const CATEGORIES = [
	// ── Bebidas embotelladas ─────────────────────────────────────────────
	// Van primero porque muchas traen el sabor en el nombre (`fanta naranja`)
	// y si no, se van a `jugo` por la palabra naranja.
	{ id: "refresco-cola", label: "Refresco de cola", re: /\b(coca|pepsi)\b|coca-cola/ },
	{
		id: "refresco",
		label: "Refresco",
		re: /\b(sprite|fanta|mirinda|fresca|manzanita|sidral|mundet|squirt|seven ?up|7 ?up|delaware|refresco|soda|gaseosa)/,
	},
	{ id: "agua-mineral", label: "Agua mineral", re: /\b(mineral|topo chico|peñafiel|penafiel|quina)/ },
	{
		id: "agua",
		label: "Agua embotellada",
		re: /\b(agua natural|agua embotellada|ciel|bonafont|epura|e-pura|santa maria|aguas?\b)/,
	},
	{ id: "bebida-deportiva", label: "Bebida deportiva", re: /\b(gatorade|powerade|electrolit|suerox|pedialyte)/ },
	{ id: "bebida-energetica", label: "Bebida energética", re: /\b(red bull|monster|boost|energizante|energetic)/ },

	// ── Alcohol ──────────────────────────────────────────────────────────
	{ id: "michelada", label: "Michelada", re: /\b(michelada|chelada|cubana|ojo rojo)/ },
	{
		id: "cerveza",
		label: "Cerveza",
		re: /\b(cerveza|corona|tecate|indio|victoria|modelo|heineken|pacifico|bohemia|carta blanca|xx|dos equis|stella|miller|budweiser|amstel|michelob|cheve|caguama|six)/,
	},
	{ id: "coctel", label: "Coctel", re: /\b(margarita|mojito|piña colada|pina colada|daiquiri|paloma|cantarito|coctel|cocktail|sangria|clericot|carajillo)/ },
	{ id: "vino", label: "Vino", re: /\b(vino|copa de vino|tinto|blanco de la casa|espumoso|champagne|champaña|sidra)/ },
	{
		id: "destilado",
		label: "Destilado",
		re: /\b(tequila|mezcal|whisky|whiskey|\bron\b|vodka|ginebra|gin|brandy|cognac|bacardi|jose cuervo|buchanan|shot|caballito)/,
	},

	// ── Café y calientes ─────────────────────────────────────────────────
	// `chai latte` y `matcha latte` antes que `latte` a secas.
	{ id: "chocolate-caliente", label: "Chocolate caliente", re: /\b(chocolate caliente|champurrado|abuelita|atole)/ },
	{ id: "chai", label: "Chai", re: /\bchai\b/ },
	{ id: "matcha", label: "Matcha", re: /\bmatcha\b/ },
	{
		id: "frappe",
		label: "Frappé",
		re: /\b(frappe|frapp|frappuccino|frappucino|granizado|iced blended)/,
	},
	{ id: "cafe-frio", label: "Café frío", re: /\b(cold brew|nitro|cafe helado|iced coffee|cafe frio|shakerato)/ },
	{
		id: "cafe-leche",
		label: "Café con leche",
		re: /\b(latte|capuchino|cappuccino|capuccino|cappucino|moka|mocha|macchiato|machiatto|cortado|flat white|con leche)/,
	},
	{
		id: "cafe",
		label: "Café",
		re: /\b(cafe|espresso|expreso|expresso|americano|ristretto|lungo|descafeinado|nescafe|café)/,
	},
	{ id: "te", label: "Té", re: /\b(te negro|te verde|te de|te helado|iced tea|infusion|manzanilla|jamaica caliente|hierbabuena|tisana|\bte\b)/ },

	// ── Bebidas frías no alcohólicas ─────────────────────────────────────
	{ id: "malteada", label: "Malteada", re: /\b(malteada|milkshake|shake|licuado|smoothie|batido)/ },
	{ id: "agua-fresca", label: "Agua fresca", re: /\b(agua fresca|horchata|jamaica|tamarindo|pepino|sandia|melon)/ },
	{ id: "limonada", label: "Limonada", re: /\b(limonada|naranjada|limon con|lemonade)/ },
	{ id: "jugo", label: "Jugo", re: /\b(jugo|juice|zumo|naranja natural|verde detox|detox)/ },
	{ id: "leche", label: "Leche", re: /\b(leche|lala|alpura|yogur|yoghurt|yogurt)/ },

	// ── Pizza y pasta ────────────────────────────────────────────────────
	{ id: "pizza", label: "Pizza", re: /\b(pizza|calzone|pizzeta)/ },
	{ id: "pasta", label: "Pasta", re: /\b(pasta|espagueti|spaghetti|espaguetti|fettuccine|fettuccini|lasagna|lasaña|ravioli|penne|alfredo|macarron|mac and cheese|gnocchi)/ },

	// ── Hamburguesas y sándwiches ────────────────────────────────────────
	{ id: "hamburguesa", label: "Hamburguesa", re: /\b(hamburgues|burger|cheeseburger|whopper|bigmac|big mac|mcnifica)/ },
	{ id: "hotdog", label: "Hot dog", re: /\b(hot ?dog|jocho|salchicha asada|banderilla|corn ?dog)/ },
	{ id: "torta", label: "Torta", re: /\b(torta|lonche|pambazo|guajolota|cemita)/ },
	{
		id: "sandwich",
		label: "Sándwich",
		re: /\b(sandwich|sanduche|baguette|panini|bagel|croissant|club|wrap|subway|submarino)/,
	},

	// ── Antojito mexicano ────────────────────────────────────────────────
	{ id: "taco", label: "Tacos", re: /\b(taco|gringa|campechan|alambre|volcan|costra|pastor|suadero|tripa|barbacoa|cabeza|lengua|buche)/ },
	{ id: "burrito", label: "Burrito", re: /\b(burrito|burro|chimichanga)/ },
	{ id: "quesadilla", label: "Quesadilla", re: /\b(quesadilla|sincronizada|volteada)/ },
	{ id: "enchilada", label: "Enchiladas", re: /\b(enchilada|entomatada|enmolada|suiza)/ },
	{ id: "chilaquiles", label: "Chilaquiles", re: /\bchilaquil/ },
	{ id: "gordita", label: "Gorditas", re: /\b(gordita|sope|huarache|tlacoyo|memela)/ },
	{ id: "tostada", label: "Tostadas", re: /\b(tostada|flauta|dorada|taquito)/ },
	{ id: "tamal", label: "Tamal", re: /\b(tamal|corunda)/ },
	{ id: "elote", label: "Elote", re: /\b(elote|esquite|trolelote)/ },
	{ id: "pozole", label: "Pozole", re: /\bpozole\b/ },
	{ id: "menudo", label: "Menudo", re: /\b(menudo|pancita|mondongo)/ },
	{ id: "birria", label: "Birria", re: /\b(birria|barbacoa de)/ },

	// ── Asiática ─────────────────────────────────────────────────────────
	{ id: "sushi", label: "Sushi", re: /\b(sushi|maki|nigiri|sashimi|uramaki|hosomaki|gunkan|roll|rollo horneado)/ },
	{ id: "ramen", label: "Ramen", re: /\b(ramen|udon|pho|yakisoba|soba)/ },
	{ id: "arroz-frito", label: "Arroz frito", re: /\b(arroz frito|arroz chino|arroz oriental|chow mein|chop suey)/ },
	{ id: "tempura", label: "Tempura", re: /\b(tempura|gyoza|rangoon|spring ?roll|rollo primavera|edamame|takoyaki)/ },
	{ id: "curry", label: "Curry", re: /\b(curry|pad thai|teriyaki|tikka)/ },

	// ── Pollo ────────────────────────────────────────────────────────────
	{ id: "alitas", label: "Alitas", re: /\b(alita|wings|buffalo)/ },
	{ id: "boneless", label: "Boneless", re: /\b(boneless|bonless|tender|nugget|popcorn chicken|strips|crispy chicken)/ },
	{ id: "pollo-frito", label: "Pollo frito", re: /\b(pollo frito|pollo crujiente|pollo original|pollo empanizado|milanesa de pollo|chicken)/ },
	{ id: "pollo-rostizado", label: "Pollo rostizado", re: /\b(pollo rostizado|pollo asado|pollo entero|medio pollo|pollo a la|rosticeria)/ },
	{ id: "pollo", label: "Pollo", re: /\b(pollo|pechuga|pierna|muslo)/ },

	// ── Carnes ───────────────────────────────────────────────────────────
	{ id: "arrachera", label: "Arrachera", re: /\b(arrachera|fajita)/ },
	{ id: "corte", label: "Corte de carne", re: /\b(rib ?eye|ribeye|sirloin|new york|t-bone|tomahawk|picaña|picana|filete|medallon|corte)/ },
	{ id: "costillas", label: "Costillas", re: /\b(costilla|ribs|bbq ribs)/ },
	{ id: "carne-asada", label: "Carne asada", re: /\b(carne asada|asada|parrillada|molcajete|discada|arrachera norteña)/ },
	{ id: "milanesa", label: "Milanesa", re: /\b(milanesa|empanizado|escalopa)/ },
	{ id: "cerdo", label: "Cerdo", re: /\b(cerdo|puerco|chuleta|carnitas|chicharron|cochinita|lomo|jamon)/ },
	{ id: "res", label: "Res", re: /\b(\bres\b|bistec|bistek|machaca|deshebrada|salpicon|carne)/ },

	// ── Mar ──────────────────────────────────────────────────────────────
	{ id: "camaron", label: "Camarones", re: /\b(camaron|shrimp|gambas)/ },
	{ id: "pescado", label: "Pescado", re: /\b(pescado|filete de|mojarra|tilapia|salmon|atun|marlin|robalo|huachinango)/ },
	{ id: "ceviche", label: "Ceviche", re: /\b(ceviche|aguachile|tiradito)/ },
	{ id: "coctel-marisco", label: "Coctel de mariscos", re: /\b(coctel de|campechana|vuelve a la vida)/ },
	{ id: "mariscos", label: "Mariscos", re: /\b(marisco|pulpo|ostion|almeja|callo|jaiba|cangrejo|langosta|calamar)/ },

	// ── Botanas y guarniciones ───────────────────────────────────────────
	{ id: "papas-fritas", label: "Papas a la francesa", re: /\b(papas a la francesa|papas fritas|french fries|papas gajo|papas curly|papa gajo|fries)/ },
	{ id: "papa-horno", label: "Papa al horno", re: /\b(papa al horno|papa horneada|baked potato|pure de papa)/ },
	{ id: "aros-cebolla", label: "Aros de cebolla", re: /\b(aro de cebolla|aros de cebolla|onion ring)/ },
	{ id: "nachos", label: "Nachos", re: /\b(nacho|totopo)/ },
	{ id: "dedos-queso", label: "Dedos de queso", re: /\b(dedos de queso|mozzarella stick|queso frito|queso fundido|queso panela|choriqueso)/ },
	{ id: "guacamole", label: "Guacamole", re: /\b(guacamole|guaca)/ },
	{ id: "frijoles", label: "Frijoles", re: /\b(frijol|charros|refritos|puercos)/ },
	{ id: "arroz", label: "Arroz", re: /\b(arroz|arroz rojo|arroz blanco)/ },
	{ id: "botana", label: "Botana", re: /\b(botana|palomita|cacahuate|chicharron de|frituras|snack|chips)/ },

	// ── Ensaladas y sopas ────────────────────────────────────────────────
	{ id: "ensalada-cesar", label: "Ensalada césar", re: /\b(cesar|caesar)/ },
	{ id: "ensalada", label: "Ensalada", re: /\b(ensalada|salad|bowl verde)/ },
	{ id: "sopa", label: "Sopa", re: /\b(sopa|caldo|consome|crema de|bisque|fideo|minestrone)/ },

	// ── Desayuno ─────────────────────────────────────────────────────────
	{ id: "huevos", label: "Huevos", re: /\b(huevo|omelette|omelet|revuelto|estrellado|divorciado|rancheros|motuleños)/ },
	{ id: "hotcakes", label: "Hotcakes", re: /\b(hot ?cake|pancake|waffle|wafle|french toast|pan frances)/ },
	{ id: "molletes", label: "Molletes", re: /\bmollete/ },
	{ id: "desayuno", label: "Desayuno", re: /\b(desayuno|almuerzo|breakfast|paquete matutino)/ },

	// ── Panadería ────────────────────────────────────────────────────────
	{ id: "concha", label: "Concha", re: /\b(concha|bisquet|oreja|cuernito|pan dulce|garibaldi|polvoron|mantecada)/ },
	{ id: "dona", label: "Dona", re: /\b(dona|donut|doughnut|churro)/ },
	{ id: "muffin", label: "Muffin", re: /\b(muffin|panque|panqué|budin|roll de canela|cinnamon)/ },
	{ id: "galleta", label: "Galleta", re: /\b(galleta|cookie|biscotti|macaron)/ },
	{ id: "pan", label: "Pan", re: /\b(pan |baguette|bolillo|telera|focaccia|ciabatta)/ },

	// ── Postres ──────────────────────────────────────────────────────────
	{ id: "pastel", label: "Pastel", re: /\b(pastel|cake|tres leches|red velvet|rebanada de)/ },
	{ id: "cheesecake", label: "Cheesecake", re: /\b(cheesecake|tarta de queso)/ },
	{ id: "pay", label: "Pay", re: /\b(pays?\b|pie de|tarta)/ },
	{ id: "brownie", label: "Brownie", re: /\b(brownie|volcan de chocolate)/ },
	{ id: "helado", label: "Helado", re: /\b(helado|nieve|sundae|banana split|paleta|ice cream|mcflurry|blizzard)/ },
	{ id: "flan", label: "Flan", re: /\b(flan|gelatina|natilla|arroz con leche|creme brulee|tiramisu|mousse)/ },
	{ id: "crepa", label: "Crepa", re: /\b(crepa|crepe|marquesita)/ },
	{ id: "fruta", label: "Fruta", re: /\b(fruta|fresas con|platano|manzana|mango|coctel de frutas)/ },
	{ id: "postre", label: "Postre", re: /\b(postre|dessert|dulce)/ },

	// ── Cierre ───────────────────────────────────────────────────────────
	// Genéricas al final: si un item llegó hasta acá ya no hay pista de
	// comida, y una foto de "combo" o de "salsa" es mejor que un hueco.
	{ id: "salsa", label: "Salsa / aderezo", re: /\b(salsa|aderezo|dip|catsup|ketchup|mayonesa|mostaza|chimichurri|pico de gallo)/ },
	{ id: "combo", label: "Combo", re: /\b(combo|paquete|promocion|promo|meal|familiar|para compartir|cajita)/ },
	{ id: "guarnicion", label: "Guarnición", re: /\b(extra|adicional|orden de|guarnicion|porcion|acompañamiento|complemento)/ },
];

/** Quita acentos y baja a minúsculas, igual que la consulta de SQL. */
export function normalize(name) {
	return (name || "")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.trim();
}

/** Devuelve el `id` de categoría, o `null` si ninguna regla hace match. */
export function classify(name) {
	const n = normalize(name);
	if (!n) return null;
	for (const c of CATEGORIES) {
		if (c.re.test(n)) return c.id;
	}
	return null;
}
