
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
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Actividad Reciente e IA</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lugar</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origen</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cambio / Razón</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
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
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.places?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.source.includes('quick_feed') ? 'bg-purple-100 text-purple-800' :
                      item.source === 'admin_rollback' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {item.source.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {item.agent_reasoning || item.version_label}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleRollback(item.id, item.place_id)}
                      disabled={isRollingBack === item.id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50 flex items-center gap-1 ml-auto"
                    >
                      {isRollingBack === item.id ? (
                        'Restaurando...'
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
