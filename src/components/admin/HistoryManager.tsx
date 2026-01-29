
import React, { useState } from 'react';

interface HistoryItem {
  id: string;
  place_id: number;
  created_at: string;
  source: string;
  agent_reasoning: string;
  version_label: string;
  places: {
    name: string;
  };
}

export default function HistoryManager({ initialHistory }: { initialHistory: HistoryItem[] }) {
  const [history, setHistory] = useState(initialHistory);
  const [isRollingBack, setIsRollingBack] = useState<string | null>(null);

  const handleRollback = async (historyId: string, placeId: number) => {
    if (!confirm('¿Estás seguro de que quieres restaurar esta versión? Se sobrescribirá el contenido actual.')) {
      return;
    }

    setIsRollingBack(historyId);
    try {
      const response = await fetch('/api/admin/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId, historyId })
      });

      if (response.ok) {
        alert('✓ Versión restaurada correctamente.');
        window.location.reload();
      } else {
        alert('Error al restaurar la versión.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al intentar restaurar.');
    } finally {
      setIsRollingBack(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3">
        <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Actividad Reciente e IA</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Lugar</th>
              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha</th>
              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Origen</th>
              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Cambio / Razón</th>
              <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {history.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                  No hay historial de cambios aún.
                </td>
              </tr>
            ) : (
              history.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-all border-b border-slate-50 last:border-0 group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-black uppercase tracking-tight text-slate-900">{item.places?.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-500">
                    {new Date(item.created_at).toLocaleDateString()} <br />
                    <span className="opacity-50 text-[10px]">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${item.source.includes('quick_feed') ? 'bg-indigo-50 text-indigo-600' :
                        item.source === 'admin_rollback' ? 'bg-orange-50 text-orange-600' :
                          'bg-slate-100 text-slate-600'
                      }`}>
                      {item.source.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700">
                    <div className="max-w-xs md:max-w-md">
                      {item.agent_reasoning ? (
                        <div className="flex items-start gap-2">
                          <span className="text-emerald-500 animate-pulse mt-0.5"></span>
                          <span className="leading-snug">{item.agent_reasoning}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Sin descripción detallada</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleRollback(item.id, item.place_id)}
                      disabled={isRollingBack === item.id}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all disabled:opacity-50 shadow-sm shadow-slate-900/5 active:scale-95"
                    >
                      {isRollingBack === item.id ? (
                        'Wait...'
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                          Rollback
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
