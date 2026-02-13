import React, { useEffect, useState } from "react";

interface Props {
  placeId: string;
}

interface InsightsData {
  place: {
    id: number;
    name: string;
    location: string;
  };
  visits: {
    today: { total: number; unique: number };
    yesterday: { total: number; unique: number };
    week: { total: number; unique: number };
  };
  rating: {
    average: number;
    totalReviews: number;
  };
  recentComments: Array<{
    id: string;
    created_at: string;
    rate: number;
    name: string;
    comment: string;
  }>;
}

function MetricCard({ label, total, unique }: { label: string; total: number; unique: number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-900">{total}</p>
      <p className="mt-1 text-sm text-slate-500">Visitas únicas: <span className="font-semibold text-slate-700">{unique}</span></p>
    </div>
  );
}

export default function PlaceInsightsContainer({ placeId }: Props) {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const response = await fetch(`/api/admin/place/${placeId}/insights`);
        if (response.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        if (!response.ok) {
          throw new Error("No se pudo cargar analíticas del restaurante");
        }
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err?.message || "No se pudo cargar analíticas del restaurante");
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [placeId]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 animate-pulse">
        <div className="h-8 w-64 bg-gray-100 rounded mb-6"></div>
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <div className="h-28 bg-gray-100 rounded-2xl"></div>
          <div className="h-28 bg-gray-100 rounded-2xl"></div>
          <div className="h-28 bg-gray-100 rounded-2xl"></div>
        </div>
        <div className="h-64 bg-gray-100 rounded-2xl"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-red-50 border border-red-100 rounded-3xl text-red-600 m-8">
        <h2 className="text-lg font-bold mb-2">Error</h2>
        <p>{error || "No se pudieron cargar las analíticas"}</p>
      </div>
    );
  }

  const { place, visits, rating, recentComments } = data;

  return (
    <div className="xl:p-4 lg:p-8">
      <div className="mb-6 p-4">
        <h1 className="text-2xl font-bold text-slate-900">{place.name}</h1>
        <p className="text-sm text-slate-500 mt-1">{place.location || "Analíticas del restaurante"}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 px-4 mb-8">
        <MetricCard label="Hoy" total={visits.today.total} unique={visits.today.unique} />
        <MetricCard label="Ayer" total={visits.yesterday.total} unique={visits.yesterday.unique} />
        <MetricCard label="Últimos 7 días" total={visits.week.total} unique={visits.week.unique} />
      </div>

      <div className="px-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Estrellas</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{rating.average.toFixed(1)}</p>
          </div>
          <p className="text-sm text-slate-500">Total de reseñas: <span className="font-semibold text-slate-700">{rating.totalReviews}</span></p>
        </div>
      </div>

      <div className="px-4 pb-8">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Comentarios recientes</h2>

          {recentComments.length === 0 ? (
            <p className="text-slate-400 italic py-8 text-center">No hay comentarios recientes.</p>
          ) : (
            <div className="space-y-3">
              {recentComments.map((comment) => (
                <div key={comment.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/60">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="text-sm font-semibold text-slate-800">{comment.name || "Cliente"}</div>
                    <div className="text-xs text-slate-500">{new Date(comment.created_at).toLocaleDateString("es-MX")}</div>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-2">{comment.rate || 0} estrellas</div>
                  <p className="text-sm text-slate-700">{comment.comment || "Sin comentario"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
