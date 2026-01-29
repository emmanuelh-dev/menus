import React, { useState, useEffect } from "react";
import PlaceManager from "./PlaceManager";
import HistoryManager from "./HistoryManager";

interface DashboardData {
  user: any;
  isAdmin: boolean;
  places: any[];
  recentComments: any[];
  history: any[];
}

export default function DashboardContainer() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/admin/dashboard-data");
        if (response.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        if (!response.ok) {
          throw new Error("Error al cargar los datos");
        }
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 pb-20 animate-pulse">
        <div className="h-64 bg-slate-100 rounded-3xl" />
        <div className="h-96 bg-slate-100 rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 border border-red-100 rounded-3xl text-red-600">
        <h2 className="text-lg font-bold mb-2">Error</h2>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { isAdmin, places, recentComments, history } = data;

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PlaceManager initialRestaurants={places || []} />

      {places && places.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <span className="text-2xl">✨</span>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-2">
            Comienza creando tu primer lugar
          </h2>
          <p className="text-slate-500 font-medium max-w-sm mx-auto mb-8">
            Registra tu establecimiento y sube tu menú para empezar a recibir
            pedidos por WhatsApp.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {isAdmin && (
            <div>
              <HistoryManager initialHistory={history || []} />
            </div>
          )}

          {recentComments && recentComments.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm max-w-2xl">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Actividad Reciente
              </h2>
              <ul className="space-y-4">
                {recentComments.slice(0, 5).map((comment, idx) => (
                  <li key={comment.id || idx} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tight">
                      <span className="text-emerald-600">
                        {comment.places?.name}
                      </span>
                      <span className="text-slate-300">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-700 leading-snug">
                      "{comment.comment}"
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
