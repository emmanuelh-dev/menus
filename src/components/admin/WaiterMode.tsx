import { useState, useEffect } from 'react';
import {
  X, Plus, Minus, ShoppingCart, Trash2,
  Search, ChevronRight, User, Hash,
  CreditCard, Coins, Landmark, Check
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
  onOrderCreated
}: {
  placeId: number;
  onClose: () => void;
  onOrderCreated: () => void;
}) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchMenu();
  }, [placeId]);

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
  const total = subtotal; // No delivery in waiter mode usually, or could be added

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      const orderData = {
        place_id: placeId,
        customer_name: customerName || `Mesa ${tableNumber || '?'}`,
        customer_phone: '0000000000', // Internal order
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
        onOrderCreated();
        onClose();
      }
    } catch (error) {
      console.error('Error creating order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-[100] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-0 sm:p-4">
      <div className="bg-gray-50 w-full h-full sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-w-7xl animate-in zoom-in-95 duration-300">

        {/* Left: Menu Side */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200 bg-white">
          <div className="p-4 border-b border-gray-100 flex items-center gap-4 sticky top-0 bg-white z-10">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors md:hidden"
            >
              <X size={20} />
            </button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar platillo..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-slate-900 transition-all font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-8">
            {/* Categories Chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              {blocks.map(block => (
                <button
                  key={block.id}
                  onClick={() => {
                    setActiveCategory(block.id);
                    document.getElementById(block.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${activeCategory === block.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
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
                      className="flex flex-col text-left bg-white border border-gray-100 rounded-2xl p-3 hover:shadow-xl hover:border-slate-200 transition-all group active:scale-95"
                    >
                      {item.image && (
                        <div className="aspect-square w-full mb-2 rounded-xl overflow-hidden bg-gray-100">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        </div>
                      )}
                      <h4 className="text-sm font-bold text-slate-800 line-clamp-1 mb-1">{item.name}</h4>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-sm font-black text-slate-900">${item.price}</span>
                        <div className="p-1 bg-slate-100 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-colors">
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

        {/* Right: Order Summary Side */}
        <div className="w-full md:w-[400px] flex flex-col bg-slate-50 relative">
          <div className="p-6 border-b border-gray-200 bg-white md:bg-transparent">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart size={22} />
                Comanda
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors hidden md:block">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Cliente"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-none"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="number"
                  placeholder="Mesa"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-none"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-2 opacity-60">
                <ShoppingCart size={48} />
                <p className="font-bold text-sm tracking-widest uppercase">Vacío</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 animate-in fade-in slide-in-from-right-4">
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-slate-800 mb-1">{item.name}</h4>
                    <span className="text-xs font-black text-slate-900">${item.price * item.quantity}</span>
                  </div>
                  <div className="flex items-center bg-gray-50 rounded-xl border border-gray-100 p-1">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="p-1.5 hover:bg-white rounded-lg transition-all"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="p-1.5 hover:bg-white rounded-lg transition-all"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-white border-t border-gray-200 space-y-6">
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Método de Pago</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex flex-col items-center py-2 px-1 rounded-xl border-2 transition-all ${paymentMethod === 'cash' ? 'border-slate-900 bg-slate-900 text-white' : 'border-gray-100 bg-gray-50 text-gray-400'}`}
                >
                  <Coins size={16} className="mb-1" />
                  <span className="text-[10px] font-bold">Efectivo</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`flex flex-col items-center py-2 px-1 rounded-xl border-2 transition-all ${paymentMethod === 'card' ? 'border-slate-900 bg-slate-900 text-white' : 'border-gray-100 bg-gray-50 text-gray-400'}`}
                >
                  <CreditCard size={16} className="mb-1" />
                  <span className="text-[10px] font-bold">Tarjeta</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('transfer')}
                  className={`flex flex-col items-center py-2 px-1 rounded-xl border-2 transition-all ${paymentMethod === 'transfer' ? 'border-slate-900 bg-slate-900 text-white' : 'border-gray-100 bg-gray-50 text-gray-400'}`}
                >
                  <Landmark size={16} className="mb-1" />
                  <span className="text-[10px] font-bold">Transf.</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-slate-900">
                <span className="text-sm font-bold opacity-50 uppercase tracking-widest text-[10px]">Total a Cobrar</span>
                <span className="text-2xl font-black">${total}</span>
              </div>
              <button
                onClick={handleSubmit}
                disabled={cart.length === 0 || isSubmitting}
                className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-slate-200 active:scale-95"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                ) : (
                  <>
                    <Check size={18} />
                    Registrar Comanda
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
