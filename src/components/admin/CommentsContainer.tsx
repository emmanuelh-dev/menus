import React, { useState, useEffect } from "react";

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  places: {
    name: string;
  };
}

export default function CommentsContainer() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await fetch("/api/admin/dashboard-data");
        if (response.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        if (!response.ok) throw new Error("Error fetching data");
        const data = await response.json();
        setComments(data.recentComments || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchComments();
  }, []);

  if (loading) return <div className="p-8 animate-pulse bg-white rounded-3xl h-96" />;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
      <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white  shadow-emerald-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        Comentarios y Reseñas
      </h1>

      <div className="space-y-6">
        {comments.length === 0 ? (
          <p className="text-slate-400 italic text-center py-20">No hay comentarios aún.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="group p-6 rounded-2xl border border-slate-50 hover:border-slate-100 hover:bg-slate-50/50 transition-all">
              <div className="flex items-center justify-between mb-3 font-black uppercase tracking-widest text-[10px]">
                <span className="text-emerald-600 px-2 py-1 bg-emerald-50 rounded-lg">{comment.places?.name}</span>
                <span className="text-slate-300">
                  {new Date(comment.created_at).toLocaleDateString()} - {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-base font-medium text-slate-700 leading-relaxed italic">
                "{comment.comment}"
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
