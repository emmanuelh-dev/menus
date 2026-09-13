// Moneda del lugar.
//
// El dueño la configura en el panel (semantic_data.currency, ISO-4217: MXN,
// USD, ARS, GTQ, COP, CLP, PEN, EUR...). Antes todo se imprimía con un "$"
// quemado, que en Argentina o Guatemala se lee mal o ambiguo. Aquí vive el
// único mapeo símbolo/moneda para no repetirlo en cada menú, ficha y schema.

const CURRENCY_SYMBOLS: Record<string, string> = {
	MXN: "$",
	USD: "US$",
	ARS: "AR$",
	GTQ: "Q",
	COP: "CO$",
	CLP: "CL$",
	PEN: "S/",
	EUR: "€",
};

/** Moneda por defecto: el sitio nació en México y no queremos romper lo que ya
 *  está publicado sin el campo. */
export const DEFAULT_CURRENCY = "MXN";

/** Código ISO-4217 en mayúsculas, con fallback a MXN. Úsalo en el schema.org
 *  (`priceCurrency` / `currenciesAccepted`), no para mostrar en pantalla. */
export function currencyCode(currency?: string): string {
	const code = (currency || "").toUpperCase().trim();
	return code || DEFAULT_CURRENCY;
}

/** Símbolo para mostrar precios. Monedas desconocidas caen a "$". */
export function currencySymbol(currency?: string): string {
	return CURRENCY_SYMBOLS[currencyCode(currency)] || "$";
}

/** Formatea un monto con el símbolo del lugar: 159 -> "$159", "159.5" ->
 *  "US$159.50". Acepta número o string (hay precios scrapeados como texto).
 *  Enteros sin decimales; con centavos, dos. */
export function formatMoney(value: number | string, currency?: string): string {
	const amount =
		typeof value === "number"
			? value
			: parseFloat(String(value ?? "").replace(/[^0-9.]/g, ""));
	if (!Number.isFinite(amount)) return "";
	const formatted = Number.isInteger(amount)
		? amount.toLocaleString("es-MX")
		: amount.toLocaleString("es-MX", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			});
	return `${currencySymbol(currency)}${formatted}`;
}
