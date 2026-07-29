import { useState, useEffect } from 'react';
import { Heart, X, ShoppingCart } from 'lucide-react';

interface Favorite {
  id: string;
  name: string;
  slug: string;
}

interface FavoritesManagerProps {
  placeSlug: string;
  blocks?: any[];
}

const getFavoritesKey = (slug: string) => `favorites_${slug}`;
const getCartKey = (slug: string) => `cart_${slug}`;

function getFavorites(slug: string): Favorite[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(getFavoritesKey(slug));
  return stored ? JSON.parse(stored) : [];
}

function saveFavorites(slug: string, favorites: Favorite[]) {
  localStorage.setItem(getFavoritesKey(slug), JSON.stringify(favorites));
}

function getCart(slug: string): any[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(getCartKey(slug));
  return stored ? JSON.parse(stored) : [];
}

function saveCart(slug: string, cart: any[]) {
  localStorage.setItem(getCartKey(slug), JSON.stringify(cart));
}

export default function FavoritesManager({ placeSlug, blocks = [] }: FavoritesManagerProps) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);

  useEffect(() => {
    setFavorites(getFavorites(placeSlug));

    const handleToggleFavorite = (e: any) => {
      const button = e.currentTarget;
      const itemData = JSON.parse(button.dataset.item);
      toggleFavorite(itemData);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowFavorites(false);
      }
    };

    const favButtons = document.querySelectorAll(".favorite-btn");
    favButtons.forEach((btn) =>
      btn.addEventListener("click", handleToggleFavorite),
    );

    document.addEventListener("keydown", handleEscape);

    return () => {
      favButtons.forEach((btn) =>
        btn.removeEventListener("click", handleToggleFavorite),
      );
      document.removeEventListener("keydown", handleEscape);
    };
  }, [placeSlug]);

  useEffect(() => {
    // Actualizar visual de favoritos en botones externos
    document.querySelectorAll(".favorite-btn").forEach((btn) => {
      const itemData = JSON.parse((btn as HTMLElement).dataset.item || "{}");
      const isFav = favorites.some((f) => f.id === itemData.id);
      const svg = btn.querySelector("svg");
      if (svg) {
        if (isFav) {
          svg.setAttribute("fill", "currentColor");
          svg.classList.add("text-red-500");
          svg.classList.remove("text-neutral-400");
        } else {
          svg.setAttribute("fill", "none");
          svg.classList.remove("text-red-500");
          svg.classList.add("text-neutral-400");
        }
      }
    });
  }, [favorites]);

  const toggleFavorite = (item: { id: string; name: string }) => {
    setFavorites((prevFavorites) => {
      const newFavorites = [...prevFavorites];
      const index = newFavorites.findIndex((f) => f.id === item.id);

      if (index > -1) {
        newFavorites.splice(index, 1);
      } else {
        newFavorites.push({ id: item.id, name: item.name, slug: placeSlug });
      }

      saveFavorites(placeSlug, newFavorites);
      return newFavorites;
    });
  };

  const addToCart = (item: { id: string; name: string; price: number; image?: string }) => {
    const cart = getCart(placeSlug);
    const existing = cart.find((i: any) => i.id === item.id);

    if (existing) {
      existing.quantity++;
    } else {
      cart.push({ ...item, quantity: 1, notes: "" });
    }

    saveCart(placeSlug, cart);

    // Trigger cart update event for CartManager
    window.dispatchEvent(new CustomEvent('cart-updated'));
  };

  return (
    <>
      {favorites.length > 0 && (
        <div className="fixed bottom-[72px] right-6 z-40">
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className="relative bg-neutral-500 hover:bg-neutral-600 text-white p-3 rounded-full  transition-all hover:scale-105"
          >
            <Heart className="w-5 h-5" fill="currentColor" />
            <span className="absolute -top-1 -right-1 bg-white text-neutral-600 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
              {favorites.length}
            </span>
          </button>
        </div>
      )}

      {showFavorites && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowFavorites(false);
          }}
        >
          <div className="bg-white rounded-2xl w-full sm:max-w-md max-h-[80dvh] flex flex-col">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className="w-6 h-6 text-neutral-500" fill="currentColor" />
                <h2 className="text-xl font-bold">Favoritos</h2>
              </div>
              <button onClick={() => setShowFavorites(false)}>
                <X className="w-6 h-6 text-neutral-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {favorites.length === 0 ? (
                <p className="text-center text-neutral-400 py-8">
                  No tienes favoritos
                </p>
              ) : (
                <div className="space-y-3">
                  {favorites.map((fav) => {
                    // Find the item in blocks to get price and image
                    let itemData: any = null;
                    for (const block of blocks) {
                      if (block.type === 'section' && block.data.items) {
                        const found = block.data.items.find((item: any) => item.id === fav.id);
                        if (found) {
                          itemData = found;
                          break;
                        }
                      }
                    }

                    return (
                      <div
                        key={fav.id}
                        className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg gap-3"
                      >
                        <div className="flex-1">
                          <span className="font-medium block">{fav.name}</span>
                          {itemData?.price && (
                            <span className="text-sm text-neutral-600">${itemData.price}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {itemData && (
                            <button
                              onClick={() => {
                                addToCart({
                                  id: fav.id,
                                  name: fav.name,
                                  price: itemData.price || 0,
                                  image: itemData.image,
                                });
                              }}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold flex items-center gap-1.5"
                            >
                              <ShoppingCart className="w-4 h-4" />
                              Agregar
                            </button>
                          )}
                          <button
                            onClick={() => toggleFavorite(fav)}
                            className="text-neutral-500 hover:text-neutral-600"
                          >
                            <Heart className="w-5 h-5" fill="currentColor" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
