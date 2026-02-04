import { useState, useEffect, useMemo } from 'react';
import {
  X, Plus, Minus, ShoppingCart, Trash2,
  Search, User, Hash,
  CreditCard, Coins, Landmark, Check, Phone, ChevronDown, Save,
  Truck
} from 'lucide-react';
import AdminPageHeader from './AdminPageHeader';
import { PiHouse, PiPlus, PiMagnifyingGlass, PiX } from 'react-icons/pi';

interface ShippingZone {
  id: number;
  name: string;
  price: number;
}

interface ItemData {
  id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
}

interface Block {
  id: string;
  type: string;
  data: {
    title: string;
    items: ItemData[];
  };
}

interface CartItem extends ItemData {
  quantity: number;
  productId: string;
  selectedOptions?: { [key: string]: string | number };
}

export default function WaiterMode({
  placeId,
  onClose,
  onOrderCreated,
  isPage = false
}: {
  placeId: number;
  onClose?: () => void;
  onOrderCreated?: () => void;
  isPage?: boolean;
}) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [prevCustomers, setPrevCustomers] = useState<{ name: string, phone: string }[]>([]);
  const [showCustomers, setShowCustomers] = useState(false);
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [step, setStep] = useState(1); // 1: items, 2: checkout (mobile only)
  const [configuringItem, setConfiguringItem] = useState<any | null>(null);
  const [tempOptions, setTempOptions] = useState<{ [key: string]: string }>({});
  const [tempCounts, setTempCounts] = useState<{ [value: string]: number }>({});
  const [tempQuantity, setTempQuantity] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);

  const detectLimit = (item: any) => {
    const text = `${item.name} ${item.description || ''}`.toLowerCase();
    const match = text.match(/(?:paquete|combo|pqt|ord[en]+|pzs|piezas|ítems)\s*(?:de|:)?\s*(\d+)/i) ||
      text.match(/(\d+)\s*(?:piezas|pzs|pazas|ítems|items|pzas)/i);
    return match ? parseInt(match[1]) : null;
  };

  const getCombinationKey = (prefixOptions: { [key: string]: string }, flavor: string) => {
    return JSON.stringify(prefixOptions) + '|||' + flavor;
  };

  const parseCombinationKey = (key: string) => {
    const [optsJson, flavor] = key.split('|||');
    try {
      return { options: JSON.parse(optsJson) as { [key: string]: string }, flavor };
    } catch (e) {
      return { options: {} as { [key: string]: string }, flavor };
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([fetchMenu(), fetchPrevCustomers(), fetchZones()]);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [placeId]);

  const fetchZones = async () => {
    try {
      const res = await fetch(`/api/shipping-zones?place_id=${placeId}`);
      if (res.ok) {
        const data = await res.json();
        setShippingZones(data.zones || []);
      }
    } catch (e) {
      console.error('Error fetching zones:', e);
    }
  };

  const fetchPrevCustomers = async () => {
    try {
      const response = await fetch(`/api/customers?place_id=${placeId}`);
      if (response.ok) {
        const data = await response.json();
        setPrevCustomers(data.customers || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const saveCustomer = async () => {
    if (!customerPhone || !customerName) return;
    try {
      await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customerName,
          phone: customerPhone
        })
      });
      fetchPrevCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
    }
  };

  const fetchMenu = async () => {
    try {
      const response = await fetch(`/api/admin/place/${placeId}`);
      if (response.ok) {
        const data = await response.json();
        const contentBlocks = data.place?.content?.blocks || [];
        const sections = contentBlocks.filter((b: any) => b.type === 'section');
        setBlocks(sections);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
    }
  };

  const deliveryBlock = useMemo(() => shippingZones.length > 0 ? {
    id: 'delivery-service',
    type: 'section',
    data: {
      title: 'Servicio a Domicilio',
      items: shippingZones.map(zone => ({
        id: `zone-${zone.id}`,
        name: `Envío: ${zone.name}`,
        price: zone.price,
        description: 'Costo de envío a domicilio',
        image: undefined
      }))
    }
  } : null, [shippingZones]);

  const allBlocks = useMemo(() => deliveryBlock ? [deliveryBlock, ...blocks] : blocks, [deliveryBlock, blocks]);

  useEffect(() => {
    if (allBlocks.length > 0 && !activeCategory) {
      setActiveCategory(allBlocks[0].id);
    }
  }, [allBlocks, activeCategory]);

  const filteredBlocks = useMemo(() => allBlocks.map(block => ({
    ...block,
    data: {
      ...block.data,
      items: (block.data.items || []).filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
  })).filter(block => block.data.items.length > 0), [allBlocks, searchTerm]);

  const addToCart = (item: ItemData, options?: { [key: string]: string }, quantity = 1, customPrice?: number) => {
    // Si el item tiene opciones y no vienen ya configuradas, abrimos el configurador
    if ((item as any).options?.length >= 1 && !options) {
      const initialOpts: any = {};
      (item as any).options.slice(0, -1).forEach((opt: any) => {
        if (opt.values?.length > 0) initialOpts[opt.name] = opt.values[0];
      });
      setTempOptions(initialOpts);
      setTempCounts({});
      setTempQuantity(1);
      setConfiguringItem(item);
      return;
    }

    setCart(prev => {
      const optionHash = options ? JSON.stringify(options) : '';
      const uniqueId = `${item.id}-${optionHash}`;
      const existing = prev.find(i => i.id === uniqueId);

      const newItem = {
        ...item,
        id: uniqueId,
        productId: item.id,
        quantity: quantity,
        price: customPrice !== undefined ? customPrice : item.price,
        selectedOptions: options
      };

      if (existing) {
        return prev.map(i => i.id === uniqueId ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, newItem];
    });

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = Math.max(0, i.quantity + delta);
        return newQty === 0 ? null : { ...i, quantity: newQty };
      }
      return i;
    }).filter(Boolean) as CartItem[]);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const total = useMemo(() => cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0), [cart]);

  const handleSubmit = async (sendWhatsApp: boolean = false) => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      const orderData = {
        place_id: placeId,
        customer_name: customerName || `Mesa ${tableNumber || '?'}`,
        customer_phone: customerPhone || '0000000000',
        delivery_address: tableNumber ? `Mesa ${tableNumber}` : 'Consumo Local',
        items: cart,
        subtotal: total,
        total: total,
        payment_method: paymentMethod,
        status: 'pending',
        notes: `Comanda - ${customerName} ${tableNumber ? `(Mesa ${tableNumber})` : ''}`
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        if (customerPhone && customerPhone !== '0000000000') {
          saveCustomer();
        }

        if (sendWhatsApp && customerPhone) {
          const hasDelivery = cart.some(i => i.id.startsWith('zone-'));
          const locationLabel = hasDelivery ? '🏠 A Domicilio' : (tableNumber ? `🪑 Mesa ${tableNumber}` : '🍽️ Consumo Local');

          const message = `*🧾 TICKET DE COMPRA*\n` +
            `--------------------------\n` +
            `*Cliente:* ${customerName}\n` +
            `*Ubicación:* ${locationLabel}\n` +
            `*Fecha:* ${new Date().toLocaleDateString()}\n` +
            `--------------------------\n` +
            `*DETALLE:*\n` +
            cart.map(i => `• ${i.quantity}x ${i.name} - *$${i.price * i.quantity}*`).join('\n') +
            `\n\n--------------------------\n` +
            `*TOTAL: $${total}*\n` +
            `--------------------------\n` +
            `_¡Gracias por tu preferencia!_`;

          window.open(`https://wa.me/52${customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
        }

        if (onOrderCreated) onOrderCreated();
        if (isPage) {
          window.location.href = `/admin/place/${placeId}/orders`;
        } else if (onClose) {
          onClose();
        }
      }
    } catch (error) {
      console.error('Error creating order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`${isPage ? '' : 'fixed inset-0 bg-white z-[100]'} flex items-center justify-center`}>
        <div className="rounded-full h-12 w-12 border-b-2 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={isPage ? "w-full h-full bg-gray-50 flex flex-col overflow-hidden" : "fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 transition-all"}>
      {isPage && (
        <AdminPageHeader
          leftContent={
            <div className="flex bg-white/50 p-1 rounded-xl items-center gap-0.5 border border-gray-200 shadow-sm shrink-0 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <PiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-full pl-9 pr-4 py-1.5 bg-transparent border-none text-[11px] font-bold uppercase tracking-wider outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Mobile "Submit/Pay" button in Header */}
              {cart.length > 0 && step === 1 && (
                <button
                  onClick={() => setStep(2)}
                  className="md:hidden bg-slate-900 text-white px-3 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-lg shrink-0"
                >
                  <ShoppingCart size={12} />
                  Pagar (${total})
                </button>
              )}
            </div>
          }
          rightContent={
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar shrink-0">
              {allBlocks.map(block => (
                <button
                  key={block.id}
                  onClick={() => {
                    setActiveCategory(block.id);
                    document.getElementById(block.id)?.scrollIntoView();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all whitespace-nowrap border ${activeCategory === block.id
                    ? 'bg-gray-800 text-white border-gray-800 shadow-md'
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-white'
                    }`}
                >
                  <span className="flex items-center gap-1.5">
                    {block.id === 'delivery-service' && <Truck size={12} />}
                    {block.data.title}
                  </span>
                </button>
              ))}
            </div>
          }
        />
      )}

      <div className={`flex-1 flex flex-col md:flex-row w-full max-w-[1600px] mx-auto overflow-hidden ${isPage ? 'h-full' : 'sm:h-[90vh] sm:rounded-3xl shadow-2xl bg-white'}`}>

        {/* Left: Menu Side - Scrollable independently */}
        <div className={`flex-1 flex flex-col min-w-0 bg-white overflow-hidden border-r border-gray-200 ${step === 2 ? 'hidden md:flex' : 'flex'}`}>
          {!isPage && (
            <div className="xl:p-4 p-2 border-b border-gray-100 flex items-center gap-4 bg-white">
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full md:hidden">
                <X size={20} />
              </button>
              <div className="relative flex-1">
                <PiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar platillo o zona..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm outline-none font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto xl:p-4 p-2 space-y-8">
            {filteredBlocks.map(block => (
              <div key={block.id} id={block.id} className="space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest px-1">
                  {block.data.title}
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {block.data.items.map(item => {
                    const cartEntries = cart.filter(i => i.productId === item.id);
                    const quantityInCart = cartEntries.reduce((acc, curr) => acc + curr.quantity, 0);
                    const hasOptions = (item as any).options?.length > 0;

                    return (
                      <div
                        key={item.id}
                        className={`flex flex-col text-left bg-white border rounded-3xl p-3 transition-all ${quantityInCart > 0 ? 'border-slate-900 ring-1 ring-slate-900' : 'border-gray-100'}`}
                      >
                        {item.image && (
                          <div className="aspect-square w-full mb-2 rounded-2xl overflow-hidden bg-gray-100">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <h4 className="text-sm font-bold text-slate-800 line-clamp-1 mb-1">{item.name}</h4>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-sm font-black text-slate-900">${item.price}</span>

                          <div className="flex items-center bg-slate-100 rounded-xl p-0.5">
                            {quantityInCart > 0 && !hasOptions && (
                              <button
                                onClick={(e) => { e.stopPropagation(); updateQuantity(cartEntries[0].id, -1); }}
                                className="p-1.5 hover:bg-white rounded-lg transition-colors text-slate-600"
                              >
                                <Minus size={14} />
                              </button>
                            )}

                            {quantityInCart > 0 && (
                              <span className="w-6 text-center text-xs font-bold text-slate-900">
                                {quantityInCart}
                              </span>
                            )}

                            <button
                              onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                              className={`p-1.5 rounded-lg transition-all ${quantityInCart > 0 ? 'hover:bg-white text-slate-600' : 'bg-slate-900 text-white shadow-md'}`}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right/Bottom: Order Summary Side */}
        <div className={`w-full md:w-[400px] flex flex-col bg-slate-50 border-t md:border-t-0 md:border-l border-gray-200 max-h-full ${step === 1 ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="md:hidden flex items-center gap-1 p-1 hover:bg-gray-100 rounded-lg text-slate-500 mr-2"
                >
                  <PiX size={18} className="rotate-[45deg]" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Atrás</span>
                </button>
                <ShoppingCart size={20} className="hidden md:block" />
                Pago y Cliente
              </h2>
              <div className="flex items-center gap-1">
                {/* Mobile Finish Button in Header */}
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={cart.length === 0 || isSubmitting}
                  className="md:hidden bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-lg mr-2"
                >
                  <Check size={14} />
                  Listos
                </button>

                <a
                  href="/admin/customers"
                  target="_blank"
                  className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                  title="Gestionar Clientes"
                >
                  <User size={18} />
                </a>
                <button onClick={onClose} className="hidden md:block p-2 hover:bg-gray-200 rounded-full">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                <input
                  type="text"
                  placeholder="Nombre Cliente"
                  className="w-full pl-8 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setShowCustomers(true);
                  }}
                  onFocus={() => setShowCustomers(true)}
                />
                {prevCustomers.length > 0 && (
                  <button
                    onClick={() => setShowCustomers(!showCustomers)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    <ChevronDown size={12} />
                  </button>
                )}

                {showCustomers && prevCustomers.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-40 overflow-y-auto">
                    {prevCustomers
                      .filter(c => c.name.toLowerCase().includes(customerName.toLowerCase()) || c.phone.includes(customerName))
                      .map((c, idx) => (
                        <button
                          key={idx}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex flex-col border-b border-gray-50 last:border-0"
                          onClick={() => {
                            setCustomerName(c.name);
                            setCustomerPhone(c.phone);
                            setShowCustomers(false);
                          }}
                        >
                          <span className="font-bold">{c.name}</span>
                          <span className="text-gray-400">{c.phone}</span>
                        </button>
                      ))
                    }
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                  <input
                    type="tel"
                    placeholder="WhatsApp (ej: 8111...)"
                    className="w-full pl-8 pr-10 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none"
                    value={customerPhone}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomerPhone(val);

                      // 1. Buscar en locales (Rápido)
                      const localMatch = prevCustomers.find(c => c.phone === val);
                      if (localMatch) {
                        setCustomerName(localMatch.name);
                        return;
                      }

                      // 2. Si es un número completo, buscar globalmente (API)
                      if (val.length >= 10) {
                        fetch(`/api/customers?phone=${val}`)
                          .then(res => res.json())
                          .then(data => {
                            if (data.customers && data.customers.length > 0) {
                              setCustomerName(data.customers[0].name);
                            }
                          });
                      }
                    }}
                  />
                  {customerPhone && customerName && (
                    <button
                      onClick={(e) => { e.preventDefault(); saveCustomer(); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-500 hover:text-emerald-600 p-1"
                      title="Guardar Cliente"
                    >
                      <Save size={14} />
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                  <input
                    type="number"
                    placeholder="Mesa"
                    className="w-full pl-8 pr-2 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cart items scrollable area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 py-8">
                <ShoppingCart size={32} />
                <p className="text-[10px] font-bold uppercase mt-2">Vacío</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center gap-3">
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{item.name}</h4>
                    {item.selectedOptions && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {Object.entries(item.selectedOptions).map(([key, val]) => (
                          <span key={key} className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase">
                            {val as string}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="text-xs font-black text-slate-900">${(item.price || 0) * (item.quantity || 1)}</span>
                  </div>
                  <div className="flex items-center bg-gray-50 rounded-lg border border-gray-100">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 px-2 hover:bg-white rounded-l-lg transition-colors">
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center text-xs font-black">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 px-2 hover:bg-white rounded-r-lg transition-colors">
                      <Plus size={12} />
                    </button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="p-1 text-gray-300 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Payment and Submit - Always at bottom */}
          <div className="xl:p-4 p-2 xl:bg-white border-t border-gray-200">
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`flex flex-col items-center py-2 rounded-lg border text-[10px] font-bold ${paymentMethod === 'cash' ? 'bg-slate-900 text-white border-slate-900' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
              >
                <Coins size={14} className="mb-1" /> Efectivo
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`flex flex-col items-center py-2 rounded-lg border text-[10px] font-bold ${paymentMethod === 'card' ? 'bg-slate-900 text-white border-slate-900' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
              >
                <CreditCard size={14} className="mb-1" /> Tarjeta
              </button>
              <button
                onClick={() => setPaymentMethod('transfer')}
                className={`flex flex-col items-center py-2 rounded-lg border text-[10px] font-bold ${paymentMethod === 'transfer' ? 'bg-slate-900 text-white border-slate-900' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
              >
                <Landmark size={14} className="mb-1" /> Transf.
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => handleSubmit(false)}
                disabled={cart.length === 0 || isSubmitting}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 hover:bg-black transition-all shadow-xl shadow-slate-200"
              >
                {isSubmitting ? (
                  <div className="h-5 w-5 border-2 border-slate-300 border-t-white animate-spin rounded-full"></div>
                ) : (
                  <><Check size={18} /> Finalizar Orden | ${total}</>
                )}
              </button>

              <button
                onClick={() => handleSubmit(true)}
                disabled={cart.length === 0 || isSubmitting || !customerPhone}
                className="w-full bg-emerald-50 text-emerald-700 py-3 rounded-xl font-bold uppercase text-[10px] flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-emerald-100 transition-colors"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 border-2 border-emerald-300 border-t-emerald-600 animate-spin rounded-full"></div>
                ) : (
                  <><Phone size={16} /> Guardar y enviar WhatsApp</>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Item Configuration Modal */}
      {configuringItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="relative h-48 shrink-0">
              {configuringItem.image ? (
                <img src={configuringItem.image} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-200">
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

            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div>
                <h3 className="text-2xl font-black uppercase text-slate-900 tracking-tight leading-none mb-2">{configuringItem.name}</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">{configuringItem.description}</p>
                <p className="text-2xl font-black text-emerald-600 mt-4">${configuringItem.price}</p>
              </div>

              {configuringItem.options?.length > 0 && (
                <div className="space-y-6">
                  {/* PREFIX SELECTORS (Masa, Tamaño, etc.) */}
                  {configuringItem.options.slice(0, -1).map((opt: any) => (
                    <div key={opt.name} className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block px-1">
                        Selecciona {opt.name}:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {opt.values.map((val: string) => (
                          <button
                            key={val}
                            onClick={() => setTempOptions(prev => ({ ...prev, [opt.name]: val }))}
                            className={`p-3 rounded-xl border-2 font-bold text-[10px] uppercase tracking-wider transition-all flex flex-col items-center justify-center ${tempOptions[opt.name] === val ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-100 hover:bg-white'}`}
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
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1">
                            {opt.name}:
                          </label>
                          <p className="text-[9px] text-slate-400 font-medium italic">Especifica la cantidad</p>
                        </div>
                        {detectLimit(configuringItem) && (
                          <div className={`text-right px-3 py-1.5 rounded-xl border-2 transition-all ${Object.values(tempCounts).reduce((a, b) => a + b, 0) === detectLimit(configuringItem)
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : Object.values(tempCounts).reduce((a, b) => a + b, 0) > (detectLimit(configuringItem) || 0)
                              ? 'bg-red-500 border-red-500 text-white animate-shake'
                              : 'bg-white border-slate-100 text-slate-900'
                            }`}>
                            <span className="text-[10px] font-black">{Object.values(tempCounts).reduce((a, b) => a + b, 0)} / {detectLimit(configuringItem)}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        {opt.values.map((val: string) => {
                          const comboKey = getCombinationKey(tempOptions, val);
                          const currentCount = tempCounts[comboKey] || 0;
                          return (
                            <div key={val} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100/50 hover:bg-white hover:shadow-sm transition-all text-slate-700">
                              <div className="flex flex-col text-left">
                                <span className="font-bold text-sm uppercase">{val}</span>
                                {opt.prices?.[val] && (
                                  <span className="text-[10px] font-black text-emerald-600">+$ {opt.prices[val]}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                <button
                                  onClick={() => setTempCounts(prev => ({ ...prev, [comboKey]: Math.max(0, currentCount - 1) }))}
                                  className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-slate-400 hover:text-red-500 transition-colors border border-slate-100"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className={`font-black text-sm w-4 text-center ${currentCount > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                                  {currentCount}
                                </span>
                                <button
                                  onClick={() => {
                                    const limit = detectLimit(configuringItem);
                                    const currentTotal = Object.values(tempCounts).reduce((a, b) => a + b, 0);
                                    if (!limit || currentTotal < (limit || 0)) {
                                      setTempCounts(prev => ({ ...prev, [comboKey]: currentCount + 1 }));
                                    }
                                  }}
                                  className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-slate-400 hover:text-emerald-500 transition-colors border border-slate-100"
                                >
                                  <Plus size={12} />
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

              <div className="pt-6 mt-6 border-t border-slate-100">
                {configuringItem.options?.length !== 1 && (
                  <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl mb-6">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cantidad Total:</span>
                    <div className="flex items-center gap-6">
                      <button
                        onClick={() => setTempQuantity(q => Math.max(1, q - 1))}
                        className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center font-black"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="font-black text-xl w-6 text-center">{tempQuantity}</span>
                      <button
                        onClick={() => setTempQuantity(q => q + 1)}
                        className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center font-black"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    const limit = detectLimit(configuringItem);
                    const totalSelected = Object.values(tempCounts).reduce((a, b) => a + (b as number), 0);

                    const combinations = Object.entries(tempCounts).filter(([_, count]) => (count as number) > 0);
                    const detail = combinations.map(([key, count]) => {
                      const { options, flavor } = parseCombinationKey(key);
                      const optsString = Object.values(options).join(', ');
                      return `${count}x ${optsString} ${flavor}`;
                    }).join(', ');

                    let baseAndPrefixPrice = configuringItem.price;
                    configuringItem.options?.slice(0, -1).forEach((opt: any) => {
                      const selectedVal = tempOptions[opt.name];
                      if (selectedVal && opt.prices?.[selectedVal]) baseAndPrefixPrice += opt.prices[selectedVal];
                    });

                    let extrasTotal = 0;
                    combinations.forEach(([key, count]) => {
                      const { flavor } = parseCombinationKey(key);
                      const lastOpt = configuringItem.options[configuringItem.options.length - 1];
                      if (lastOpt.prices?.[flavor]) extrasTotal += lastOpt.prices[flavor] * (count as number);
                    });

                    if (limit) {
                      addToCart(configuringItem, { Surtido: detail }, 1, baseAndPrefixPrice + extrasTotal);
                    } else {
                      const totalBundlePrice = (baseAndPrefixPrice * tempQuantity) + extrasTotal;
                      const averagePrice = totalBundlePrice / tempQuantity;
                      const finalOpts = { ...tempOptions };
                      if (detail) finalOpts["Opciones"] = detail;
                      addToCart(configuringItem, finalOpts, tempQuantity, averagePrice);
                    }
                    setConfiguringItem(null);
                  }}
                  disabled={(() => {
                    const limit = detectLimit(configuringItem);
                    const total = Object.values(tempCounts).reduce((a, b) => a + (b as number), 0);
                    if (limit) return total !== limit;
                    return total === 0;
                  })()}
                  className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-slate-300 hover:bg-black transition-all flex items-center justify-center gap-3 disabled:bg-slate-200 disabled:shadow-none"
                >
                  <ShoppingCart size={18} />
                  {(() => {
                    const limit = detectLimit(configuringItem);
                    const totalSelected = Object.values(tempCounts).reduce((a, b) => a + (b as number), 0);
                    if (limit) {
                      if (totalSelected < limit) return `Faltan ${limit - totalSelected} piezas...`;

                      let packagePrice = configuringItem.price;
                      configuringItem.options?.slice(0, -1).forEach((opt: any) => {
                        const selectedVal = tempOptions[opt.name];
                        if (selectedVal && opt.prices?.[selectedVal]) packagePrice += opt.prices[selectedVal];
                      });
                      return `Confirmar Paquete • $${packagePrice}`;
                    }

                    let totalPrice = 0;
                    Object.entries(tempCounts).forEach(([key, count]) => {
                      if ((count as number) > 0) {
                        const { options, flavor } = parseCombinationKey(key);
                        let itemPrice = configuringItem.price;
                        Object.entries(options).forEach(([optName, val]) => {
                          const opt = configuringItem.options.find((o: any) => o.name === optName);
                          if (opt && opt.prices?.[val]) itemPrice += opt.prices[val];
                        });
                        const lastOpt = configuringItem.options[configuringItem.options.length - 1];
                        if (lastOpt.prices?.[flavor]) itemPrice += lastOpt.prices[flavor];
                        totalPrice += itemPrice * (count as number) * tempQuantity;

                        // Wait, if it's bundled additive, the correct total is:
                        // (Base + Prefix) * tempQuantity + (Extras)
                      }
                    });

                    // Re-calculate bundle total for display
                    let baseAndPrefixPrice = configuringItem.price;
                    configuringItem.options?.slice(0, -1).forEach((opt: any) => {
                      const selectedVal = tempOptions[opt.name];
                      if (selectedVal && opt.prices?.[selectedVal]) baseAndPrefixPrice += opt.prices[selectedVal];
                    });

                    let extrasTotal = 0;
                    Object.entries(tempCounts).forEach(([key, count]) => {
                      if ((count as number) > 0) {
                        const { flavor } = parseCombinationKey(key);
                        const lastOpt = configuringItem.options[configuringItem.options.length - 1];
                        if (lastOpt.prices?.[flavor]) extrasTotal += lastOpt.prices[flavor] * (count as number);
                      }
                    });

                    const totalBundlePrice = (baseAndPrefixPrice * tempQuantity) + extrasTotal;

                    return totalSelected > 0 ? `Agregar a Comanda • $${totalBundlePrice.toFixed(2)}` : 'Selecciona opciones';
                  })()}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}