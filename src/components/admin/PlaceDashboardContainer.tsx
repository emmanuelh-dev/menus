import React, { useEffect, useMemo, useState } from "react";
import QRDownloadButton from "./QRDownloadButton";

interface Props {
  placeId: string;
}

interface DashboardData {
  place: {
    id: number;
    name: string;
    location: string;
    short_name?: string;
    publicPath?: string;
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

function MetricCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-gray-900">{value}</p>
      {detail && <p className="mt-1 text-xs font-medium text-gray-500">{detail}</p>}
    </div>
  );
}

export default function PlaceDashboardContainer({ placeId }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const buildPublicPath = (place: any) => {
      const menuPath = String(place?.menu || "").trim();
      if (
        menuPath &&
        menuPath !== "/" &&
        menuPath !== "/tienda" &&
        menuPath !== "/menus"
      ) return menuPath;

      if (menuPath === "/tienda") {
        return `/tienda/${place?.short_name || ""}`;
      }

      if (place?.type === "motel" && place?.states?.slug) {
        return `/moteles/estados/${place.states.slug}/${place.short_name}`;
      }
      return `/menus/${place?.short_name || ""}`;
    };

    const fetchDashboard = async () => {
      try {
        const response = await fetch(`/api/admin/place/${placeId}/insights`);
        if (response.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        if (response.ok) {
          const result = await response.json();
          setData(result);
          return;
        }

        let fallbackVisits = {
          today: { total: 0, unique: 0 },
          yesterday: { total: 0, unique: 0 },
          week: { total: 0, unique: 0 }
        };

        try {
          const dashboardResponse = await fetch('/api/admin/dashboard-data?page=1&pageSize=1&sortBy=updated');
          if (dashboardResponse.ok) {
            const dashboardData = await dashboardResponse.json();
            const match = (dashboardData?.placeVisitStats || []).find((entry: any) => String(entry.placeId) === String(placeId));
            if (match) {
              fallbackVisits = {
                today: { total: Number(match.todayVisits || 0), unique: Number(match.todayVisits || 0) },
                yesterday: { total: 0, unique: 0 },
                week: { total: Number(match.weekVisits || 0), unique: Number(match.weekUniqueVisitors || 0) }
              };
            }
          }
        } catch (_dashboardAnalyticsError) {
          fallbackVisits = {
            today: { total: 0, unique: 0 },
            yesterday: { total: 0, unique: 0 },
            week: { total: 0, unique: 0 }
          };
        }

        const fallbackResponse = await fetch(`/api/admin/place/${placeId}`);
        if (fallbackResponse.status === 401) {
          window.location.href = "/admin/login";
          return;
        }

        if (!fallbackResponse.ok) {
          throw new Error("No se pudo cargar el dashboard del restaurante");
        }

        const fallback = await fallbackResponse.json();
        const place = fallback?.place || {};
        const rates = (fallback?.reviews || [])
          .map((review: any) => Number(review?.rate || 0))
          .filter((rate: number) => rate > 0);
        const totalReviews = rates.length;
        const average = totalReviews > 0
          ? Number((rates.reduce((sum: number, rate: number) => sum + rate, 0) / totalReviews).toFixed(1))
          : 0;

        setData({
          place: {
            id: Number(place.id || placeId),
            name: place.name || `Restaurante ${placeId}`,
            location: [place.city || "", place.state || place?.states?.name || ""].filter(Boolean).join(", "),
            short_name: place.short_name,
            publicPath: buildPublicPath(place)
          },
          visits: fallbackVisits,
          rating: {
            average,
            totalReviews
          },
          recentComments: (fallback?.reviews || []).slice(0, 20).map((review: any) => ({
            id: review.id,
            created_at: review.created_at,
            rate: review.rate,
            name: review.name,
            comment: review.comments || review.comment || ""
          }))
        });
      } catch (err: any) {
        setError(err?.message || "No se pudo cargar el dashboard del restaurante");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [placeId]);

  const publicUrl = useMemo(() => {
    if (!data?.place?.publicPath) return "";
    if (typeof window === "undefined") return data.place.publicPath;
    return `${window.location.origin}${data.place.publicPath}`;
  }, [data]);

  const copyPublicUrl = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
    } catch (copyError) {
      console.error("No se pudo copiar URL", copyError);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 animate-pulse">
        <div className="h-8 w-56 bg-gray-100 rounded mb-6"></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="h-24 bg-gray-100 rounded-2xl"></div>
          <div className="h-24 bg-gray-100 rounded-2xl"></div>
          <div className="h-24 bg-gray-100 rounded-2xl"></div>
          <div className="h-24 bg-gray-100 rounded-2xl"></div>
        </div>
        <div className="h-52 bg-gray-100 rounded-2xl"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-red-50 border border-red-100 rounded-3xl text-red-600 m-8">
        <h2 className="text-lg font-bold mb-2">Error</h2>
        <p>{error || "No se pudo cargar el dashboard"}</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">{data.place.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{data.place.location || "Dashboard del restaurante"}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {publicUrl && (
              <>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors"
                >
                  Ver público
                </a>
                <button
                  type="button"
                  onClick={copyPublicUrl}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors"
                >
                  Copiar URL
                </button>
                <QRDownloadButton
                  url={publicUrl}
                  restaurantName={data.place.name}
                  size="md"
                  variant="outline"
                />
              </>
            )}
            <a
              href={`/admin/place/${placeId}/settings`}
              className="px-3 py-2 rounded-xl border border-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors"
            >
              Configuración
            </a>
          </div>
        </div>

        {publicUrl && (
          <div className="mt-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">URL pública</p>
            <p className="text-sm font-semibold text-blue-600 break-all mt-1">{publicUrl}</p>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Visitas hoy" value={String(data.visits.today.total)} detail={`Únicos: ${data.visits.today.unique}`} />
        <MetricCard label="Visitas ayer" value={String(data.visits.yesterday.total)} detail={`Únicos: ${data.visits.yesterday.unique}`} />
        <MetricCard label="Últimos 7 días" value={String(data.visits.week.total)} detail={`Únicos: ${data.visits.week.unique}`} />
        <MetricCard label="Rating" value={data.rating.average.toFixed(1)} detail={`${data.rating.totalReviews} reseñas`} />
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Comentarios recientes</h2>
        {data.recentComments.length === 0 ? (
          <p className="text-sm text-gray-500">No hay comentarios todavía.</p>
        ) : (
          <div className="space-y-3">
            {data.recentComments.slice(0, 8).map((comment) => (
              <div key={comment.id} className="rounded-xl border border-gray-100 p-3 bg-gray-50/70">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-bold text-gray-800">{comment.name || "Cliente"}</p>
                  <p className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleDateString("es-MX")}</p>
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-amber-600 mb-1">{comment.rate || 0} estrellas</p>
                <p className="text-sm text-gray-700">{comment.comment || "Sin comentario"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
