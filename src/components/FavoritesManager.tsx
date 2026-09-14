import { useEffect, useMemo, useState } from 'react';
import { Heart, Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import { formatMoney } from '../lib/money';

type Option = { name: string; values: string[]; prices?: Record<string, number>; required?: boolean; max_choices?: number };
type Item = { id: string; name: string; price: number; options?: Option[] };
type Favorite = { id: string; name: string; slug: string };
type CartItem = Item & { lineId: string; quantity: number; selectedOptions: Record<string, string[]>; unitPrice: number };

interface Props { placeSlug: string; blocks?: any[]; currency?: string; enableCart?: boolean }
const storage = <T,>(key: string): T[] => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
const save = <T,>(key: string, value: T[]) => localStorage.setItem(key, JSON.stringify(value));
const cartKey = (slug: string) => `cart_${slug}`;
const favoritesKey = (slug: string) => `favorites_${slug}`;
const defaults = (item: Item) => Object.fromEntries((item.options || []).map(option => [option.name, option.required && option.values[0] ? [option.values[0]] : []]));
const priceFor = (item: Item, selected: Record<string, string[]>) => (item.options || []).reduce((price, option) => price + (selected[option.name] || []).reduce((sum, value) => sum + Number(option.prices?.[value] || 0), 0), Number(item.price || 0));

export default function FavoritesManager({ placeSlug, blocks = [], currency = '', enableCart = false }: Props) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [configuring, setConfiguring] = useState<Item | null>(null);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const persistCart = (next: CartItem[]) => { setCart(next); save(cartKey(placeSlug), next); };
  const addToCart = (item: Item, selectedOptions: Record<string, string[]> = {}) => {
    const unitPrice = priceFor(item, selectedOptions);
    const hash = Object.entries(selectedOptions).sort(([a], [b]) => a.localeCompare(b)).map(([name, values]) => `${name}:${[...values].sort().join(',')}`).join('|');
    const lineId = `${item.id}-${hash}`;
    setCart(current => { const exists = current.find(entry => entry.lineId === lineId); const next = exists ? current.map(entry => entry.lineId === lineId ? { ...entry, quantity: entry.quantity + 1 } : entry) : [...current, { ...item, lineId, quantity: 1, selectedOptions, unitPrice }]; save(cartKey(placeSlug), next); return next; });
  };
  const openItem = (item: Item) => item.options?.length ? (setSelected(defaults(item)), setConfiguring(item)) : addToCart(item);
  const toggleFavorite = (item: Pick<Item, 'id' | 'name'>) => setFavorites(current => { const next = current.some(favorite => favorite.id === item.id) ? current.filter(favorite => favorite.id !== item.id) : [...current, { ...item, slug: placeSlug }]; save(favoritesKey(placeSlug), next); return next; });

  useEffect(() => {
    setFavorites(storage<Favorite>(favoritesKey(placeSlug)));
    setCart(storage<CartItem>(cartKey(placeSlug)));
    const favorite = (event: Event) => toggleFavorite(JSON.parse((event.currentTarget as HTMLElement).dataset.item || '{}'));
    const add = (event: Event) => { const item = JSON.parse((event.currentTarget as HTMLElement).dataset.item || '{}') as Item; if (item.id) openItem(item); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setShowFavorites(false); setShowCart(false); setConfiguring(null); } };
    const favorites = document.querySelectorAll('.favorite-btn'); const addButtons = document.querySelectorAll('.cart-add-btn');
    favorites.forEach(button => button.addEventListener('click', favorite)); if (enableCart) addButtons.forEach(button => button.addEventListener('click', add)); document.addEventListener('keydown', escape);
    return () => { favorites.forEach(button => button.removeEventListener('click', favorite)); addButtons.forEach(button => button.removeEventListener('click', add)); document.removeEventListener('keydown', escape); };
  }, [enableCart, placeSlug]);

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [cart]);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const changeQuantity = (lineId: string, amount: number) => persistCart(cart.map(item => item.lineId === lineId ? { ...item, quantity: item.quantity + amount } : item).filter(item => item.quantity > 0));
  const toggleValue = (option: Option, value: string) => setSelected(current => { const values = current[option.name] || []; const multiple = (option.max_choices || 1) > 1; const next = multiple ? values.includes(value) ? values.filter(entry => entry !== value) : values.length < (option.max_choices || 1) ? [...values, value] : values : [value]; return { ...current, [option.name]: next }; });
  const itemFor = (favorite: Favorite) => blocks.filter(block => block.type === 'section').flatMap(block => block.data?.items || []).find((item: Item) => item.id === favorite.id) as Item | undefined;

  return <>
    {favorites.length > 0 && <div className="fixed bottom-[72px] right-6 z-40"><button onClick={() => setShowFavorites(true)} className="relative rounded-full bg-neutral-500 p-3 text-white" aria-label="Ver favoritos"><Heart className="h-5 w-5" fill="currentColor" /><span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-neutral-600">{favorites.length}</span></button></div>}
    {enableCart && <div className="fixed bottom-6 right-6 z-40"><button onClick={() => setShowCart(true)} className="relative rounded-full bg-[var(--m-accent)] p-4 text-[var(--m-on-accent)] shadow-lg" aria-label="Mostrar carrito"><ShoppingCart className="h-5 w-5" />{count > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-neutral-900">{count}</span>}</button></div>}
    {showFavorites && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={event => event.target === event.currentTarget && setShowFavorites(false)}><div className="max-h-[80dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Favoritos</h2><button onClick={() => setShowFavorites(false)} aria-label="Cerrar favoritos"><X /></button></div><div className="mt-5 space-y-3">{favorites.map(favorite => { const item = itemFor(favorite); return <div key={favorite.id} className="flex items-center justify-between rounded-lg bg-neutral-50 p-3"><div><p className="font-medium">{favorite.name}</p>{item && <p className="text-sm text-neutral-500">{formatMoney(item.price, currency)}</p>}</div><button disabled={!item} onClick={() => item && openItem(item)} className="rounded-lg bg-[var(--m-accent)] px-3 py-1.5 text-sm font-semibold text-[var(--m-on-accent)] disabled:opacity-50">Agregar</button></div>; })}</div></div></div>}
    {configuring && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={event => event.target === event.currentTarget && setConfiguring(null)}><div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl"><div className="flex justify-between gap-4"><div><h2 className="text-xl font-bold">{configuring.name}</h2><p className="text-sm text-neutral-500">Personaliza tu producto</p></div><button onClick={() => setConfiguring(null)} aria-label="Cerrar producto"><X /></button></div><div className="mt-6 space-y-6">{(configuring.options || []).map(option => <div key={option.name}><div className="mb-2 flex justify-between"><h3 className="font-semibold">{option.name}</h3>{option.required && <span className="text-xs text-red-600">Obligatorio</span>}</div><div className="space-y-2">{option.values.map(value => { const isSelected = (selected[option.name] || []).includes(value); const extra = Number(option.prices?.[value] || 0); return <label key={value} className="flex cursor-pointer items-center justify-between rounded-xl border border-neutral-200 p-3 has-[:checked]:border-[var(--m-accent)]"><span className="flex gap-3"><input type={(option.max_choices || 1) > 1 ? 'checkbox' : 'radio'} name={option.name} checked={isSelected} onChange={() => toggleValue(option, value)} />{value}</span>{extra !== 0 && <span className="text-sm text-neutral-600">+{formatMoney(extra, currency)}</span>}</label>; })}</div></div>)}</div><div className="mt-8 flex justify-between border-t pt-5"><span className="text-lg font-bold">{formatMoney(priceFor(configuring, selected), currency)}</span><button disabled={(configuring.options || []).some(option => option.required && !(selected[option.name] || []).length)} onClick={() => { addToCart(configuring, selected); setConfiguring(null); setShowCart(true); }} className="rounded-xl bg-[var(--m-accent)] px-5 py-3 font-bold text-[var(--m-on-accent)] disabled:opacity-50">Agregar al carrito</button></div></div></div>}
    {showCart && <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={event => event.target === event.currentTarget && setShowCart(false)}><aside className="flex h-full w-full max-w-md flex-col bg-white"><div className="flex items-center justify-between border-b p-6"><h2 className="text-xl font-bold">Tu carrito</h2><button onClick={() => setShowCart(false)} aria-label="Cerrar carrito"><X /></button></div><div className="flex-1 space-y-4 overflow-y-auto p-6">{cart.length === 0 ? <p className="py-10 text-center text-neutral-500">Tu carrito está vacío.</p> : cart.map(item => <div key={item.lineId} className="border-b pb-4"><div className="flex justify-between gap-3"><div><p className="font-semibold">{item.name}</p>{Object.entries(item.selectedOptions).filter(([, values]) => values.length).map(([name, values]) => <p key={name} className="text-xs text-neutral-500">{name}: {values.join(', ')}</p>)}</div><button onClick={() => persistCart(cart.filter(entry => entry.lineId !== item.lineId))} aria-label={`Eliminar ${item.name}`}><Trash2 className="h-4 w-4 text-neutral-400" /></button></div><div className="mt-3 flex justify-between"><div className="flex items-center gap-3"><button onClick={() => changeQuantity(item.lineId, -1)} aria-label="Restar"><Minus className="h-4 w-4" /></button><span>{item.quantity}</span><button onClick={() => changeQuantity(item.lineId, 1)} aria-label="Sumar"><Plus className="h-4 w-4" /></button></div><span className="font-semibold">{formatMoney(item.unitPrice * item.quantity, currency)}</span></div></div>)}</div>{cart.length > 0 && <div className="flex justify-between border-t p-6 text-lg font-bold"><span>Total</span><span>{formatMoney(total, currency)}</span></div>}</aside></div>}
  </>;
}
