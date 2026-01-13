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
      .from("review_moteles")
      .select("*")
      .eq("motel_id", id)
      .order("created_at", { ascending: false });
    if (data) setReviews(data);
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!id) return;
    
    setIsSubmitting(true);
    const payload = {
      motel_id: id,
      rate: rating,
      comment: comment.trim(),
      content: {
        author: { name: authorName || "Anónimo", whatsapp: whatsapp.replace(/\D/g, '') },
        images: images,
        device_id: localStorage.getItem('device_id') || 'anon-123'
      },
      status: 'approved'
    };
    const { error } = await supabase.from("review_moteles").insert([payload]);
    if (!error) {
      alert("Reseña publicada.");
      setRating(0); setComment(""); setImages([]);
      loadReviews();
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
      .from("review_moteles")
      .update({ content: updatedContent })
      .eq("id", reviewId);

    if (!error) {
      setReplyText({ ...replyText, [reviewId]: "" });
      loadReviews();
    }
  };

  if (!id) return null;

  return (
    <div className="space-y-12 max-w-4xl mx-auto">
      {/* Formulario de Reseña */}
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
        <h2 className="text-2xl font-black uppercase italic mb-6 tracking-tighter">Tu opinión importa</h2>
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} type="button" onClick={() => setRating(s)} className="text-3xl transition-transform hover:scale-110">
              {rating >= s ? <FaStar className="text-red-600" /> : <FaRegStar className="text-gray-200" />}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input placeholder="Nombre" value={authorName} onChange={e => setAuthorName(e.target.value)} className="p-4 bg-gray-50 rounded-2xl outline-none border border-transparent focus:border-black" />
          <input placeholder="WhatsApp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="p-4 bg-gray-50 rounded-2xl outline-none border border-transparent focus:border-black" />
        </div>
        <textarea placeholder="Cuéntanos los detalles..." value={comment} onChange={e => setComment(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl h-32 mb-4 outline-none border border-transparent focus:border-black resize-none" />

        <div className="grid grid-cols-4 md:grid-cols-6 gap-3 mb-6">
          {images.map((img, idx) => (
            <div key={idx} className="relative aspect-square group">
              <img src={img} className="size-full object-cover rounded-2xl border border-gray-100" />
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

        <button type="submit" disabled={rating === 0 || isSubmitting} className="w-full bg-black text-white px-12 py-4 rounded-full font-bold uppercase text-[10px] tracking-[0.2em] disabled:opacity-20">
          Publicar
        </button>
      </form>

      {/* Listado de Reseñas */}
      <div className="space-y-8">
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 px-4">Feed de experiencias</h3>
        {reviews.map((rev) => (
          <div key={rev.id} className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="block font-bold text-black text-lg">{rev.content?.author?.name || "Anónimo"}</span>
                <span className="text-red-600 text-xs">{'★'.repeat(rev.rate)}</span>
              </div>
              <time className="text-[10px] text-gray-400 uppercase tracking-widest">
                {new Date(rev.created_at).toLocaleDateString()}
              </time>
            </div>
            <p className="text-stone-600 leading-relaxed mb-4">{rev.comment}</p>

            {rev.content?.images?.length > 0 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {rev.content.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    onClick={() => setViewerImage(img)}
                    className="size-20 rounded-xl object-cover ring-1 ring-gray-100 cursor-pointer hover:ring-2 hover:ring-red-600 transition-all"
                  />
                ))}
              </div>
            )}

            {/* MUESTRA LA RESPUESTA SI EXISTE */}
            {rev.content?.reply && (
              <div className="mt-6 ml-4 md:ml-10 p-5 bg-stone-50 border-l-4 border-red-600 rounded-r-2xl relative">
                <span className="absolute -top-3 left-4 bg-red-600 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-tighter">Staff Reply</span>
                <p className="text-sm text-stone-800 italic">"{rev.content.reply.text}"</p>
                <p className="text-[9px] text-stone-400 mt-2 uppercase font-bold">— {rev.content.reply.admin_name}</p>
              </div>
            )}

            {/* OPCIÓN DE RESPONDER (Visible solo para Admin) */}
            <div className="mt-4 flex gap-2">
              <input
                value={replyText[rev.id] || ""}
                onChange={e => setReplyText({ ...replyText, [rev.id]: e.target.value })}
                placeholder="Escribe una respuesta..."
                className="flex-1 bg-gray-50 p-2 rounded-lg text-xs outline-none border focus:border-red-600"
              />
              <button onClick={() => handleReply(rev.id)} className="bg-red-600 text-white p-2 rounded-lg"><FaReply /></button>
            </div>
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