import { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle, Truck, XCircle, Phone, MapPin, Calendar, ExternalLink, Coins, CreditCard, Landmark, Plus } from 'lucide-react';
import WaiterMode from './WaiterMode';

interface Order {
  id: number;
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
}

const statusConfig = {
  pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  preparing: { label: 'Preparando', color: 'bg-indigo-100 text-indigo-700', icon: Package },
  delivering: { label: 'En camino', color: 'bg-purple-100 text-purple-700', icon: Truck },
  completed: { label: 'Completado', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function OrdersManager({ placeId }: { placeId: number }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWaiterMode, setShowWaiterMode] = useState(false);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000); // Auto refresh every 30s
    return () => clearInterval(interval);
  }, [placeId]);

  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/orders?place_id=${placeId}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      } else {
        const errData = await response.json();
        setError(errData.error || 'Error al cargar pedidos');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        fetchOrders();
      }
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Pedidos Recientes</h2>
          <p className="text-slate-500 text-sm">Gestiona los pedidos a domicilio de tu sucursal.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWaiterMode(true)}
            className="px-4 py-2 text-sm font-bold bg-slate-900 text-white rounded-lg hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-slate-100"
          >
            <Plus size={16} />
            Nueva Comanda
          </button>
          <button
            onClick={fetchOrders}
            className="px-4 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <Calendar size={16} />
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 font-medium text-sm">
          {error}
        </div>
      )}

      {orders.length === 0 && !error ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <p className="text-slate-400">No hay pedidos registrados aún.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {orders.map((order) => {
            const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;
            const StatusIcon = config.icon;
            return (
              <div key={order.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-100 rounded-xl">
                        <StatusIcon className="text-slate-600" size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">Pedido #{order.id}</h3>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
                            {config.label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">
                          {new Date(order.created_at).toLocaleString('es-MX', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        className="text-sm border-slate-200 rounded-lg focus:ring-black"
                      >
                        {Object.entries(statusConfig).map(([val, config]) => (
                          <option key={val} value={val}>{config.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5 mb-1.5">
                          <ExternalLink size={10} />
                          Cliente
                        </label>
                        <div className="flex items-center gap-3">
                          <p className="font-bold text-slate-900">{order.customer_name}</p>
                          <a
                            href={`https://wa.me/52${order.customer_phone.replace(/\D/g, '')}`}
                            target="_blank"
                            className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"
                          >
                            <Phone size={14} />
                          </a>
                        </div>
                        <p className="text-sm text-slate-500">{order.customer_phone}</p>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5 mb-1.5">
                          <MapPin size={10} />
                          S entrega
                        </label>
                        <p className="text-sm text-slate-700 font-medium">{order.delivery_address}</p>
                        {order.delivery_colony && (
                          <p className="text-xs text-slate-500">Colonia: {order.delivery_colony}</p>
                        )}
                      </div>

                      {order.notes && (
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-400 mb-1.5 block">Notas</label>
                          <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded-lg italic">"{order.notes}"</p>
                        </div>
                      )}

                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5 mb-1.5">
                          Metodo de Pago
                        </label>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          {order.payment_method === 'cash' && (
                            <>
                              <Coins size={16} className="text-emerald-500" />
                              Efectivo
                            </>
                          )}
                          {order.payment_method === 'card' && (
                            <>
                              <CreditCard size={16} className="text-blue-500" />
                              Tarjeta
                            </>
                          )}
                          {order.payment_method === 'transfer' && (
                            <>
                              <Landmark size={16} className="text-purple-500" />
                              Transferencia
                            </>
                          )}
                          {!order.payment_method && "No especificado"}
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4">
                      <label className="text-[10px] font-bold uppercase text-slate-400 mb-3 block">Artículos</label>
                      <div className="space-y-2 mb-4">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-slate-600">
                              <span className="font-bold text-slate-900">{item.quantity}x</span> {item.name}
                            </span>
                            <span className="font-medium text-slate-900">${item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-slate-200 pt-3 space-y-1">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Subtotal</span>
                          <span>${order.subtotal}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Envío</span>
                          <span>${order.delivery_price}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold text-slate-900 pt-1">
                          <span>Total</span>
                          <span>${order.total}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showWaiterMode && (
        <WaiterMode
          placeId={placeId}
          onClose={() => setShowWaiterMode(false)}
          onOrderCreated={fetchOrders}
        />
      )}
    </div>
  );
}
