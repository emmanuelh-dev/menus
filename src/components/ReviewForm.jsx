import { useState, useEffect, useCallback, useMemo } from "react";
import { FaStar, FaRegStar, FaWhatsapp, FaCamera, FaReply } from "react-icons/fa";
import { supabase } from "../lib/supabase";
import { ManualUploader } from "./ManualUploader";

export default function ReviewForm({ restaurantName, id, initialReviews = [], isAdmin = false }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyText, setReplyText] = useState({});
  const [viewerImage, setViewerImage] = useState(null);

  console.log(id)

  const loadReviews = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("place_id", id)
      .order("created_at", { ascending: false });
    if (data) setReviews(data);
  }, [id]);

  useEffect(() => {
    loadReviews();
  }, [id, loadReviews]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!id) return;
    
    setIsSubmitting(true);
    const payload = {
      place_id: id,
      rate: rating,
      comment: comment.trim(),
      content: {
        author: { name: authorName || "Anónimo", whatsapp: whatsapp.replace(/\D/g, '') },
        images: images,
        device_id: typeof window !== 'undefined' ? localStorage.getItem('device_id') || 'anon-' + Math.random().toString(36).substring(7) : 'server'
      },
      status: 'approved'
    };
    const { error } = await supabase.from("reviews").insert([payload]);
    if (!error) {
      alert("✓ ¡Reseña publicada!");
      setRating(0); setComment(""); setImages([]);
      loadReviews();
    } else {
      console.error(error);
      alert("Error al publicar la reseña.");
    }
    setIsSubmitting(false);
  };

  // Función para responder (Lógica de Admin)
  const handleReply = async (reviewId) => {
    const review = reviews.find(r => r.id === reviewId);
    const updatedContent = {
      ...review.content,
      reply: {
        text: replyText[reviewId],
        admin_name: "Administrador",
        created_at: new Date().toISOString()
      }
    };

    const { error } = await supabase
      .from("reviews")
      .update({ content: updatedContent })
      .eq("id", reviewId);

    if (!error) {
      setReplyText({ ...replyText, [reviewId]: "" });
      loadReviews();
    }
  };

  if (!id) return null;

  return (
    <div className="space-y-12 max-w-4xl mx-auto pb-20">
      {/* Formulario de Reseña */}
      <form onSubmit={handleSubmit} className="bg-[#0c0c0c] p-8 rounded-[2.5rem] border border-white/10 shadow-2xl text-white">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <div className="size-2 bg-red-500 rounded-full animate-pulse"></div>
          TU EXPERIENCIA
        </h2>

        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} type="button" onClick={() => setRating(s)} className="text-4xl transition-all hover:scale-125">
              {rating >= s ? <FaStar className="text-amber-500" /> : <FaRegStar className="text-white/20" />}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input 
            placeholder="Tu Nombre" 
            value={authorName} 
            onChange={e => setAuthorName(e.target.value)} 
            className="p-4 bg-white/[0.03] rounded-2xl outline-none border border-white/10 focus:border-red-500/50 text-white placeholder:text-stone-500 transition-all" 
          />
          <input 
            placeholder="WhatsApp (opcional)" 
            value={whatsapp} 
            onChange={e => setWhatsapp(e.target.value)} 
            className="p-4 bg-white/[0.03] rounded-2xl outline-none border border-white/10 focus:border-red-500/50 text-white placeholder:text-stone-500 transition-all" 
          />
        </div>

        <textarea 
          placeholder="¿Qué tal estuvo la visita? Cuéntanos los detalles..." 
          value={comment} 
          onChange={e => setComment(e.target.value)} 
          className="w-full p-6 bg-white/[0.03] rounded-2xl h-40 mb-6 outline-none border border-white/10 focus:border-red-500/50 text-white placeholder:text-stone-500 resize-none transition-all" 
        />

        <div className="grid grid-cols-4 md:grid-cols-6 gap-3 mb-8">
          {images.map((img, idx) => (
            <div key={idx} className="relative aspect-square group">
              <img src={img} className="size-full object-cover rounded-2xl border border-white/10" />
              <button
                type="button"
                onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                className="absolute -top-2 -right-2 bg-red-600 text-white size-6 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
              >
                <span className="text-[10px] font-bold">✕</span>
              </button>
            </div>
          ))}
          <div className="col-span-2">
            <ManualUploader multiple onFilesUploaded={urls => setImages([...images, ...urls])} />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={rating === 0 || isSubmitting} 
          className="w-full bg-white text-black px-12 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] disabled:opacity-20 hover:bg-red-600 hover:text-white transition-all transform active:scale-[0.98] shadow-xl shadow-white/5"
        >
          {isSubmitting ? 'PUBLICANDO...' : 'PUBLICAR RESEÑA'}
        </button>
      </form>

      {/* Listado de Reseñas */}
      <div className="space-y-6">
        <h3 className="text-xs font-black uppercase tracking-[0.4em] text-stone-500 px-4 mb-4">Muro de Revoluciones ({reviews.length})</h3>
        
        {reviews.length === 0 && (
          <div className="text-center py-20 bg-[#0c0c0c] rounded-[2.5rem] border border-dashed border-white/10">
            <p className="text-stone-500 italic">Sé el primero en compartir tu experiencia...</p>
          </div>
        )}

        {reviews.map((rev) => (
          <div key={rev.id} className="bg-[#0c0c0c] p-8 rounded-[2.5rem] border border-white/10 shadow-sm group hover:bg-[#111] transition-all text-white">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-white font-black text-xl shadow-lg ring-4 ring-white/5">
                  {(rev.content?.author?.name || "A")[0].toUpperCase()}
                </div>
                <div>
                  <span className="block font-bold text-white text-lg">{rev.content?.author?.name || "Anónimo"}</span>
                  <div className="flex gap-0.5 text-amber-500 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <FaStar key={i} className={i < rev.rate ? "text-amber-500" : "text-white/10"} size={12} />
                    ))}
                  </div>
                </div>
              </div>
              <time className="text-[10px] text-stone-500 uppercase tracking-[0.2em] font-bold">
                {new Date(rev.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
              </time>
            </div>
            
            <p className="text-stone-300 leading-relaxed mb-6 text-base italic">"{rev.comment}"</p>

            {rev.content?.images?.length > 0 && (
              <div className="flex gap-3 mb-6 overflow-x-auto pb-4 scrollbar-hide">
                {rev.content.images.map((img, idx) => (
                  <div key={idx} className="relative group shrink-0">
                    <img
                      src={img}
                      onClick={() => setViewerImage(img)}
                      className="size-24 rounded-2xl object-cover ring-1 ring-white/10 cursor-pointer hover:ring-red-500 transition-all shadow-xl"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center pointer-events-none">
                      <FaCamera className="text-white size-6" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* MUESTRA LA RESPUESTA SI EXISTE */}
            {rev.content?.reply && (
              <div className="mt-8 p-6 bg-red-600/10 border-l-4 border-red-500 rounded-r-2xl relative ring-1 ring-white/5">
                <span className="absolute -top-3 left-4 bg-red-500 text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">STAFF RESPONSE</span>
                <p className="text-sm text-stone-200 leading-relaxed italic mt-2">"{rev.content.reply.text}"</p>
                <div className="flex items-center gap-2 mt-4">
                  <div className="size-1.5 bg-red-500 rounded-full"></div>
                  <p className="text-[10px] text-stone-500 uppercase font-bold tracking-widest">{rev.content.reply.admin_name}</p>
                </div>
              </div>
            )}

            {/* OPCIÓN DE RESPONDER (Visible solo para Admin) */}
            {isAdmin && (
              <div className="mt-8 flex gap-3 pt-6 border-t border-white/5">
                <input
                  value={replyText[rev.id] || ""}
                  onChange={e => setReplyText({ ...replyText, [rev.id]: e.target.value })}
                  placeholder="Responder como administrador..."
                  className="flex-1 bg-white/5 p-4 rounded-xl text-xs outline-none border border-white/10 focus:border-red-500/50 text-white placeholder:text-stone-600"
                />
                <button onClick={() => handleReply(rev.id)} className="bg-red-600 text-white px-6 rounded-xl hover:bg-red-500 transition-all font-bold">
                  <FaReply />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {viewerImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setViewerImage(null)}
        >
          <button
            onClick={() => setViewerImage(null)}
            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 transition-colors"
          >
            ×
          </button>
          <img
            src={viewerImage}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}