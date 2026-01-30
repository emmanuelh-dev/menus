import React, { useState, useEffect } from "react";
import HistoryManager from "./HistoryManager";

export default function HistoryContainer() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch("/api/admin/dashboard-data");
        if (response.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        if (!response.ok) throw new Error("Error fetching data");
        const data = await response.json();
        setHistory(data.history || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <div className="p-8 animate-pulse bg-white rounded-3xl h-96" />;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
          <svg xmlns="http://www.w3.org/2000/svg" className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Historial de Cambios</h1>
          <p className="text-slate-500 font-medium text-sm">Control de versiones y registros de la IA</p>
        </div>
      </div>
      <HistoryManager initialHistory={history} />
    </div>
  );
}
