import { useState, useEffect } from 'react';
import { ShoppingCart, Heart, X, Trash2, Send } from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface Favorite {
  id: string;
  name: string;
  slug: string;
}

interface CartManagerProps {
  placeName: string;
  placeSlug: string;
  whatsappNumber: string;
  blocks: any[];
}

const getCartKey = (slug: string) => `cart_${slug}`;
const getFavoritesKey = (slug: string) => `favorites_${slug}`;

function getCart(slug: string): CartItem[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(getCartKey(slug));
  return stored ? JSON.parse(stored) : [];
}

function saveCart(slug: string, cart: CartItem[]) {
  localStorage.setItem(getCartKey(slug), JSON.stringify(cart));
}

function getFavorites(slug: string): Favorite[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(getFavoritesKey(slug));
  return stored ? JSON.parse(stored) : [];
}

function saveFavorites(slug: string, favorites: Favorite[]) {
  localStorage.setItem(getFavoritesKey(slug), JSON.stringify(favorites));
}

export default function CartManager({ placeName, placeSlug, whatsappNumber, blocks }: CartManagerProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);

  useEffect(() => {
    setCart(getCart(placeSlug));
    setFavorites(getFavorites(placeSlug));

    const handleAddToCart = (e: any) => {
      const itemData = JSON.parse(e.target.dataset.item);
      addToCart(itemData);
    };

    const handleToggleFavorite = (e: any) => {
      const itemData = JSON.parse(e.target.dataset.item);
      toggleFavorite(itemData);
    };

    document.querySelectorAll('.cart-add-btn').forEach(btn => {
      btn.addEventListener('click', handleAddToCart);
    });

    document.querySelectorAll('.favorite-btn').forEach(btn => {
      btn.addEventListener('click', handleToggleFavorite);
    });

    return () => {
      document.querySelectorAll('.cart-add-btn').forEach(btn => {
        btn.removeEventListener('click', handleAddToCart);
      });
      document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.removeEventListener('click', handleToggleFavorite);
      });
    };
  }, [placeSlug]);

  useEffect(() => {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
      const itemData = JSON.parse((btn as HTMLElement).dataset.item || '{}');
      const isFav = favorites.some(f => f.id === itemData.id);
      const svg = btn.querySelector('svg');
      if (svg) {
        if (isFav) {
          svg.setAttribute('fill', 'currentColor');
          svg.classList.add('text-red-500');
          svg.classList.remove('text-stone-400');
        } else {
          svg.setAttribute('fill', 'none');
          svg.classList.remove('text-red-500');
          svg.classList.add('text-stone-400');
        }
      }
    });
  }, [favorites]);

  const addToCart = (item: { id: string; name: string; price: number; image?: string }) => {
    const newCart = [...cart];
    const existing = newCart.find(i => i.id === item.id);
    
    if (existing) {
      existing.quantity++;
    } else {
      newCart.push({ ...item, quantity: 1 });
    }
    
    setCart(newCart);
    saveCart(placeSlug, newCart);
  };

  const removeFromCart = (itemId: string) => {
    const newCart = cart.filter(i => i.id !== itemId);
    setCart(newCart);
    saveCart(placeSlug, newCart);
  };

  const updateQuantity = (itemId: string, change: number) => {
    const newCart = cart.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(0, item.quantity + change);
        return newQty === 0 ? null : { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean) as CartItem[];
    
    setCart(newCart);
    saveCart(placeSlug, newCart);
  };

  const toggleFavorite = (item: { id: string; name: string; slug: string }) => {
    const newFavorites = [...favorites];
    const index = newFavorites.findIndex(f => f.id === item.id);
    
    if (index > -1) {
      newFavorites.splice(index, 1);
    } else {
      newFavorites.push(item);
    }
    
    setFavorites(newFavorites);
    saveFavorites(placeSlug, newFavorites);
  };

  const clearCart = () => {
    setCart([]);
    saveCart(placeSlug, []);
  };

  const sendToWhatsApp = () => {
    if (cart.length === 0) return;
    
    let message = `Hola! Me gustaría hacer un pedido de *${placeName}*:\n\n`;
    
    cart.forEach(item => {
      message += `• ${item.quantity}x ${item.name} - $${item.price * item.quantity}\n`;
    });
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    message += `\n*Total: $${total}*`;
    
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <>
      <div className="fixed bottom-32 right-6 z-40 flex flex-col gap-2">
        {favorites.length > 0 && (
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className="relative bg-pink-500 hover:bg-pink-600 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105"
          >
            <Heart className="w-5 h-5" fill="currentColor" />
            <span className="absolute -top-1 -right-1 bg-white text-pink-600 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
              {favorites.length}
            </span>
          </button>
        )}
        
        <button
          onClick={() => setShowCart(!showCart)}
          className="relative bg-red-600 hover:bg-red-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105"
        >
          <ShoppingCart className="w-5 h-5" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 bg-white text-red-600 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
              {totalItems}
            </span>
          )}
        </button>
      </div>

      {showFavorites && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className="w-6 h-6 text-pink-500" fill="currentColor" />
                <h2 className="text-xl font-bold">Favoritos</h2>
              </div>
              <button onClick={() => setShowFavorites(false)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {favorites.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No tienes favoritos</p>
              ) : (
                <div className="space-y-3">
                  {favorites.map(fav => (
                    <div key={fav.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">{fav.name}</span>
                      <button
                        onClick={() => toggleFavorite(fav)}
                        className="text-pink-500 hover:text-pink-600"
                      >
                        <Heart className="w-5 h-5" fill="currentColor" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-6 h-6 text-red-600" />
                <h2 className="text-xl font-bold">Tu Pedido</h2>
              </div>
              <button onClick={() => setShowCart(false)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Tu carrito está vacío</p>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex gap-4 items-start">
                      {item.image && (
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{item.name}</h3>
                        <p className="text-sm text-gray-500">${item.price}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
                          >
                            -
                          </button>
                          <span className="font-medium w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${item.price * item.quantity}</p>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 hover:text-red-600 mt-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t border-gray-100 space-y-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span>${totalPrice}</span>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={clearCart}
                    className="flex-1 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium"
                  >
                    Limpiar
                  </button>
                  <button
                    onClick={sendToWhatsApp}
                    className="flex-[2] py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    Enviar por WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
