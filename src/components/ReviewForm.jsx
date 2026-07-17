import { useState, useEffect, useCallback, useMemo } from "react";
import { FaStar, FaRegStar, FaWhatsapp, FaCamera, FaReply } from "react-icons/fa";
import { supabase } from "../lib/supabase";
import { getReviews } from "../lib/api";
import { ManualUploader } from "./ManualUploader";

/**
 * @param {object} props
 * @param {string} [props.restaurantName]
 * @param {number|string} props.id
 * @param {any[]} [props.initialReviews]
 * @param {boolean} [props.isAdmin]
 */
export default function ReviewForm({ restaurantName, id, initialReviews = [], isAdmin = false }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [images, setImages] = useState(/** @type {any[]} */ ([]));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyText, setReplyText] = useState({});
  const [viewerImage, setViewerImage] = useState(null);

  console.log(id)

  const loadReviews = useCallback(async () => {
    if (!id) return;
    const data = await getReviews(id, 100);
    setReviews(data);
  }, [id]);

  useEffect(() => {
    loadReviews();

    // Cargar datos desde localStorage (Sistema compartido con CartManager)
    const storedName = localStorage.getItem('customer_name');
    const storedEmail = localStorage.getItem('customer_email');
    const storedPhone = localStorage.getItem('customer_phone');
    if (storedName) setAuthorName(storedName);
    if (storedEmail) setAuthorEmail(storedEmail);
    if (storedPhone) setWhatsapp(storedPhone);
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
        author: {
          name: authorName || "Anónimo",
          email: authorEmail,
          whatsapp: whatsapp.replace(/\D/g, '')
        },
        images: images,
        device_id: typeof window !== 'undefined' ? localStorage.getItem('device_id') || 'anon-' + Math.random().toString(36).substring(7) : 'server'
      },
      status: 'approved'
    };
    const { data: responseData, error } = await fetch('/api/restaurants/submit-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(res => res.json().then(data => ({ data, error: !res.ok })));

    if (!error) {
      alert("✓ ¡Reseña publicada!");

      // Guardar datos en localStorage para futuras visitas (Sincronizado con CartManager)
      if (authorName) localStorage.setItem('customer_name', authorName);
      if (authorEmail) localStorage.setItem('customer_email', authorEmail);
      if (whatsapp) localStorage.setItem('customer_phone', whatsapp);

      setRating(0); setComment(""); setImages([]);
      loadReviews();
    } else {
      console.error(responseData.error);
      alert("Error al publicar la reseña: " + (responseData.error || "Error desconocido"));
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
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      {/* Formulario de Reseña */}
      <form onSubmit={handleSubmit} className="bg-[#0c0c0c] p-5 md:p-6 rounded-2xl shadow-xl border border-white/5 text-white">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <div className="size-1.5 bg-red-500 rounded-full animate-pulse"></div>
          COMPARTE TU EXPERIENCIA
        </h2>

        <div className="flex gap-1.5 mb-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} type="button" onClick={() => setRating(s)} className="text-3xl transition-all hover:scale-110">
              {rating >= s ? <FaStar className="text-amber-500" /> : <FaRegStar className="text-white/10" />}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input
            placeholder="Tu Nombre"
            value={authorName}
            onChange={e => setAuthorName(e.target.value)}
            className="p-3 bg-white/[0.03] border border-white/5 rounded-xl outline-none focus:bg-white/[0.06] focus:ring-1 focus:ring-red-500/50 text-xs text-white placeholder:text-stone-500 transition-all"
          />
          <input
            type="email"
            placeholder="Tu Email *"
            value={authorEmail}
            onChange={e => setAuthorEmail(e.target.value)}
            required
            className="p-3 bg-white/[0.03] border border-white/5 rounded-xl outline-none focus:bg-white/[0.06] focus:ring-1 focus:ring-red-500/50 text-xs text-white placeholder:text-stone-500 transition-all"
          />
        </div>
        <div className="mb-3">
          <input
            placeholder="WhatsApp (opcional)"
            value={whatsapp}
            onChange={e => setWhatsapp(e.target.value)}
            className="w-full p-3 bg-white/[0.03] border border-white/5 rounded-xl outline-none focus:bg-white/[0.06] focus:ring-1 focus:ring-red-500/50 text-xs text-white placeholder:text-stone-500 transition-all"
          />
        </div>

        <textarea
          placeholder="¿Qué tal estuvo la visita? Cuéntanos..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          className="w-full p-4 bg-white/[0.03] border border-white/5 rounded-xl h-24 mb-4 outline-none focus:bg-white/[0.06] focus:ring-1 focus:ring-red-500/50 text-xs text-white placeholder:text-stone-500 resize-none transition-all"
        />

        <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mb-4">
          {images.map((img, idx) => (
            <div key={idx} className="relative aspect-square group">
              <img src={img} className="size-full object-cover rounded-xl" />
              <button
                type="button"
                onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                className="absolute -top-1.5 -right-1.5 bg-red-600 text-white size-5 rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform"
              >
                <span className="text-[9px] font-bold">✕</span>
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
          className="w-full bg-white text-black px-6 py-3 rounded-xl font-bold uppercase text-[10px] tracking-wider disabled:opacity-20 hover:bg-red-600 hover:text-white transition-all shadow-md active:scale-95"
        >
          {isSubmitting ? 'PUBLICANDO...' : 'PUBLICAR RESEÑA'}
        </button>
      </form>

      {/* Listado de Reseñas */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-500 px-2">Muro de Revoluciones ({reviews.length})</h3>

        {reviews.length === 0 && (
          <div className="text-center py-10 bg-[#0c0c0c] border border-white/5 rounded-2xl">
            <p className="text-stone-500 text-xs italic">Sé el primero en compartir tu experiencia...</p>
          </div>
        )}

        {reviews.map((rev) => (
          <div key={rev.id} className="bg-[#0c0c0c]/80 border border-white/5 p-5 rounded-2xl shadow-sm hover:bg-[#111] transition-all text-white">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-white font-black text-sm ring-2 ring-white/5">
                  {(rev.content?.author?.name || "A")[0].toUpperCase()}
                </div>
                <div>
                  <span className="block font-bold text-white text-sm leading-tight">{rev.content?.author?.name || "Anónimo"}</span>
                  <div className="flex gap-0.5 text-amber-500 mt-0.5">
                    {[...Array(5)].map((_, i) => (
                      <FaStar key={i} className={i < rev.rate ? "text-amber-500" : "text-white/10"} size={9} />
                    ))}
                  </div>
                </div>
              </div>
              <time className="text-[9px] text-stone-500 uppercase tracking-widest font-semibold">
                {new Date(rev.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
              </time>
            </div>

            <p className="text-stone-300 leading-relaxed mb-3 text-xs italic">"{rev.comment}"</p>

            {rev.content?.images?.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-none">
                {rev.content.images.map((img, idx) => (
                  <div key={idx} className="relative group shrink-0">
                    <img
                      src={img}
                      onClick={() => setViewerImage(img)}
                      className="size-16 rounded-xl object-cover cursor-pointer hover:ring-1 hover:ring-red-500 transition-all shadow-md"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center pointer-events-none">
                      <FaCamera className="text-white size-4" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* MUESTRA LA RESPUESTA SI EXISTE */}
            {rev.content?.reply && (
              <div className="mt-3 p-4 bg-red-600/5 border-l-2 border-red-500 rounded-r-xl relative ring-1 ring-white/5">
                <span className="text-[8px] font-black text-red-400 uppercase tracking-widest block mb-1">STAFF RESPONSE</span>
                <p className="text-xs text-stone-300 leading-relaxed italic">"{rev.content.reply.text}"</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="size-1 bg-red-500 rounded-full"></div>
                  <p className="text-[9px] text-stone-500 uppercase font-bold tracking-widest">{rev.content.reply.admin_name}</p>
                </div>
              </div>
            )}

            {/* OPCIÓN DE RESPONDER (Visible solo para Admin) */}
            {isAdmin && (
              <div className="mt-4 flex gap-2 pt-4 border-t border-white/5">
                <input
                  value={replyText[rev.id] || ""}
                  onChange={e => setReplyText({ ...replyText, [rev.id]: e.target.value })}
                  placeholder="Responder como administrador..."
                  className="flex-1 bg-white/5 p-3 rounded-lg text-xs outline-none focus:ring-1 focus:ring-red-500/50 text-white placeholder:text-stone-600"
                />
                <button onClick={() => handleReply(rev.id)} className="bg-red-600 text-white px-4 rounded-lg hover:bg-red-500 transition-all font-bold text-xs">
                  <FaReply size={10} />
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