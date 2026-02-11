import { useState, useEffect } from 'react';
import {
  Package, Clock, CheckCircle, Truck, XCircle,
  MapPin, Phone, MessageCircle, ArrowLeft,
  ChevronRight, Receipt, User, ExternalLink,
  Coins, CreditCard, Landmark
} from 'lucide-react';

interface Order {
  id: number;
  tracking_id?: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_colony?: string;
  delivery_price: number;
  items: any[];
  subtotal: number;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'completed' | 'cancelled';
  notes?: string;
  payment_method?: 'cash' | 'card' | 'transfer';
  created_at: string;
  place_id: number;
  uuid?: string;
  places?: {
    name: string;
    short_name: string;
    user_id?: string;
  };
}

const statusConfig = {
  pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700', icon: Clock, desc: 'Estamos esperando que la cocina confirme tu pedido.' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700', icon: CheckCircle, desc: '¡Tu pedido ha sido recibido y está en fila!' },
  preparing: { label: 'Preparando', color: 'bg-indigo-100 text-indigo-700', icon: Package, desc: 'El chef está poniendo manos a la obra con tu comida.' },
  delivering: { label: 'En camino', color: 'bg-purple-100 text-purple-700', icon: Truck, desc: '¡Tu comida va volando hacia tu ubicación!' },
  completed: { label: 'Entregado', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, desc: '¡Buen provecho! Esperamos que disfrutes tu comida.' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle, desc: 'Lo sentimos, el pedido no pudo ser procesado.' },
};

const statusOrder = ['pending', 'confirmed', 'preparing', 'delivering', 'completed'];

export default function OrderTracker({ orderId, initialOrder }: { orderId: string | number, initialOrder: Order }) {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    const interval = setInterval(refreshOrder, 15000);
    return () => clearInterval(interval);
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          // Permitir si es admin real o si es el dueño del lugar
          const isOwner = data.user.id === order.places?.user_id;
          setIsAdmin(data.isAdmin || isOwner);
        }
      }
    } catch (err) {
      console.error("Auth check failed:", err);
    }
  };

  const refreshOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
      }
    } catch (err) {
      console.error("Refresh failed:", err);
    }
  };

  const updateStatus = async (newStatus: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
      }
    } catch (err) {
      console.error("Update failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const config = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  const currentStatusIndex = statusOrder.indexOf(order.status);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Card */}
      <div className="bg-white rounded-[32px] p-8 shadow-2xl shadow-slate-200/50 border border-slate-100">
        <div className="flex flex-col items-center text-center mb-10">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-xl ${config.color.replace('text-', 'shadow-').replace('100', '200')} ${config.color}`}>
            <StatusIcon size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
            Orden #{order.tracking_id || order.id}
          </h1>
          <p className="text-slate-500 font-medium max-w-xs leading-relaxed">
            {config.desc}
          </p>
        </div>

        {/* Progress Stepper */}
        <div className="relative flex justify-between mb-12 px-2">
          <div className="absolute top-5 left-10 right-10 h-0.5 bg-slate-100 -z-10"></div>
          <div
            className="absolute top-5 left-10 h-0.5 bg-emerald-500 transition-all duration-1000 -z-10"
            style={{ width: `${(Math.max(0, currentStatusIndex) / (statusOrder.length - 1)) * 90}%` }}
          ></div>

          {statusOrder.map((s, idx) => {
            const isActive = idx <= currentStatusIndex;
            const isCurrent = idx === currentStatusIndex;
            const SIcon = statusConfig[s as keyof typeof statusConfig]?.icon || Clock;

            return (
              <div key={s} className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${isCurrent ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' :
                  isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-white border-2 border-slate-100 text-slate-200'
                  }`}>
                  <SIcon size={18} />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-tighter ${isActive ? 'text-slate-900' : 'text-slate-300'
                  }`}>
                  {statusConfig[s as keyof typeof statusConfig]?.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Admin Controls */}
        {isAdmin && (
          <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-200/50">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest flex items-center gap-2">
              <User size={12} /> Panel de Control (Dueño)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(statusConfig).map(([val, cfg]) => (
                <button
                  key={val}
                  onClick={() => updateStatus(val)}
                  disabled={loading || order.status === val}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${order.status === val
                    ? `${cfg.color} border-current`
                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                    } disabled:opacity-50`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div className="flex items-center justify-between py-4 border-b border-slate-50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                <Receipt size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Restaurante</p>
                <p className="font-bold text-slate-900">{order.places?.name}</p>
              </div>
            </div>
            <a
              href={`/menus/${order.places?.short_name}`}
              className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <ExternalLink size={18} />
            </a>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
              <MapPin size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entrega en</p>
              <p className="font-bold text-slate-900">{order.delivery_address || 'Consumo Local'}</p>
              {order.delivery_colony && <p className="text-xs text-slate-500">{order.delivery_colony}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/40 border border-slate-100">
        <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
          <span className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xs">
            {order.items.reduce((acc, curr) => acc + curr.quantity, 0)}
          </span>
          Resumen del Pedido
        </h2>

        <div className="space-y-4 mb-8">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-4 p-3 hover:bg-slate-50 rounded-2xl transition-colors">
              {item.image && (
                <img src={item.image} className="w-14 h-14 object-cover rounded-xl shrink-0" alt="" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className="font-bold text-slate-900 leading-tight">
                    <span className="text-emerald-600 mr-1.5">{item.quantity}x</span>
                    {item.name}
                  </p>
                  <span className="font-black text-slate-900 ml-4">${item.price * item.quantity}</span>
                </div>
                {item.selectedOptions && (
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                    {Object.values(item.selectedOptions).join(' · ')}
                  </p>
                )}
                {item.notes && (
                  <p className="text-xs text-slate-500 italic mt-1 leading-snug">"{item.notes}"</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 rounded-3xl p-6 space-y-3">
          <div className="flex justify-between text-sm text-slate-500 font-medium">
            <span>Subtotal</span>
            <span>${order.subtotal}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-500 font-medium">
            <span>Envío</span>
            <span>${order.delivery_price}</span>
          </div>
          <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-xl font-black text-slate-900">
            <span>Total</span>
            <span>${order.total}</span>
          </div>
        </div>

        <div className={`mt-6 p-4 rounded-2xl flex items-center gap-3 ${order.payment_method === 'cash' ? 'bg-emerald-50 text-emerald-700' :
          order.payment_method === 'card' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
          }`}>
          {order.payment_method === 'cash' && <Coins size={20} />}
          {order.payment_method === 'card' && <CreditCard size={20} />}
          {order.payment_method === 'transfer' && <Landmark size={20} />}
          <span className="text-sm font-bold uppercase tracking-wide">
            Pago en {
              order.payment_method === 'cash' ? 'Efectivo' :
                order.payment_method === 'card' ? 'Tarjeta' : 'Transferencia'
            }
          </span>
        </div>
      </div>

      {/* Footer info/help (Admin only to contact customer) */}
      {isAdmin && (
        <div className="flex flex-col sm:flex-row gap-2">
          <a
            href={`tel:${order.customer_phone}`}
            className="flex-1 bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-center gap-3 text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Phone size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">Llamar Cliente</span>
          </a>
          <a
            href={`https://wa.me/52${order.customer_phone.replace(/\D/g, '')}`}
            className="flex-1 bg-emerald-500 text-white p-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
          >
            <MessageCircle size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">WhatsApp Cliente</span>
          </a>
        </div>
      )}

      <p className="text-center text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em] pt-8">
        BY BYSMAX · {new Date(order.created_at).toLocaleDateString()}
      </p>
    </div>
  );
}
