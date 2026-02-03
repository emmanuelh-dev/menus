import { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle, Truck, XCircle, Phone, MapPin, Calendar, ExternalLink, Coins, CreditCard, Landmark, Plus, MessageCircle } from 'lucide-react';
import WaiterMode from './WaiterMode';
import AdminPageHeader from './AdminPageHeader';

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
  const [page, setPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [pageSize] = useState(50);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000); // Auto refresh every 30s
    return () => clearInterval(interval);
  }, [placeId, page]);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`/api/orders?place_id=${placeId}&page=${page}&pageSize=${pageSize}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setTotalOrders(data.totalOrders || 0);
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

  if (loading) return null;

  return (
    <div className="flex flex-col min-h-screen">
      <AdminPageHeader
        leftContent={
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-gray-900 flex items-center gap-2">
              Caja y Pedidos
              {!loading && <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full">{totalOrders}</span>}
            </h1>
            <p className="text-xs text-gray-500 font-medium">Control central de comandas y pedidos a domicilio.</p>
          </div>
        }
        rightContent={
          <div className="flex items-center gap-2">
            <a
              href={`/admin/place/${placeId}/comanda`}
              className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-gray-900 text-white rounded-xl hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-gray-200"
            >
              <Plus size={14} />
              Nueva Comanda
            </a>
            <button
              onClick={fetchOrders}
              className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2 text-gray-600"
            >
              <Calendar size={14} />
              Actualizar
            </button>
          </div>
        }
      />

      <div className="max-w-[1600px] mx-auto w-full p-4 md:p-8">

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
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="p-2 sm:p-3 bg-slate-100 rounded-xl">
                          <StatusIcon className="text-slate-600" size={20} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base sm:text-lg font-bold text-slate-900">Pedido #{order.id}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${config.color}`}>
                              {config.label}
                            </span>
                          </div>
                          <p className="text-[11px] sm:text-sm text-slate-500">
                            {new Date(order.created_at).toLocaleString('es-MX', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 ml-auto sm:ml-0">
                        {Object.entries(statusConfig).map(([val, config]) => {
                          const isActive = order.status === val;
                          return (
                            <button
                              key={val}
                              onClick={() => updateStatus(order.id, val)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isActive
                                ? `${config.color.replace('text-', 'border-').replace('100', '200')} ${config.color} shadow-sm scale-105`
                                : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50 hover:border-slate-200'
                                }`}
                            >
                              {config.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5 mb-1.5">
                            <ExternalLink size={10} />
                            Cliente
                          </label>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900">{order.customer_name}</p>
                            <div className="flex items-center gap-1.5 ml-2">
                              <a
                                href={`tel:${order.customer_phone.replace(/\D/g, '')}`}
                                className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                                title="Llamar por teléfono"
                              >
                                <Phone size={14} />
                              </a>
                              <a
                                href={`https://wa.me/52${order.customer_phone.replace(/\D/g, '')}`}
                                target="_blank"
                                className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                title="Enviar WhatsApp"
                              >
                                <MessageCircle size={14} />
                              </a>
                            </div>
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

                      <div className="bg-slate-50 rounded-2xl p-4 flex flex-col h-full">
                        <label className="text-[10px] font-bold uppercase text-slate-400 mb-3 block">Artículos</label>
                        <div className="space-y-2 mb-4 overflow-y-auto max-h-[220px] pr-2 custom-scrollbar flex-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm py-1 border-b border-slate-100 last:border-0">
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

        {Math.ceil(totalOrders / pageSize) > 1 && (
          <div className="mt-8 mb-12 flex items-center justify-center gap-2">
            <button
              disabled={page === 1 || loading}
              onClick={() => setPage(page - 1)}
              className="px-6 py-3 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              Anterior
            </button>
            <div className="flex items-center gap-1 px-4 text-[10px] font-black bg-white border border-gray-200 rounded-xl py-3">
              <span>{page}</span>
              <span className="text-gray-300">/</span>
              <span>{Math.ceil(totalOrders / pageSize)}</span>
            </div>
            <button
              disabled={page === Math.ceil(totalOrders / pageSize) || loading}
              onClick={() => setPage(page + 1)}
              className="px-6 py-3 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              Siguiente
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
