import { useState, useEffect } from 'react';
import {
  Table as TableIcon,
  Clock,
  CheckCircle,
  DollarSign,
  CreditCard,
  Coins,
  Landmark,
  ArrowRight,
  Plus,
  RefreshCw,
  LayoutGrid
} from 'lucide-react';

interface Table {
  id: string;
  name: string;
  capacity?: number;
  status: 'available' | 'occupied' | 'dirty' | 'reserved';
}

interface Order {
  id: number;
  customer_name: string;
  delivery_address: string;
  items: any[];
  total: number;
  status: string;
  created_at: string;
}

export default function TablePOS({ placeId }: { placeId: number }) {
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [placeId]);

  const fetchData = async () => {
    try {
      const [placeRes, ordersRes] = await Promise.all([
        fetch(`/api/admin/place/${placeId}`),
        fetch(`/api/orders?place_id=${placeId}&status=pending,confirmed,preparing,delivering`)
      ]);

      if (placeRes.ok) {
        const placeData = await placeRes.json();
        setTables(placeData.place?.content?.pos_config?.tables || []);
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getTableOrder = (tableName: string) => {
    return orders.find(o => o.delivery_address === `Mesa ${tableName}`);
  };

  const closeOrder = async (orderId: number, method: string) => {
    setIsClosing(true);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          payment_method: method
        })
      });

      if (response.ok) {
        fetchData();
        setSelectedTable(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsClosing(false);
    }
  };

  if (loading) return null;

  const activeOrder = selectedTable ? getTableOrder(selectedTable.name) : null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
              Punto de Venta (POS)
              <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full">EN VIVO</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Gestión de mesas y cobros rápidos.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 transition-all"
            >
              <RefreshCw size={16} />
            </button>
            <a
              href={`/admin/place/${placeId}/arqueo`}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 transition-all"
              title="Arqueo"
            >
              <Coins size={16} />
            </a>
            <a
              href={`/admin/place/${placeId}/comanda`}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-xl shadow-slate-200"
            >
              <Plus size={14} />
              Nueva Orden
            </a>
          </div>
        </div>

        {tables.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <LayoutGrid className="mx-auto text-slate-200 mb-4" size={48} />
            <h3 className="text-lg font-bold text-slate-400">No hay mesas definidas</h3>
            <p className="text-sm text-slate-400 mb-6">Configura tu plano de mesas para empezar.</p>
            <a href={`/admin/place/${placeId}/mesas`}>
              <button className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">
                Configurar Mesas
              </button>
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {tables.map(table => {
              const order = getTableOrder(table.name);
              const isOccupied = !!order;

              return (
                <button
                  key={table.id}
                  onClick={() => setSelectedTable(table)}
                  className={`relative group p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center justify-center gap-4 text-center ${isOccupied
                    ? 'border-emerald-500 bg-emerald-50 shadow-xl shadow-emerald-100 scale-105 z-10'
                    : 'border-white bg-white hover:border-slate-900 hover:shadow-2xl hover:shadow-slate-200'
                    }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isOccupied ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-300 group-hover:bg-slate-900 group-hover:text-white'
                    }`}>
                    <TableIcon size={28} />
                  </div>

                  <div>
                    <h3 className={`font-black uppercase tracking-tight text-sm ${isOccupied ? 'text-emerald-900' : 'text-slate-900'}`}>
                      {table.name}
                    </h3>
                    {isOccupied ? (
                      <div className="mt-1 flex flex-col items-center">
                        <span className="text-[10px] font-black text-emerald-600">${order.total.toFixed(2)}</span>
                        <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 uppercase mt-1">
                          <Clock size={8} />
                          Activa
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Libre</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Checkout Sidebar/Overlay */}
      {selectedTable && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/20 backdrop-blur-sm animate-in fade-in duration-300">
          <div
            className="absolute inset-0"
            onClick={() => setSelectedTable(null)}
          ></div>

          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{selectedTable.name}</h2>
                  <p className="text-xs font-medium text-slate-400">Detalle de la cuenta actual</p>
                </div>
                <button
                  onClick={() => setSelectedTable(null)}
                  className="w-10 h-10 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-all"
                >
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {activeOrder ? (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300">Resumen de Consumo</h4>
                    <div className="space-y-3">
                      {activeOrder.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start">
                          <div className="flex gap-3">
                            <span className="font-bold text-slate-400">{item.quantity}x</span>
                            <div>
                              <p className="text-sm font-bold text-slate-800 leading-none">{item.name}</p>
                              {item.selectedOptions && (
                                <p className="text-[10px] text-slate-400 mt-1">{Object.values(item.selectedOptions).join(', ')}</p>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-black text-slate-900">${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-slate-400 italic">Total a pagar</span>
                      <span className="text-4xl font-black text-slate-900 tracking-tighter">${activeOrder.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300">Método de Pago</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => closeOrder(activeOrder.id, 'cash')}
                        disabled={isClosing}
                        className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border-2 border-slate-50 bg-slate-50 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition-all group"
                      >
                        <Coins size={24} className="text-slate-400 group-hover:text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Efectivo</span>
                      </button>
                      <button
                        onClick={() => closeOrder(activeOrder.id, 'card')}
                        disabled={isClosing}
                        className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border-2 border-slate-50 bg-slate-50 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-all group"
                      >
                        <CreditCard size={24} className="text-slate-400 group-hover:text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Tarjeta</span>
                      </button>
                    </div>
                    <button
                      onClick={() => closeOrder(activeOrder.id, 'transfer')}
                      disabled={isClosing}
                      className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl border border-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all"
                    >
                      <Landmark size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Transferencia</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mb-6">
                    <TableIcon size={40} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Mesa Disponible</h3>
                  <p className="text-sm text-slate-400 mt-2">No hay comandas activas para esta mesa en este momento.</p>
                  <a
                    href={`/admin/place/${placeId}/comanda?table=${selectedTable.name}`}
                    className="mt-8 w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all"
                  >
                    Abrir Comanda
                  </a>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setSelectedTable(null)}
                className="w-full py-4 bg-white border border-slate-200 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:text-slate-900 transition-all"
              >
                Regresar al Plano
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
