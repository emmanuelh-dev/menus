import React, { useState, useEffect } from "react";
import PlaceManager from "./PlaceManager";

import OnboardingFlow from "./OnboardingFlow";

interface DashboardData {
  user: any;
  isAdmin: boolean;
  places: any[];
  totalPlaces: number;
  recentComments: any[];
  history: any[];
}

export default function DashboardContainer() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Pagination and Filter states
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "updated">("newest");
  const [filterType, setFilterType] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
          search,
          sortBy,
          type: filterType
        });

        const response = await fetch(`/api/admin/dashboard-data?${params.toString()}`);
        if (response.status === 401) {
          // Redirigir silenciosamente sin mostrar pantalla de error
          window.location.href = "/admin/login";
          return;
        }
        if (!response.ok) {
          throw new Error("Cargando tu información...");
        }
        const result = await response.json();
        setData(result);

        // Si no hay lugares y no estamos buscando nada, activamos el onboarding
        if (result.totalPlaces === 0 && !search) {
          setShowOnboarding(true);
        }
      } catch (err: any) {
        // Ignorar errores de red temporales o de abort
        if (err.name !== 'AbortError') {
          // Si el mensaje es "Cargando...", lo tratamos como loading extendido
          if (err.message === "Cargando tu información...") {
            // No hacemos nada, dejamos el skeleton
          } else {
            setError(err.message);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchData, 300);
    return () => clearTimeout(debounce);
  }, [page, search, sortBy, filterType]);


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

  const places = data?.places || [];
  const isAdmin = data?.isAdmin || false;

  if (showOnboarding) {
    return <OnboardingFlow onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PlaceManager
        user={data?.user}
        isAdmin={data?.isAdmin}
        initialRestaurants={places}
        totalPlaces={data?.totalPlaces || 0}
        loading={loading}
        page={page}
        setPage={setPage}
        search={search}
        setSearch={setSearch}
        sortBy={sortBy}
        setSortBy={setSortBy}
        filterType={filterType}
        setFilterType={setFilterType}
        onStartOnboarding={() => setShowOnboarding(true)}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          <div className="h-32 bg-gray-100 rounded-xl"></div>
          <div className="h-32 bg-gray-100 rounded-xl"></div>
        </div>
      ) : places.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-10 text-center">
          <div className="w-12 h-12 bg-white border border-slate-200 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-sm">
            <span className="text-xl">✨</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            Comienza creando tu primer lugar
          </h2>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
            Registra tu establecimiento y sube tu menú para empezar a recibir
            pedidos por WhatsApp.
          </p>
          <button
            onClick={() => setShowOnboarding(true)}
            className="px-6 py-2 bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest"
          >
            Configuración Guiada
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/admin/comments"
            className="bg-white rounded-xl border border-slate-100 p-5 hover:border-slate-200 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:bg-emerald-50 transition-all">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-900 transition-colors">
                Gestionar →
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Reseñas y feedback
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Consulta los últimos comentarios y opiniones de tus clientes.
            </p>
          </a>

          {isAdmin && (
            <a
              href="/admin/history"
              className="bg-white rounded-xl border border-slate-100 p-5 hover:border-slate-200 transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-slate-900 group-hover:bg-slate-100 transition-all">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="size-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-900 transition-colors">
                  Auditar →
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                Historial de IA
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Control de versiones y registros de cambios generados por la
                IA.
              </p>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
