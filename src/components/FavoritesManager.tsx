import { useEffect, useState } from 'react';
import { Heart, X } from 'lucide-react';

type Favorite = { id: string; name: string; slug: string };

interface Props { placeSlug: string }
const storage = <T,>(key: string): T[] => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
const save = <T,>(key: string, value: T[]) => localStorage.setItem(key, JSON.stringify(value));
const favoritesKey = (slug: string) => `favorites_${slug}`;

export default function FavoritesManager({ placeSlug }: Props) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const toggleFavorite = (item: Pick<Favorite, 'id' | 'name'>) => setFavorites(current => { const next = current.some(favorite => favorite.id === item.id) ? current.filter(favorite => favorite.id !== item.id) : [...current, { ...item, slug: placeSlug }]; save(favoritesKey(placeSlug), next); return next; });

  useEffect(() => {
    setFavorites(storage<Favorite>(favoritesKey(placeSlug)));
    const favorite = (event: Event) => toggleFavorite(JSON.parse((event.currentTarget as HTMLElement).dataset.item || '{}'));
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setShowFavorites(false); };
    const favoriteButtons = document.querySelectorAll('.favorite-btn');
    favoriteButtons.forEach(button => button.addEventListener('click', favorite)); document.addEventListener('keydown', escape);
    return () => { favoriteButtons.forEach(button => button.removeEventListener('click', favorite)); document.removeEventListener('keydown', escape); };
  }, [placeSlug]);

  return <>
    {favorites.length > 0 && <div className="fixed bottom-[72px] right-6 z-40"><button onClick={() => setShowFavorites(true)} className="relative rounded-full bg-neutral-500 p-3 text-white" aria-label="Ver favoritos"><Heart className="h-5 w-5" fill="currentColor" /><span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-neutral-600">{favorites.length}</span></button></div>}
    {showFavorites && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={event => event.target === event.currentTarget && setShowFavorites(false)}><div className="max-h-[80dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Favoritos</h2><button onClick={() => setShowFavorites(false)} aria-label="Cerrar favoritos"><X /></button></div><div className="mt-5 space-y-3">{favorites.map(favorite => <div key={favorite.id} className="flex items-center justify-between rounded-lg bg-neutral-50 p-3"><p className="font-medium">{favorite.name}</p></div>)}</div></div></div>}
  </>;
}
