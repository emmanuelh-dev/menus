import { useState, useEffect } from 'react';
import {
  X, Plus, Minus, ShoppingCart, Trash2,
  Search, User, Hash,
  CreditCard, Coins, Landmark, Check, Phone, ChevronDown, Save
} from 'lucide-react';

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

  useEffect(() => {
    fetchMenu();
    fetchPrevCustomers();
  }, [placeId]);

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
        if (sections.length > 0) setActiveCategory(sections[0].id);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: ItemData) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
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

  const subtotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
  const total = subtotal;

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
        subtotal,
        total,
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
        // Guardar/Actualizar cliente automáticamente
        if (customerPhone && customerPhone !== '0000000000') {
          saveCustomer();
        }

        if (sendWhatsApp && customerPhone) {
          const message = `*🧾 TICKET DE COMPRA*\n` +
            `--------------------------\n` +
            `*Cliente:* ${customerName}\n` +
            `*Ubicación:* ${tableNumber ? `Mesa ${tableNumber}` : 'Consumo Local'}\n` +
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

  const filteredBlocks = blocks.map(block => ({
    ...block,
    data: {
      ...block.data,
      items: block.data.items?.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) || []
    }
  })).filter(block => block.data.items.length > 0);

  return (
    <div className={isPage ? "w-full h-full" : "fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center"}>
      <div className={`bg-gray-50 w-full h-full flex flex-col md:flex-row max-w-7xl overflow-hidden ${isPage ? '' : 'sm:h-[90vh] sm:rounded-3xl shadow-2xl'}`}>

        {/* Left: Menu Side - Scrollable independently */}
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden border-r border-gray-200">
          <div className="xl:p-4 p-2 border-b border-gray-100 flex items-center gap-4 bg-white">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full md:hidden">
              <X size={20} />
            </button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar platillo..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm outline-none font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto xl:p-4 p-2 space-y-8">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {blocks.map(block => (
                <button
                  key={block.id}
                  onClick={() => {
                    setActiveCategory(block.id);
                    document.getElementById(block.id)?.scrollIntoView();
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border ${activeCategory === block.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-gray-500 border-gray-200'
                    }`}
                >
                  {block.data.title}
                </button>
              ))}
            </div>

            {filteredBlocks.map(block => (
              <div key={block.id} id={block.id} className="space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest px-1">
                  {block.data.title}
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {block.data.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className="flex flex-col text-left bg-white border border-gray-100 rounded-2xl p-3 active:bg-gray-50 transition-colors"
                    >
                      {item.image && (
                        <div className="aspect-square w-full mb-2 rounded-xl overflow-hidden bg-gray-100">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <h4 className="text-sm font-bold text-slate-800 line-clamp-1 mb-1">{item.name}</h4>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-sm font-black text-slate-900">${item.price}</span>
                        <div className="p-1 bg-slate-100 rounded-lg">
                          <Plus size={14} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right/Bottom: Order Summary Side */}
        <div className="w-full md:w-[400px] flex flex-col bg-slate-50 border-t md:border-t-0 md:border-l border-gray-200 max-h-[50vh] md:max-h-full">
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart size={20} />
                Comanda {cart.length > 0 && `(${cart.length})`}
              </h2>
              <div className="flex items-center gap-1">
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
                    <span className="text-xs font-black text-slate-900">${item.price * item.quantity}</span>
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
                className="w-full bg-slate-100 text-slate-900 py-3 rounded-xl font-bold uppercase text-[10px] flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-slate-200 transition-colors"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 border-2 border-slate-300 border-t-slate-900 animate-spin rounded-full"></div>
                ) : (
                  <><Check size={16} /> Solo Guardar ($${total})</>
                )}
              </button>

              <button
                onClick={() => handleSubmit(true)}
                disabled={cart.length === 0 || isSubmitting || !customerPhone}
                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold uppercase text-[10px] flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full"></div>
                ) : (
                  <><Phone size={16} /> Guardar y enviar WhatsApp</>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}