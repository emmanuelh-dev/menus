import { useState, useEffect } from 'react';
import { ShoppingCart, Heart, X, Trash2, Send, MapPin, User, Phone, Search, Truck } from 'lucide-react';
import GooglePlacesAutocomplete from './admin/GooglePlacesAutocomplete';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  notes?: string;
}

interface Favorite {
  id: string;
  name: string;
  slug: string;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  default_address?: string;
  default_colony?: string;
}

interface ShippingZone {
  id: number;
  name: string;
  price: number;
}

interface CartManagerProps {
  placeName: string;
  placeSlug: string;
  whatsappNumber: string;
  blocks: any[];
  placeId: number;
  deliveryEnabled?: boolean;
}

const getCartKey = (slug: string) => `cart_${slug}`;
const getFavoritesKey = (slug: string) => `favorites_${slug}`;
const getCustomerIdKey = () => 'customer_id';

function getCart(slug: string): CartItem[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(getCartKey(slug));
  return stored ? JSON.parse(stored) : [];
}

function saveCart(slug: string, cart: CartItem[]) {
  localStorage.setItem(getCartKey(slug), JSON.stringify(cart));
}

function getFavorites(slug: string): Favorite[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(getFavoritesKey(slug));
  return stored ? JSON.parse(stored) : [];
}

function saveFavorites(slug: string, favorites: Favorite[]) {
  localStorage.setItem(getFavoritesKey(slug), JSON.stringify(favorites));
}

