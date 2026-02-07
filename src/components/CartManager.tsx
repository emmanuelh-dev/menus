import { useState, useEffect } from 'react';
import { ShoppingCart, Heart, X, Trash2, Send, MapPin, User, Phone, Search, Truck, CreditCard, Coins, Landmark, Copy, Check } from 'lucide-react';
import GooglePlacesAutocomplete from './admin/GooglePlacesAutocomplete';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  notes?: string;
  selectedOptions?: { [key: string]: string };
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
  clabe?: string;
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
  clabe,
}: CartManagerProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [activeTab, setActiveTab] = useState<'cart' | 'checkout'>('cart');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
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
  const [copied, setCopied] = useState(false);
  const [configuringItem, setConfiguringItem] = useState<any | null>(null);
  const [tempOptions, setTempOptions] = useState<{ [key: string]: string }>({});
  const [tempCounts, setTempCounts] = useState<{ [value: string]: number }>({});
  const [tempQuantity, setTempQuantity] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);

  // Helper to detect package size from name or description
  const detectLimit = (item: any) => {
    const text = `${item.name} ${item.description}`.toLowerCase();
    const match = text.match(/(?:paquete|combo|pqt|ord[en]+|pzs|piezas|ítems)\s*(?:de|:)?\s*(\d+)/i) ||
      text.match(/(\d+)\s*(?:piezas|pzs|pazas|ítems|items|pzas)/i);
    return match ? parseInt(match[1]) : null;
  };

  // Helper to generate a key for a specific combination of prefix options
  const getCombinationKey = (prefixOptions: { [key: string]: string }, flavor: string) => {
    return JSON.stringify(prefixOptions) + '|||' + flavor;
  };

  // Helper to parse flavor and options from a combination key
  const parseCombinationKey = (key: string) => {
    const [optsJson, flavor] = key.split('|||');
    try {
      return { options: JSON.parse(optsJson) as { [key: string]: string }, flavor };
    } catch (e) {
      return { options: {} as { [key: string]: string }, flavor };
    }
  };

  useEffect(() => {
    setCart(getCart(placeSlug));
    setFavorites(getFavorites(placeSlug));
    loadCustomer();
    loadAvailableColonies();

    const handleAddToCart = (e: any) => {
      const button = e.currentTarget;
      const itemData = JSON.parse(button.dataset.item);

      if (itemData.options && itemData.options.length >= 1) {
        // Multi-counter mode with prefix options
        const initialOpts: any = {};
        // All groups except the last one are prefix selectors
        itemData.options.slice(0, -1).forEach((opt: any) => {
          if (opt.values?.length > 0) initialOpts[opt.name] = opt.values[0];
        });

        setTempOptions(initialOpts);
        setTempCounts({}); // Reset counts for new item
        setConfiguringItem(itemData);
      } else {
        addToCart(itemData);
      }
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
          if (data.customer.name) localStorage.setItem('customer_name', data.customer.name);
          if (data.customer.phone) localStorage.setItem('customer_phone', data.customer.phone);
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
        if (data.customer.name) localStorage.setItem('customer_name', data.customer.name);
        if (data.customer.phone) localStorage.setItem('customer_phone', data.customer.phone);
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

  const addToCart = (item: any, options?: { [key: string]: string }, quantity = 1, customPrice?: number) => {
    setCart((prevCart) => {
      const newCart = [...prevCart];
      const optionHash = options ? JSON.stringify(options) : '';
      const uniqueId = `${item.id}-${optionHash}`;

      const existing = newCart.find((i) => i.id === uniqueId);
      if (existing) {
        existing.quantity += (quantity || 1);
      } else {
        newCart.push({
          id: uniqueId,
          productId: item.id,
          name: item.name,
          price: customPrice !== undefined ? customPrice : item.price,
          image: item.image,
          quantity: quantity || 1,
          notes: "",
          selectedOptions: options
        });
      }

      saveCart(placeSlug, newCart);
      return newCart;
    });

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);

    // We don't necessarily close the modal here if called from a multi-add loop
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
        payment_method: paymentMethod,
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
      card: '\uD83D\uDCB3',    // 💳
      bank: '\uD83C\uDFE6',    // 🏦
      check: '\u2705'          // ✅
    };

    let message = `${icons.order} *ORDEN #${order.id}*\n`;
    message += `--------------------------\n`;
    message += `${icons.customer} *CLIENTE*\n`;
    message += `• *Nombre:* ${customerName}\n`;
    message += `• *Teléfono:* ${customerPhone}\n\n`;

    message += `${icons.pin} *¿Es pedido a domicilio?*\n`;
    if (wantsDelivery) {
      message += `• *Tipo:* Envío a domicilio\n`;
      message += `• *Dirección:* ${deliveryStreet}\n`;
      message += `• *Colonia:* ${deliveryColony}\n`;
    } else {
      message += `• *Tipo:* Recoger en sucursal\n`;
    }

    message += `\n${icons.list} *DETALLE DEL PEDIDO*\n`;
    cart.forEach((item) => {
      let itemName = item.name;
      if (item.selectedOptions) {
        const optValues = Object.entries(item.selectedOptions)
          .map(([key, val]) => `${val}`)
          .join(', ');
        itemName += ` (${optValues})`;
      }
      message += `• ${item.quantity}x ${itemName} - $${item.price * item.quantity}\n`;
      if (item.notes) message += `  _Nota: ${item.notes}_\n`;
    });

    message += `\n--------------------------\n`;
    message += `${icons.money} *RESUMEN DE PAGO*\n`;
    message += `• *Subtotal:* $${subtotal}\n`;
    if (wantsDelivery) message += `• *Envío:* $${deliveryPrice}\n`;
    message += `*TOTAL A PAGAR: $${total}*\n`;
    const paymentLabel = paymentMethod === 'cash' ? 'Efectivo ' + icons.money :
      paymentMethod === 'card' ? 'Tarjeta ' + icons.card :
        'Transferencia ' + icons.bank;
    message += `• *Método de Pago:* ${paymentLabel}\n`;
    message += `--------------------------\n`;

    try {
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
          className="relative bg-red-600 hover:bg-red-700 text-white p-3 rounded-full  transition-all hover:scale-105"
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
          <div className="bg-white rounded-2xl w-full sm:max-w-md max-h-[80dvh] flex flex-col">
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
          <div className="bg-white rounded-2xl w-full sm:max-w-md max-h-[90dvh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold leading-none">Mi Pedido</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-wider">
                    {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCart(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex bg-gray-50 border-b border-gray-100 p-1 m-4 rounded-xl">
              <button
                onClick={() => setActiveTab('cart')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'cart' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <ShoppingCart size={14} />
                Pedido
              </button>
              <button
                onClick={() => setActiveTab('checkout')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'checkout' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Truck size={14} />
                Información de envío
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6">
              {activeTab === 'cart' ? (
                <div className="py-2">
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
                                className="w-16 h-16 object-cover rounded-lg shadow-sm"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-sm truncate">{item.name}</h3>
                              {item.selectedOptions && (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {Object.entries(item.selectedOptions).map(([key, val]) => (
                                    <span key={key} className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase">
                                      {val}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <p className="text-xs font-bold text-emerald-600 mt-1">${item.price}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <button
                                  onClick={() => updateQuantity(item.id, -1)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors font-bold"
                                >
                                  -
                                </button>
                                <span className="font-bold text-sm w-4 text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.id, 1)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-sm text-gray-800">
                                ${item.price * item.quantity}
                              </p>
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="text-gray-300 hover:text-red-500 mt-2 transition-colors"
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
                </div>
              ) : (
                <div className="py-2 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mis Datos</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Nombre Completo</label>
                        <div className="relative">
                          <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Ej: Juan Pérez"
                            className="w-full pl-10 pr-4 py-3 text-sm bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-red-500 transition-all outline-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Teléfono (WhatsApp)</label>
                        <div className="relative">
                          <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="10 dígitos"
                            className="w-full pl-10 pr-4 py-3 text-sm bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-red-500 transition-all outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Método de Pago</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setPaymentMethod('cash')}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all group ${paymentMethod === 'cash' ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 transition-all ${paymentMethod === 'cash' ? 'bg-red-500 text-white' : 'bg-white text-gray-400'}`}>
                          <Coins className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold">Efectivo</span>
                      </button>
                      <button
                        onClick={() => setPaymentMethod('card')}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all group ${paymentMethod === 'card' ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 transition-all ${paymentMethod === 'card' ? 'bg-red-500 text-white' : 'bg-white text-gray-400'}`}>
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold">Tarjeta</span>
                      </button>
                      <button
                        onClick={() => setPaymentMethod('transfer')}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all group ${paymentMethod === 'transfer' ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 transition-all ${paymentMethod === 'transfer' ? 'bg-red-500 text-white' : 'bg-white text-gray-400'}`}>
                          <Landmark className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold">Transfer</span>
                      </button>
                    </div>

                    {paymentMethod === 'transfer' && clabe && (
                      <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 animate-in fade-in zoom-in-95 duration-300">
                        <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <Landmark size={12} /> Datos de Transferencia
                        </p>
                        <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-purple-100">
                          <code className="text-xs font-bold text-gray-700 tracking-wider">
                            {clabe}
                          </code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(clabe);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="p-2 hover:bg-purple-50 rounded-lg transition-colors text-purple-600"
                          >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                          </button>
                        </div>
                        <p className="text-[9px] text-purple-400 mt-2 font-medium italic">
                          Al confirmar, se generará tu pedido y podrás enviar el comprobante por WhatsApp.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">¿Es pedido a domicilio?</h3>
                      <button
                        onClick={() => setWantsDelivery(!wantsDelivery)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${wantsDelivery ? 'bg-green-500' : 'bg-slate-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${wantsDelivery ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {wantsDelivery && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        {availableColonies.length > 0 ? (
                          <>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Colonia</label>
                              <select
                                value={deliveryColony}
                                onChange={(e) => setDeliveryColony(e.target.value)}
                                className="w-full px-4 py-3 text-sm bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-red-500 transition-all outline-none appearance-none"
                              >
                                <option value="">Seleccionar colonia...</option>
                                {availableColonies.map((item, idx) => (
                                  <option key={idx} value={item.colony}>
                                    {item.colony} - ${item.price}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Calle y Número</label>
                              <GooglePlacesAutocomplete
                                value={deliveryStreet}
                                onChange={(val) => setDeliveryStreet(val)}
                                onPlaceSelected={(place) => {
                                  setDeliveryStreet(place.formatted_address || place.address);
                                  setDeliveryLat(place.lat);
                                  setDeliveryLng(place.lng);
                                  if (place.colony && !deliveryColony) {
                                    const exists = availableColonies.find(c => c.colony === place.colony);
                                    if (exists) setDeliveryColony(place.colony);
                                  }
                                }}
                                placeholder="Ej: Av. Principal 123..."
                                className="w-full px-4 py-3 text-sm bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-red-500 transition-all outline-none"
                              />
                            </div>
                          </>
                        ) : (
                          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                            <p className="text-[11px] text-amber-700 leading-tight">
                              ⚠️ Esta sucursal aún no tiene zonas de envío configuradas. Por favor, contacta al negocio directamente.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-white sticky bottom-0 z-10 rounded-b-2xl">
              {activeTab === 'cart' ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl">
                    <span className="text-sm font-bold text-gray-500 uppercase">Subtotal</span>
                    <span className="text-xl font-black text-slate-800">${totalPrice}</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={clearCart}
                      className="flex-1 py-3.5 border border-gray-100 rounded-xl hover:bg-gray-50 font-bold text-xs text-gray-400 uppercase tracking-widest transition-all"
                    >
                      Limpiar
                    </button>
                    <button
                      onClick={() => setActiveTab('checkout')}
                      disabled={cart.length === 0}
                      className="flex-[2] py-3.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-200 text-white rounded-xl font-bold transition-all  shadow-red-100 flex items-center justify-center gap-2"
                    >
                      Siguiente
                      <Send size={16} className="rotate-45" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2 mb-2">
                    <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                      <span>Subtotal</span>
                      <span>${totalPrice}</span>
                    </div>
                    {wantsDelivery && shippingZone && (
                      <div className="flex justify-between text-xs font-bold text-red-500 uppercase tracking-widest">
                        <span>Envío ({deliveryColony})</span>
                        <span>+ ${shippingZone.price}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                      <span className="text-sm font-black text-gray-800 uppercase tracking-tighter">Total a Pagar</span>
                      <span className="text-2xl font-black text-red-600">${totalPrice + (wantsDelivery && shippingZone ? shippingZone.price : 0)}</span>
                    </div>
                  </div>
                  <button
                    onClick={sendToWhatsApp}
                    disabled={creatingOrder || (wantsDelivery && !shippingZone) || !customerName || !customerPhone || cart.length === 0}
                    className="w-full py-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-200 text-white rounded-2xl font-black text-lg shadow-xl shadow-green-100 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:scale-100"
                  >
                    {creatingOrder ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send size={20} className="pointer-events-none" />
                        Confirmar Pedido
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {configuringItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
            <div className="relative aspect-video sm:aspect-[16/10] overflow-hidden">
              {configuringItem.image ? (
                <img src={configuringItem.image} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300">
                  <ShoppingCart size={48} />
                </div>
              )}
              <button
                onClick={() => setConfiguringItem(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-black uppercase text-gray-900 tracking-tight leading-none mb-2">{configuringItem.name}</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed">{configuringItem.description}</p>
                <p className="text-2xl font-black text-emerald-600 mt-4">${configuringItem.price}</p>
              </div>

              <div className="space-y-6 max-h-[50dvh] overflow-y-auto pr-2 custom-scrollbar p-1">


                {configuringItem.options?.length > 0 && (
                  <div className="space-y-6">
                    {/* PREFIX SELECTORS (Masa, Tamaño, etc.) */}
                    {configuringItem.options.slice(0, -1).map((opt: any) => (
                      <div key={opt.name} className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block px-1">
                          Selecciona {opt.name}:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {opt.values.map((val: string) => (
                            <button
                              key={val}
                              onClick={() => setTempOptions(prev => ({ ...prev, [opt.name]: val }))}
                              className={`p-3 rounded-xl border-2 font-bold text-[10px] uppercase tracking-wider transition-all flex flex-col items-center justify-center ${tempOptions[opt.name] === val ? 'border-gray-900 bg-gray-900 text-white ' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-100 hover:bg-white'}`}
                            >
                              <span>{val}</span>
                              {opt.prices?.[val] && (
                                <span className={`text-[8px] mt-1 ${tempOptions[opt.name] === val ? 'text-emerald-300' : 'text-emerald-600'}`}>+$ {opt.prices[val]}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* MAIN COUNTER GROUP (Sabor, Ingrediente, etc.) */}
                    {configuringItem.options.slice(-1).map((opt: any) => (
                      <div key={opt.name} className="space-y-4">
                        <div className="flex justify-between items-end px-1 mb-4">
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-1">
                              {opt.name}:
                            </label>
                            <p className="text-[9px] text-gray-400 font-medium italic">Especifica la cantidad de cada uno</p>
                          </div>
                          {detectLimit(configuringItem) && (
                            <div className={`text-right px-3 py-1.5 rounded-xl border-2 transition-all ${Object.values(tempCounts).reduce((a, b) => a + (b as number), 0) === detectLimit(configuringItem)
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : Object.values(tempCounts).reduce((a, b) => a + (b as number), 0) > (detectLimit(configuringItem) || 0)
                                ? 'bg-red-500 border-red-500 text-white animate-shake'
                                : 'bg-white border-gray-100 text-gray-900'
                              }`}>
                              <span className="text-[10px] font-black">{Object.values(tempCounts).reduce((a, b) => a + (b as number), 0)} / {detectLimit(configuringItem)}</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          {opt.values.map((val: string) => {
                            const comboKey = getCombinationKey(tempOptions, val);
                            const currentCount = tempCounts[comboKey] || 0;
                            return (
                              <div key={val} className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-100/50 hover:bg-white hover:shadow-sm transition-all text-gray-700">
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm uppercase">{val}</span>
                                  {opt.prices?.[val] && (
                                    <span className="text-[10px] font-black text-emerald-600">+$ {opt.prices[val]}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4">
                                  <button
                                    onClick={() => setTempCounts(prev => ({ ...prev, [comboKey]: Math.max(0, currentCount - 1) }))}
                                    className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-gray-400 hover:text-red-500 transition-colors border border-gray-100"
                                  >
                                    -
                                  </button>
                                  <span className={`font-black text-sm w-4 text-center ${currentCount > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                                    {currentCount}
                                  </span>
                                  <button
                                    onClick={() => {
                                      const limit = detectLimit(configuringItem);
                                      const currentTotal = Object.values(tempCounts).reduce((a, b) => a + (b as number), 0);
                                      if (!limit || currentTotal < (limit || 0)) {
                                        setTempCounts(prev => ({ ...prev, [comboKey]: currentCount + 1 }));
                                      }
                                    }}
                                    className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-gray-400 hover:text-emerald-500 transition-colors border border-gray-100"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-gray-100 space-y-4">
                {configuringItem.options?.length !== 1 && (
                  <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cantidad Total:</span>
                    <div className="flex items-center gap-6">
                      <button
                        onClick={() => setTempQuantity(q => Math.max(1, q - 1))}
                        className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center font-black text-lg"
                      >
                        -
                      </button>
                      <span className="font-black text-xl w-6 text-center">{tempQuantity}</span>
                      <button
                        onClick={() => setTempQuantity(q => q + 1)}
                        className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center font-black text-lg"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    const limit = detectLimit(configuringItem);
                    const totalSelected = Object.values(tempCounts).reduce((a, b) => a + (b as number), 0);

                    // ALWAYS BUNDLE: Whether it has a limit or not, we bundle to avoid the multiplication bug
                    const combinations = Object.entries(tempCounts).filter(([_, count]) => (count as number) > 0);
                    const detail = combinations.map(([key, count]) => {
                      const { options, flavor } = parseCombinationKey(key);
                      const optsString = Object.values(options).join(', ');
                      return `${count}x ${optsString} ${flavor}`;
                    }).join(', ');

                    // Base price including prefix options (Size, etc.)
                    let baseAndPrefixPrice = configuringItem.price;
                    configuringItem.options?.slice(0, -1).forEach((opt: any) => {
                      const selectedVal = tempOptions[opt.name];
                      if (selectedVal && opt.prices?.[selectedVal]) baseAndPrefixPrice += opt.prices[selectedVal];
                    });

                    // Extras price (sum of specific choices * their extra price)
                    let extrasTotal = 0;
                    combinations.forEach(([key, count]) => {
                      const { flavor } = parseCombinationKey(key);
                      const lastOpt = configuringItem.options[configuringItem.options.length - 1];
                      if (lastOpt.prices?.[flavor]) extrasTotal += lastOpt.prices[flavor] * (count as number);
                    });

                    if (limit) {
                      // PACKAGE: Everything is one bundle, quantity 1
                      addToCart(configuringItem, { Surtido: detail }, 1, baseAndPrefixPrice + extrasTotal);
                    } else {
                      // INDIVIDUAL/PLATE: Base applies per tempQuantity, extras are added to total
                      // Final Price = (BaseAndPrefix * tempQuantity) + extrasTotal
                      // For consistency with addToCart(..., quantity), we pass the averaged price per unit
                      const totalBundlePrice = (baseAndPrefixPrice * tempQuantity) + extrasTotal;
                      const averagePrice = totalBundlePrice / tempQuantity;

                      const finalOpts = { ...tempOptions };
                      if (detail) finalOpts["Opciones"] = detail;

                      addToCart(configuringItem, finalOpts, tempQuantity, averagePrice);
                    }
                    setConfiguringItem(null);
                    if (!showCart) setShowCart(true);
                  }}
                  disabled={(() => {
                    const limit = detectLimit(configuringItem);
                    const total = Object.values(tempCounts).reduce((a, b) => a + (b as number), 0);
                    if (limit) return total !== limit;
                    return total === 0;
                  })()}
                  className="w-full py-5 bg-gray-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-gray-300 hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3 disabled:bg-gray-200 disabled:shadow-none"
                >
                  <ShoppingCart size={18} />
                  {(() => {
                    const limit = detectLimit(configuringItem);
                    const total = Object.values(tempCounts).reduce((a, b) => a + (b as number), 0);

                    if (limit) {
                      if (total < limit) return `Faltan ${limit - total} piezas...`;

                      let packagePrice = configuringItem.price;
                      configuringItem.options?.slice(0, -1).forEach((opt: any) => {
                        const selectedVal = tempOptions[opt.name];
                        if (selectedVal && opt.prices?.[selectedVal]) packagePrice += opt.prices[selectedVal];
                      });
                      return `Confirmar Paquete • $${packagePrice.toFixed(2)}`;
                    }

                    let totalPrice = 0;
                    Object.entries(tempCounts).forEach(([key, count]) => {
                      if ((count as number) > 0) {
                        const { options, flavor } = parseCombinationKey(key);
                        let itemPrice = configuringItem.price;
                        Object.entries(options).forEach(([optName, val]) => {
                          const opt = configuringItem.options.find((o: any) => o.name === optName);
                          if (opt && opt.prices?.[val as string]) itemPrice += opt.prices[val as string];
                        });
                        const lastOpt = configuringItem.options[configuringItem.options.length - 1];
                        if (lastOpt.prices?.[flavor]) itemPrice += lastOpt.prices[flavor];
                        totalPrice += itemPrice * (count as number);
                      }
                    });

                    return total > 0 ? `Agregar al Carrito • $${totalPrice.toFixed(2)}` : 'Selecciona opciones';
                  })()}
                </button>

                {showSuccess && (
                  <p className="text-center text-emerald-600 font-bold text-xs animate-bounce">
                    ✓ ¡Agregado correctamente!
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
