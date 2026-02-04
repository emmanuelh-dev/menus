import { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, Edit2, Grid, Layers, Save, CheckCircle, Table as TableIcon, User } from 'lucide-react';

interface Table {
  id: string;
  name: string;
  capacity?: number;
  x?: number;
  y?: number;
  status: 'available' | 'occupied' | 'dirty' | 'reserved';
}

interface POSConfig {
  tables: Table[];
}

export default function TableManager({ placeId, initialContent }: { placeId: number, initialContent: any }) {
  const [tables, setTables] = useState<Table[]>(initialContent?.pos_config?.tables || []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const addTable = () => {
    const newId = `t-${Date.now()}`;
    const newTable: Table = {
      id: newId,
      name: `Mesa ${tables.length + 1}`,
      capacity: 4,
      status: 'available',
      x: 0,
      y: 0
    };
    setTables([...tables, newTable]);
  };

  const removeTable = (id: string) => {
    setTables(tables.filter(t => t.id !== id));
  };

  const updateTable = (id: string, updates: Partial<Table>) => {
    setTables(tables.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const newContent = {
        ...initialContent,
        pos_config: {
          ...initialContent?.pos_config,
          tables
        }
      };

      const response = await fetch(`/api/restaurants/${placeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent })
      });

      if (response.ok) {
        setMessage('Configuración guardada correctamente');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (e) {
      console.error(e);
      setMessage('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
      <div className="p-8 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
              <Grid className="text-slate-400" />
              Diseño de Mesas
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Define el plano y las mesas de tu establecimiento.</p>
          </div>

          <div className="flex items-center gap-3">
            {message && (
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs bg-emerald-50 px-4 py-2 rounded-full animate-in fade-in slide-in-from-right-4">
                <CheckCircle size={14} />
                {message}
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-xl shadow-slate-200 disabled:bg-slate-300"
            >
              <Save size={14} />
              {saving ? 'Guardando...' : 'Guardar Plano'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 sm:p-10 min-h-[500px] relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>

              <div className="relative grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {tables.map(table => (
                  <div
                    key={table.id}
                    className="group bg-white border-2 border-slate-100 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 hover:border-slate-900 hover:shadow-2xl hover:shadow-slate-200 transition-all cursor-pointer relative"
                  >
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                      <TableIcon size={24} />
                    </div>

                    <div className="text-center">
                      <input
                        value={table.name}
                        onChange={(e) => updateTable(table.id, { name: e.target.value })}
                        className="bg-transparent text-sm font-black text-center w-full focus:outline-none uppercase tracking-tight"
                        placeholder="Nombre de Mesa"
                      />
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <button
                          onClick={() => updateTable(table.id, { capacity: Math.max(1, (table.capacity || 1) - 1) })}
                          className="w-5 h-5 flex items-center justify-center bg-slate-50 rounded-md text-slate-400 hover:bg-slate-900 hover:text-white transition-all"
                        >
                          <Minus size={10} />
                        </button>
                        <div className="flex items-center gap-1">
                          <User size={10} className="text-slate-300" />
                          <span className="text-[10px] font-black text-slate-900">{table.capacity}</span>
                        </div>
                        <button
                          onClick={() => updateTable(table.id, { capacity: (table.capacity || 0) + 1 })}
                          className="w-5 h-5 flex items-center justify-center bg-slate-50 rounded-md text-slate-400 hover:bg-slate-900 hover:text-white transition-all"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => removeTable(table.id)}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-white border border-slate-100 text-red-500 rounded-full shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                <button
                  onClick={addTable}
                  className="border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 hover:border-slate-900 hover:bg-slate-50/50 transition-all text-slate-300 hover:text-slate-900"
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-current">
                    <Plus size={24} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Añadir Mesa</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 px-1">Resumen de Capacidad</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <span className="text-xs font-bold text-slate-500 uppercase">Total de Mesas</span>
                  <span className="text-lg font-black text-slate-900">{tables.length}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <span className="text-xs font-bold text-slate-500 uppercase">Capacidad Total</span>
                  <span className="text-lg font-black text-slate-900">
                    {tables.reduce((acc, t) => acc + (t.capacity || 0), 0)} personas
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[2rem] p-8 text-white">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">¿Cómo funciona?</h3>
              <p className="text-xs font-medium leading-relaxed text-slate-300">
                Las mesas definidas aquí aparecerán automáticamente en tu panel de comandas y POS.
                Podrás asignar pedidos a mesas específicas y realizar cobros por mesa.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                  Control de estado en tiempo real
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                  Historial de ventas por mesa
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                  Asignación rápida de meseros
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
