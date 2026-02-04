import { useState, useEffect, useMemo } from 'react';
import {
  Coins,
  CreditCard,
  Landmark,
  TrendingUp,
  History,
  Lock,
  Unlock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Hash,
  ArrowRight,
  Download,
  DollarSign
} from 'lucide-react';

interface Order {
  id: number;
  total: number;
  payment_method?: 'cash' | 'card' | 'transfer';
  status: string;
  created_at: string;
}

interface CashSession {
  id: string;
  opened_at: string;
  closed_at?: string;
  opening_balance: number;
  expected_balance?: number;
  actual_balance?: number;
  status: 'open' | 'closed';
  notes?: string;
}

export default function CashControl({ placeId, initialContent }: { placeId: number, initialContent: any }) {
  const [session, setSession] = useState<CashSession | null>(initialContent?.pos_config?.current_session || null);
  const [history, setHistory] = useState<CashSession[]>(initialContent?.pos_config?.sessions_history || []);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingModal, setOpeningModal] = useState(false);
  const [closingModal, setClosingModal] = useState(false);
  const [openingBalanceInput, setOpeningBalanceInput] = useState<number>(0);
  const [actualBalanceInput, setActualBalanceInput] = useState<number>(0);

  useEffect(() => {
    fetchOrders();
  }, [placeId, session]);

  const fetchOrders = async () => {
    if (!session) return;
    try {
      const response = await fetch(`/api/orders?place_id=${placeId}&status=completed&pageSize=1000`);
      if (response.ok) {
        const data = await response.json();
        const filtered = data.orders.filter((o: Order) =>
          new Date(o.created_at) >= new Date(session.opened_at)
        );
        setOrders(filtered);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const totals = useMemo(() => {
    const res = { cash: 0, card: 0, transfer: 0, total: 0 };
    orders.forEach(o => {
      if (o.payment_method === 'cash') res.cash += o.total;
      else if (o.payment_method === 'card') res.card += o.total;
      else if (o.payment_method === 'transfer') res.transfer += o.total;
      res.total += o.total;
    });
    return res;
  }, [orders]);

  const saveToConfig = async (current: CashSession | null, sessionsHistory: CashSession[]) => {
    setLoading(true);
    try {
      const newContent = {
        ...initialContent,
        pos_config: {
          ...initialContent?.pos_config,
          current_session: current,
          sessions_history: sessionsHistory
        }
      };

      await fetch(`/api/restaurants/${placeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent })
      });

      // Update local state
      setSession(current);
      setHistory(sessionsHistory);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenShift = () => {
    const newSession: CashSession = {
      id: `session-${Date.now()}`,
      opened_at: new Date().toISOString(),
      opening_balance: openingBalanceInput,
      status: 'open'
    };
    saveToConfig(newSession, history);
    setOpeningModal(false);
  };

  const handleCloseShift = () => {
    if (!session) return;
    const closedSession: CashSession = {
      ...session,
      closed_at: new Date().toISOString(),
      expected_balance: session.opening_balance + totals.cash,
      actual_balance: actualBalanceInput,
      status: 'closed'
    };
    saveToConfig(null, [closedSession, ...history.slice(0, 19)]); // Keep last 20
    setClosingModal(false);
    setOrders([]);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
              <Coins className="text-slate-400" />
              Arqueos y Cierres
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Control de flujo de caja y turnos operativos.</p>
          </div>

          <div className="flex items-center gap-3">
            {session ? (
              <button
                onClick={() => {
                  setActualBalanceInput(session.opening_balance + totals.cash);
                  setClosingModal(true);
                }}
                className="px-6 py-3 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-700 transition-all flex items-center gap-2 shadow-xl shadow-red-100"
              >
                <Lock size={14} />
                Cerrar Turno / Caja
              </button>
            ) : (
              <button
                onClick={() => setOpeningModal(true)}
                className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-xl shadow-slate-200"
              >
                <Unlock size={14} />
                Abrir Turno / Caja
              </button>
            )}
          </div>
        </div>

        {session ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Active Session Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fondo Inicial</span>
                <span className="text-2xl font-black text-slate-900">${session.opening_balance.toFixed(2)}</span>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ventas Efectivo</span>
                <span className="text-2xl font-black text-emerald-600">${totals.cash.toFixed(2)}</span>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total en Caja</span>
                <span className="text-2xl font-black text-slate-900">${(session.opening_balance + totals.cash).toFixed(2)}</span>
              </div>
              <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl shadow-slate-200 flex flex-col gap-1 text-white">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Global</span>
                <span className="text-2xl font-black">${(session.opening_balance + totals.total).toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Métodos de Pago</h3>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <Calendar size={12} />
                      Desde: {new Date(session.opened_at).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                          <Coins size={24} />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 uppercase text-xs tracking-tight">Efectivo</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Cash in drawer</p>
                        </div>
                      </div>
                      <span className="text-xl font-black text-slate-900">${totals.cash.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                          <CreditCard size={24} />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 uppercase text-xs tracking-tight">Tarjeta Decor</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Visa / Mastercard</p>
                        </div>
                      </div>
                      <span className="text-xl font-black text-slate-900">${totals.card.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
                          <Landmark size={24} />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 uppercase text-xs tracking-tight">Transferencia</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Spei / CoDi</p>
                        </div>
                      </div>
                      <span className="text-xl font-black text-slate-900">${totals.transfer.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm h-full">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Actividad Reciente</h3>
                  <div className="space-y-4">
                    {orders.slice(0, 5).map(o => (
                      <div key={o.id} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                            {o.payment_method === 'cash' ? <Coins size={14} /> : o.payment_method === 'card' ? <CreditCard size={14} /> : <Landmark size={14} />}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">#{o.id}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(o.created_at).toLocaleTimeString()}</p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-slate-900">${o.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mb-6">
              <Lock size={40} />
            </div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Caja Cerrada</h2>
            <p className="text-sm text-slate-400 mt-2 mb-8 max-w-xs text-center font-medium">No hay un turno activo. Abre la caja para comenzar a registrar ventas.</p>
            <button
              onClick={() => setOpeningModal(true)}
              className="px-10 py-4 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-2xl shadow-slate-200 flex items-center gap-3"
            >
              <Unlock size={16} />
              Iniciar Nuevo Turno
            </button>
          </div>
        )}

        {/* History Section */}
        <div className="mt-16">
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 mb-6">
            <History className="text-slate-300" />
            Historial de Cierres
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {history.map((h, idx) => (
              <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-slate-300 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {new Date(h.closed_at!).toLocaleDateString()}
                      </p>
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">
                        Turno {idx + 1}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Cierre Real</p>
                    <p className="text-lg font-black text-slate-900">${h.actual_balance?.toFixed(2)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Diferencia</p>
                    <p className={`text-xs font-black ${(h.actual_balance! - h.expected_balance!) === 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      ${(h.actual_balance! - h.expected_balance!).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <button className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 flex items-center gap-1 ml-auto">
                      Ver PDF <Download size={10} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Opening Modal */}
      {openingModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-slate-50 text-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Unlock size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Abrir Caja</h3>
            <p className="text-sm text-slate-400 font-medium mb-8">Ingresa el fondo inicial (cambio) para este turno.</p>

            <div className="space-y-4">
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="number"
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-900 rounded-2xl text-xl font-black outline-none transition-all"
                  placeholder="0.00"
                  value={openingBalanceInput}
                  onChange={(e) => setOpeningBalanceInput(Number(e.target.value))}
                />
              </div>
              <button
                onClick={handleOpenShift}
                disabled={loading}
                className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center justify-center gap-3 mt-4"
              >
                Confirmar Apertura
                <ArrowRight size={16} />
              </button>
              <button onClick={() => setOpeningModal(false)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 pt-4">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Closing Modal */}
      {closingModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Lock size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2 text-center">Cierre de Caja</h3>
            <p className="text-sm text-slate-400 font-medium mb-8 text-center">Cuenta el efectivo real en caja y compáralo con el sistema.</p>

            <div className="space-y-6">
              <div className="p-6 bg-slate-50 rounded-3xl space-y-3">
                <div className="flex justify-between items-center text-xs font-bold uppercase text-slate-400">
                  <span>Esperado (Fondo + Efvo)</span>
                  <span className="text-slate-900">${(session!.opening_balance + totals.cash).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold uppercase text-slate-400">
                  <span>Tarjetas / Transf</span>
                  <span className="text-slate-900">${(totals.card + totals.transfer).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Efectivo Real Contado:</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="number"
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-900 rounded-3xl text-xl font-black outline-none transition-all"
                    placeholder="0.00"
                    value={actualBalanceInput}
                    onChange={(e) => setActualBalanceInput(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button
                  onClick={handleCloseShift}
                  disabled={loading}
                  className="w-full py-5 bg-red-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-red-100 hover:bg-red-700 transition-all flex items-center justify-center gap-3"
                >
                  Confirmar Arqueo y Cierre
                  <ArrowRight size={16} />
                </button>
                <button onClick={() => setClosingModal(false)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 py-2 text-center">Volver</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