export default function CartManager({
  placeName,
  placeSlug,
  whatsappNumber,
  blocks,
  placeId,
  deliveryEnabled = false,
}: CartManagerProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryStreet, setDeliveryStreet] = useState('');
  const [deliveryColony, setDeliveryColony] = useState<string>('');
  const [deliveryMunicipality, setDeliveryMunicipality] = useState<string>('');
  const [deliveryState, setDeliveryState] = useState<string>('');
  const [deliveryLat, setDeliveryLat] = useState<number | undefined>();
  const [deliveryLng, setDeliveryLng] = useState<number | undefined>();
  const [availableColonies, setAvailableColonies] = useState<Array<{ colony: string, zoneName: string, price: number }>>([]);
  const [shippingZone, setShippingZone] = useState<ShippingZone | null>(null);
  const [wantsDelivery, setWantsDelivery] = useState(false);
  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);

  useEffect(() => {
    setCart(getCart(placeSlug));
    setFavorites(getFavorites(placeSlug));
    loadCustomer();
    loadAvailableColonies();

    const handleAddToCart = (e: any) => {
      const button = e.currentTarget;
      const itemData = JSON.parse(button.dataset.item);
      addToCart(itemData);
    };

    const handleToggleFavorite = (e: any) => {
      const button = e.currentTarget;
      const itemData = JSON.parse(button.dataset.item);
      toggleFavorite(itemData);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowCart(false);
        setShowFavorites(false);
        setShowCheckout(false);
      }
    };

    const addButtons = document.querySelectorAll(".cart-add-btn");
    const favButtons = document.querySelectorAll(".favorite-btn");

    addButtons.forEach((btn) => btn.addEventListener("click", handleAddToCart));
    favButtons.forEach((btn) =>
      btn.addEventListener("click", handleToggleFavorite),
    );

    document.addEventListener("keydown", handleEscape);

    return () => {
      addButtons.forEach((btn) =>
        btn.removeEventListener("click", handleAddToCart),
      );
      favButtons.forEach((btn) =>
        btn.removeEventListener("click", handleToggleFavorite),
      );
      document.removeEventListener("keydown", handleEscape);
    };
  }, [placeSlug]);

  useEffect(() => {
    if (deliveryColony && wantsDelivery) {
      updateShippingPrice();
    }
  }, [deliveryColony, wantsDelivery]);

  const loadCustomer = async () => {
    const customerId = localStorage.getItem(getCustomerIdKey());
    if (customerId) {
      try {
        const response = await fetch(`/api/customers/${customerId}`);
        if (response.ok) {
          const data = await response.json();
          setCustomer(data.customer);
          setCustomerName(data.customer.name);
          setCustomerPhone(data.customer.phone);
          if (data.customer.default_address) {
            setDeliveryStreet(data.customer.default_address);
            setDeliveryColony(data.customer.default_colony || '');
            setDeliveryMunicipality(data.customer.default_municipality || '');
            setDeliveryState(data.customer.default_state || '');
          }
        }
      } catch (error) {
        console.error('Error loading customer:', error);
      }
    }
    setLoadingCustomer(false);
  };

  const loadAvailableColonies = async () => {
    try {
      const response = await fetch(`/api/shipping-zones?place_id=${placeId}`);
      const data = await response.json();

      const coloniesMap: Array<{ colony: string, zoneName: string, price: number }> = [];

      data.zones?.forEach((zone: any) => {
        if (zone.is_active && zone.colonies) {
          zone.colonies.forEach((colony: string) => {
            coloniesMap.push({
              colony,
              zoneName: zone.name,
              price: zone.price
            });
          });
        }
      });

      setAvailableColonies(coloniesMap);
    } catch (error) {
      console.error('Error loading colonies:', error);
    }
  };

  const updateShippingPrice = () => {
    const selected = availableColonies.find(c => c.colony === deliveryColony);
    if (selected) {
      setShippingZone({
        id: 0,
        name: selected.zoneName,
        price: selected.price
      });
    } else {
      setShippingZone(null);
    }
  };

  const saveOrUpdateCustomer = async () => {
    if (!customerName || !customerPhone) return null;

    try {
      const fullAddress = wantsDelivery ? `${deliveryStreet}, ${deliveryColony}` : '';
      const customerData = {
        name: customerName,
        phone: customerPhone,
        default_address: fullAddress,
        default_colony: deliveryColony
      };

      const response = await fetch('/api/customers', {
        method: customer ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer ? { ...customerData, id: customer.id } : customerData)
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem(getCustomerIdKey(), data.customer.id.toString());
        setCustomer(data.customer);
        return data.customer.id;
      }
    } catch (error) {
      console.error('Error saving customer:', error);
    }
    return null;
  };

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
          svg.classList.remove("text-stone-400");
        } else {
          svg.setAttribute("fill", "none");
          svg.classList.remove("text-red-500");
          svg.classList.add("text-stone-400");
        }
      }
    });
  }, [favorites]);

  const addToCart = (item: {
    id: string;
    name: string;
    price: number;
    image?: string;
  }) => {
    setCart((prevCart) => {
      const newCart = [...prevCart];
      const existing = newCart.find((i) => i.id === item.id);

      if (existing) {
        existing.quantity++;
      } else {
        newCart.push({ ...item, quantity: 1, notes: "" });
      }

      saveCart(placeSlug, newCart);
      return newCart;
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prevCart) => {
      const newCart = prevCart.filter((i) => i.id !== itemId);
      saveCart(placeSlug, newCart);
      return newCart;
    });
  };

  const updateQuantity = (itemId: string, change: number) => {
    setCart((prevCart) => {
      const newCart = prevCart
        .map((item) => {
          if (item.id === itemId) {
            const newQty = Math.max(0, item.quantity + change);
            return newQty === 0 ? null : { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];

      saveCart(placeSlug, newCart);
      return newCart;
    });
  };

  const updateNotes = (itemId: string, notes: string) => {
    setCart((prevCart) => {
      const newCart = prevCart.map((item) => {
        if (item.id === itemId) {
          return { ...item, notes };
        }
        return item;
      });
      saveCart(placeSlug, newCart);
      return newCart;
    });
  };

  const toggleFavorite = (item: { id: string; name: string; slug: string }) => {
    setFavorites((prevFavs) => {
      const newFavorites = [...prevFavs];
      const index = newFavorites.findIndex((f) => f.id === item.id);

      if (index > -1) {
        newFavorites.splice(index, 1);
      } else {
        newFavorites.push(item);
      }

      saveFavorites(placeSlug, newFavorites);
      return newFavorites;
    });
  };

  const clearCart = () => {
    setCart([]);
    saveCart(placeSlug, []);
    setShowCart(false);
  };

  const proceedToCheckout = () => {
    setShowCart(false);
    setShowCheckout(true);
  };

  const createOrder = async () => {
    if (cart.length === 0) return null;
    if (!customerName || !customerPhone) {
      alert('Por favor completa tu nombre y teléfono');
      return null;
    }
    if (wantsDelivery && deliveryEnabled && (!deliveryColony || !deliveryStreet)) {
      alert('Por favor completa tu colonia y calle');
      return null;
    }
    if (wantsDelivery && deliveryEnabled && !shippingZone) {
      alert('Por favor selecciona una colonia válida para ver el costo de envío');
      return null;
    }

    setCreatingOrder(true);

    try {
      const customerId = await saveOrUpdateCustomer();

      const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const deliveryPrice = wantsDelivery && shippingZone ? shippingZone.price : 0;
      const total = subtotal + deliveryPrice;
      const fullAddress = wantsDelivery ? `${deliveryStreet}, ${deliveryColony}` : '';

      const orderData = {
        place_id: Number(placeId),
        customer_id: customerId,
        customer_name: customerName,
        customer_phone: customerPhone,
        delivery_address: fullAddress,
        delivery_lat: deliveryLat,
        delivery_lng: deliveryLng,
        delivery_colony: wantsDelivery ? deliveryColony : '',
        shipping_zone_id: shippingZone?.id || null,
        delivery_price: deliveryPrice,
        items: cart, // Supabase handles jsonb
        subtotal,
        total,
        notes: cart.map(i => i.notes).filter(Boolean).join('. '),
        status: 'pending'
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        const data = await response.json();
        return data.order;
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error al crear el pedido. Intenta de nuevo.');
    } finally {
      setCreatingOrder(false);
    }

    return null;
  };

  const sendToWhatsApp = async () => {
    const order = await createOrder();
    if (!order) return;

    let cleanNumber = whatsappNumber.replace(/\D/g, "");
    if (cleanNumber.length === 10) cleanNumber = `52${cleanNumber}`;

    if (!cleanNumber || cleanNumber.length < 10) {
      alert("Error: Número de WhatsApp inválido.");
      return;
    }

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryPrice = wantsDelivery && shippingZone ? shippingZone.price : 0;
    const total = subtotal + deliveryPrice;

    // Estructura del Mensaje
    // Iconos en formato Unicode para evitar errores de visualización
    const icons = {
      order: '\uD83D\uDCC4',   // 📄
      customer: '\uD83D\uDC64',// 👤
      pin: '\uD83D\uDCCD',     // 📍
      list: '\uD83D\uDCCB',    // 📋
      money: '\uD83D\uDCB5',   // 💵
      check: '\u2705'          // ✅
    };

    let message = `${icons.order} *ORDEN #${order.id}*\n`;
    message += `--------------------------\n`;
    message += `${icons.customer} *CLIENTE*\n`;
    message += `• *Nombre:* ${customerName}\n`;
    message += `• *Teléfono:* ${customerPhone}\n\n`;

    message += `${icons.pin} *ENTREGA*\n`;
    if (wantsDelivery) {
      message += `• *Tipo:* Envío a domicilio\n`;
      message += `• *Dirección:* ${deliveryStreet}\n`;
      message += `• *Colonia:* ${deliveryColony}\n`;
    } else {
      message += `• *Tipo:* Recoger en sucursal\n`;
    }

    message += `\n${icons.list} *DETALLE DEL PEDIDO*\n`;
    cart.forEach((item) => {
      message += `• ${item.quantity}x ${item.name} - $${item.price * item.quantity}\n`;
      if (item.notes) message += `  _Nota: ${item.notes}_\n`;
    });

    message += `\n--------------------------\n`;
    message += `${icons.money} *RESUMEN DE PAGO*\n`;
    message += `• *Subtotal:* $${subtotal}\n`;
    if (wantsDelivery) message += `• *Envío:* $${deliveryPrice}\n`;
    message += `*TOTAL A PAGAR: $${total}*\n`;
    message += `--------------------------\n`;

    try {
      const order = await createOrder();
      if (!order) return;

      const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

      // En lugar de window.open, usamos location.href
      // Esto evita el bloqueo de popups en móviles y escritorio
      window.location.href = url;

      clearCart();
      setShowCheckout(false);
    } catch (error) {
      console.error("Error al procesar:", error);
    }
    clearCart();
    setShowCheckout(false);
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return (
    <div className="cart-manager-container">
      <div className="fixed bottom-6 right-6 z-40">
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
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowFavorites(false);
          }}
        >
          <div className="bg-white rounded-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col">
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
                <p className="text-center text-gray-400 py-8">
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
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg gap-3"
                      >
                        <div className="flex-1">
                          <span className="font-medium block">{fav.name}</span>
                          {itemData?.price && (
                            <span className="text-sm text-gray-600">${itemData.price}</span>
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
                            className="text-pink-500 hover:text-pink-600"
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

      {showCart && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCart(false);
          }}
        >
          <div className="bg-white rounded-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col">
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
                <p className="text-center text-gray-400 py-8">
                  Tu carrito está vacío
                </p>
              ) : (
                <div className="space-y-6">
                  {cart.map((item) => (
                    <div key={item.id} className="space-y-3">
                      <div className="flex gap-4 items-start">
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
                            <span className="font-medium w-8 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            ${item.price * item.quantity}
                          </p>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-500 hover:text-red-600 mt-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Instrucciones especiales (ej: sin cebolla)"
                          value={item.notes}
                          onChange={(e) =>
                            updateNotes(item.id, e.target.value)
                          }
                          className="w-full text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 outline-none focus:border-red-200 focus:bg-white transition-all"
                        />
                      </div>
                      <div className="h-px bg-gray-50 w-full" />
                    </div>
                  ))}
                </div>
              )}
              <div className='mt-4'>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck size={18} className={wantsDelivery ? "text-red-500" : "text-slate-400"} />
                    <span className="text-sm font-bold text-slate-700">Envío a Domicilio</span>
                  </div>
                  <button
                    onClick={() => setWantsDelivery(!wantsDelivery)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${wantsDelivery ? 'bg-red-600' : 'bg-slate-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${wantsDelivery ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {wantsDelivery && (
                  <div className="pt-2 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    {availableColonies.length > 0 ? (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Selecciona tu Colonia</label>
                          <select
                            value={deliveryColony}
                            onChange={(e) => setDeliveryColony(e.target.value)}
                            className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            <option value="">Buscar colonia...</option>
                            {availableColonies.map((item, idx) => (
                              <option key={idx} value={item.colony}>
                                {item.colony} - ${item.price}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Calle y Número</label>
                          <GooglePlacesAutocomplete
                            value={deliveryStreet}
                            onChange={(val) => setDeliveryStreet(val)}
                            onPlaceSelected={(place) => {
                              setDeliveryStreet(place.formatted_address || place.address);
                              setDeliveryLat(place.lat);
                              setDeliveryLng(place.lng);
                              if (place.colony && !deliveryColony) {
                                // Intentar matchear automáticamente
                                const exists = availableColonies.find(c => c.colony === place.colony);
                                if (exists) setDeliveryColony(place.colony);
                              }
                            }}
                            placeholder="Ej: Av. Principal 123..."
                            className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                        <p className="text-[11px] text-amber-700 leading-tight">
                          ⚠️ Esta sucursal aún no tiene zonas de envío configuradas. Por favor, contacta al negocio directamente.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t border-gray-100 space-y-4">
                {wantsDelivery && shippingZone && (
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-red-600 shadow-sm border border-red-50">
                        <Truck size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 tracking-tight">Servicio a Domicilio</p>
                        <p className="text-[10px] text-red-600 font-bold uppercase tracking-wide">{deliveryColony}</p>
                      </div>
                    </div>
                    <span className="font-bold text-red-600">${shippingZone.price}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-lg font-bold pt-2">
                  <span>Total</span>
                  <span>${totalPrice + (wantsDelivery && shippingZone ? shippingZone.price : 0)}</span>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={clearCart}
                    className="flex-1 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium"
                  >
                    Limpiar
                  </button>
                  <button
                    onClick={proceedToCheckout}
                    className="flex-[2] py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showCheckout && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCheckout(false);
          }}
        >
          <div className="bg-white rounded-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {customer ? `Hola ${customer.name}` : 'Completa tu pedido'}
                </h2>
                <p className="text-sm text-gray-500">Revisa tu pedido y confirma</p>
              </div>
              <button onClick={() => setShowCheckout(false)}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Tu nombre completo"
                    className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="10 dígitos"
                    className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Delivery details already handled in initial cart view if availableColonies exist */}
              </div>

              <div className="border-t pt-4 space-y-2">
                <h3 className="font-bold text-sm text-gray-700 mb-3">Resumen del pedido</h3>
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.name}</span>
                    <span className="font-medium">${item.price * item.quantity}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm border-t pt-2">
                  <span>Subtotal</span>
                  <span className="font-medium">${totalPrice}</span>
                </div>
                {wantsDelivery && shippingZone && (
                  <div className="flex justify-between text-sm">
                    <span>Envío</span>
                    <span className="font-medium">${shippingZone.price}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total</span>
                  <span>${totalPrice + (wantsDelivery && shippingZone ? shippingZone.price : 0)}</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100">
              <button
                onClick={sendToWhatsApp}
                disabled={creatingOrder || (wantsDelivery && deliveryEnabled && !shippingZone)}
                className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                {creatingOrder ? 'Procesando...' : 'Enviar por WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
