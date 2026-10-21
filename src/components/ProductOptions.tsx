import { useState } from 'react';
import { configuredProduct, type ProductOption } from '../lib/product-options';

export default function ProductOptions({ item, money, onConfirm }: {
  item: { price: number; options: ProductOption[] };
  money: (value: number) => string;
  onConfirm: (options: Record<string, string>, quantity: number, price: number) => void;
}) {
  const [selection, setSelection] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const result = configuredProduct(item, selection);

  return (
    <div className="px-5 sm:px-6 pb-6 space-y-5">
      {item.options.map((group, index) => {
        const selected = selection[group.name] || [];
        const max = group.max_choices || 1;
        return (
          <fieldset key={index} className="space-y-2">
            <legend className="font-bold text-neutral-900">{group.name}</legend>
            <p className="text-sm text-neutral-500">
              {max === 1 ? 'Elige una opción' : `Elige hasta ${max} opciones`}
              {group.required ? ' · Obligatorio' : ' · Opcional'}
            </p>
            {group.values.map(value => (
              <label key={value} className="flex min-h-12 items-center gap-3 rounded-xl border border-neutral-200 px-3 py-2 cursor-pointer has-[:checked]:border-neutral-900 has-[:checked]:bg-neutral-50">
                <input
                  type={max === 1 ? 'radio' : 'checkbox'}
                  name={`product-option-${index}`}
                  value={value}
                  checked={selected.includes(value)}
                  disabled={max > 1 && !selected.includes(value) && selected.length >= max}
                  onChange={() => setSelection(prev => ({
                    ...prev,
                    [group.name]: max === 1 ? [value]
                      : selected.includes(value) ? selected.filter(entry => entry !== value) : [...selected, value],
                  }))}
                  className="h-5 w-5 accent-neutral-900 shrink-0"
                />
                <span className="flex-1 text-sm font-semibold text-neutral-800">{value}</span>
                {!!group.prices?.[value] && <span className="text-sm text-neutral-600">+{money(group.prices[value])} <span className="block text-xs">({money(configuredProduct(item, { ...selection, [group.name]: max === 1 ? [value] : selected.includes(value) ? selected : [...selected, value] }).price)} total c/u)</span></span>}
              </label>
            ))}
            {!group.required && selected.length > 0 && (
              <button type="button" onClick={() => setSelection(prev => ({ ...prev, [group.name]: [] }))} className="text-sm underline text-neutral-600">
                Quitar selección
              </button>
            )}
          </fieldset>
        );
      })}
      <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
        <span className="font-semibold text-neutral-800">Cantidad</span>
        <div className="flex items-center gap-4">
          <button type="button" aria-label="Reducir cantidad" disabled={quantity === 1} onClick={() => setQuantity(value => Math.max(1, value - 1))} className="h-11 w-11 rounded-xl bg-neutral-100 text-neutral-900 disabled:opacity-40">−</button>
          <span className="font-bold text-neutral-900" aria-live="polite">{quantity}</span>
          <button type="button" aria-label="Aumentar cantidad" onClick={() => setQuantity(value => value + 1)} className="h-11 w-11 rounded-xl bg-neutral-100 text-neutral-900">+</button>
        </div>
      </div>
      <button
        type="button"
        disabled={!result.valid}
        onClick={() => onConfirm(result.options, quantity, result.price)}
        className="w-full rounded-2xl bg-neutral-900 px-4 py-4 font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-500"
      >
        {result.valid ? `Agregar al carrito · ${money(Math.round(result.price * quantity * 100) / 100)}` : 'Selecciona las opciones obligatorias'}
      </button>
    </div>
  );
}
