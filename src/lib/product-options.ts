export interface ProductOption {
  name: string;
  values: string[];
  prices?: Record<string, number>;
  required?: boolean;
  max_choices?: number;
}

export function packageLimit(item: { name?: string; description?: string; options?: ProductOption[] }) {
  const last = item.options?.at(-1);
  // Un tamaño o presentación nunca representa piezas para repartir.
  if (!last || /^(tamaño|cantidad \/ presentación)$/i.test(last.name.trim())) return null;
  const text = `${item.name || ''} ${item.description || ''}`;
  const match = text.match(/(?:paquete|combo|pqt|ord[en]+|pzs|piezas|ítems)\s*(?:de|:)?\s*(\d+)/i)
    || text.match(/(\d+)\s*(?:piezas|pzs|pazas|ítems|items|pzas)/i);
  return match ? Number(match[1]) || null : null;
}

export function configuredProduct(item: { price: number; options?: ProductOption[] }, selection: Record<string, string[]>) {
  let cents = Math.round(item.price * 100);
  let valid = true;
  const options: Record<string, string> = {};
  for (const group of item.options || []) {
    const values = selection[group.name] || [];
    if ((group.required && !values.length) || values.length > (group.max_choices || 1)
      || new Set(values).size !== values.length || values.some(value => !group.values.includes(value))) valid = false;
    for (const value of values) cents += Math.round((group.prices?.[value] || 0) * 100);
    if (values.length) options[group.name] = values.join(', ');
  }
  return { valid, price: cents / 100, options };
}
