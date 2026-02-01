import React, { useState, useEffect } from "react";
import ContentEditor from "./ContentEditor";
import { formater } from "../../types/app";

interface PlaceData {
  place: any;
  reviews: any[];
  isAdmin: boolean;
}

export default function PlaceEditContainer({ placeId }: { placeId: string }) {
  const [data, setData] = useState<PlaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/admin/place/${placeId}`);
        if (response.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        if (!response.ok) {
          throw new Error("Error al cargar los datos del establecimiento");
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
  }, [placeId]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 animate-pulse">
        <div className="mb-6">
          <div className="h-4 w-24 bg-gray-100 rounded mb-4"></div>
          <div className="h-8 w-64 bg-gray-100 rounded"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[600px] bg-gray-100 rounded-xl"></div>
          <div className="space-y-4">
            <div className="h-48 bg-gray-100 rounded-xl"></div>
            <div className="h-64 bg-gray-100 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-red-50 border border-red-100 rounded-3xl text-red-600 m-8">
        <h2 className="text-lg font-bold mb-2">Error</h2>
        <p>{error || "No se pudo cargar la información"}</p>
        <a href="/admin/dashboard" className="mt-4 inline-block text-sm font-bold underline">
          Volver al Dashboard
        </a>
      </div>
    );
  }

  const { place, reviews } = data;

  return (
    <div className="xl:p-4 lg:p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <a href="/admin/dashboard" className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors">
            ← Dashboard
          </a>
          <a
            href={
              place.type === "motel" && place.states?.slug
                ? `/moteles/estados/${place.states.slug}/${place.short_name}`
                : `/${formater[place.type] || place.type}/${place.short_name}`
            }
            target="_blank"
            className="text-xs font-bold text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            Ver sitio público
          </a>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          {place.name}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="xl:bg-white rounded-xl xl:border xl:border-slate-100 xl:overflow-hidden xl:shadow-sm">
            <ContentEditor
              placeId={place.id}
              initialContent={place.content}
              placeType={place.type}
              placeData={place}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 border border-slate-100">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">
              Información general
            </h2>
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-slate-400 font-medium text-[11px] block mb-0.5">
                  Categoría
                </span>
                <p className="font-semibold text-slate-900 capitalize italic">{place.type}</p>
              </div>
              {place.states && (
                <div>
                  <span className="text-slate-400 font-medium text-[11px] block mb-0.5">
                    Ubicación
                  </span>
                  <p className="font-semibold text-slate-900">{place.states.name}</p>
                </div>
              )}
              <div>
                <span className="text-slate-400 font-medium text-[11px] block mb-0.5">
                  Dirección
                </span>
                <p className="font-medium text-slate-500 leading-relaxed text-[11px]">{place.address}</p>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-slate-50 mt-2">
                <div className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                  <span>★</span> {place.rating}
                </div>
                <span className="text-slate-400 font-medium text-[10px]">Rating promedio</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Reseñas recientes
              </h2>
              <a href="/admin/comments" className="text-[10px] font-bold text-slate-400 hover:text-slate-900 transition-colors">
                Ver todas
              </a>
            </div>
            <div className="space-y-4">
              {reviews && reviews.length > 0 ? (
                reviews.slice(0, 3).map((rev) => (
                  <div key={rev.id} className="pb-4 last:pb-0 last:border-0 border-b border-slate-50">
                    <p className="text-[11px] text-slate-600 mb-2 leading-relaxed italic">
                      "{rev.comment}"
                    </p>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-medium text-slate-300">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex text-amber-300">
                        {"★".repeat(rev.rate)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-300 text-[11px] py-1">Sin reseñas aún.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
