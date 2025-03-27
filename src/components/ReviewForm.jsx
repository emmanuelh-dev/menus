import { useState, useEffect } from "react";
import { FaStar, FaRegStar } from "react-icons/fa";
import { supabase } from "../lib/supabase"; 

export default function ReviewForm({ restaurantName }) {
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState(null);

  // Cargar reseñas existentes filtrando por restaurante
  useEffect(() => {
    const loadReviews = async () => {
      const { data, error } = await supabase
        .from("review")
        .select("Calificacion, Reseña, created_at")
        .eq("restaurant", restaurantName) // Filtramos por el nombre del restaurante
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error al cargar reseñas:", error);
        setError("Error al cargar reseñas");
      } else {
        // Mapeamos los datos de la base de datos a nuestro formato
        setReviews(
          data.map((review) => ({
            rating: review.Calificacion,
            comment: review.Reseña,
            created_at: review.created_at,
          }))
        );
      }
    };

    loadReviews();
  }, [restaurantName]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validar que se haya seleccionado una calificación y escrito un comentario
    if (rating === 0 || !comment.trim()) {
      setError("Por favor completa todos los campos");
      return;
    }

    // Inserción en Supabase
    const { data, error } = await supabase
      .from("review")
      .insert([
        {
          Calificacion: rating,
          Reseña: comment.trim(),
          restaurant: restaurantName, // Guarda también a qué restaurante pertenece
        },
      ])
      .select();

    if (error) {
      console.error("Error al insertar la reseña:", error);
      setError("Error al enviar la reseña");
    } else {
      // Actualizar el estado local con la nueva reseña
      const newReview = {
        rating: data[0].Calificacion,
        comment: data[0].Reseña,
        created_at: data[0].created_at,
      };
      setReviews([newReview, ...reviews]);
      setRating(0);
      setComment("");
    }
  };

  // Cálculo de la calificación promedio (opcional)
  const averageRating =
    reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length || 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">
        Deja tu reseña de {restaurantName}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Calificación (1 a 5 estrellas)
          </label>
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="text-2xl focus:outline-none transition-colors"
                aria-label={`${star} estrella${star !== 1 ? "s" : ""}`}
              >
                {star <= (hoverRating || rating) ? (
                  <FaStar className="text-yellow-500" />
                ) : (
                  <FaRegStar className="text-gray-300 hover:text-yellow-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Comentario
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Escribe tu reseña..."
            rows="4"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          />
        </div>

        {error && <div className="text-red-500 text-sm">{error}</div>}

        <button
          type="submit"
          disabled={rating === 0 || !comment.trim()}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Enviar reseña
        </button>
      </form>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Reseñas anteriores</h3>

        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review, index) => (
              <div key={index} className="border-b pb-4">
                <div className="flex items-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <span key={i}>
                      {i < review.rating ? (
                        <FaStar className="text-yellow-500" />
                      ) : (
                        <FaRegStar className="text-gray-300" />
                      )}
                    </span>
                  ))}
                  {review.created_at && (
                    <span className="ml-2 text-xs text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-gray-700">{review.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No hay reseñas aún</p>
        )}

        <div className="mt-6">
          <h4 className="font-medium">Calificación promedio:</h4>
          <div className="flex items-center mt-1">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <span key={i}>
                  {i < Math.round(averageRating) ? (
                    <FaStar className="text-yellow-500" />
                  ) : (
                    <FaRegStar className="text-gray-300" />
                  )}
                </span>
              ))}
            </div>
            <span className="ml-2 text-gray-600">
              ({averageRating.toFixed(1)} de 5)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
