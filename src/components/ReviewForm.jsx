import { useState, useEffect, useRef } from "react";
import { FaStar, FaRegStar, FaComment } from "react-icons/fa";
import { supabase } from "../lib/supabase";

export default function ReviewForm({ restaurantName, path }) {
  const [reviews, setReviews] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState(null);
  const reviewsRef = useRef(null);

  useEffect(() => {
    const getRestaurant = async () => {
      // Normalizar el path para manejar rutas con o sin barra diagonal al final
      const normalizedPath = path.endsWith('/') ? path : path + '/';
      const pathWithoutSlash = path.endsWith('/') ? path.slice(0, -1) : path;
      
      // Buscar el restaurante con ambas versiones del path (con y sin barra diagonal)
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .or(`menu.eq.${normalizedPath},menu.eq.${pathWithoutSlash}`);
        
      // Si hay un error en la consulta OR, intentar con consultas individuales
      if (error) {
        console.error("Error en consulta OR:", error);
        
        // Intentar primero con el path normalizado
        const { data: dataWithSlash, error: errorWithSlash } = await supabase
          .from("restaurants")
          .select("*")
          .eq("menu", normalizedPath);
          
        if (!errorWithSlash && dataWithSlash && dataWithSlash.length > 0) {
          return { data: dataWithSlash, error: null };
        }
        
        // Si no hay resultados, intentar con el path sin barra diagonal
        const { data: dataWithoutSlash, error: errorWithoutSlash } = await supabase
          .from("restaurants")
          .select("*")
          .eq("menu", pathWithoutSlash);
          
        if (!errorWithoutSlash && dataWithoutSlash && dataWithoutSlash.length > 0) {
          return { data: dataWithoutSlash, error: null };
        }
        
        // Si ambas consultas fallan, devolver el error original
        return { data: null, error };
      }
        
      if (error) {
        console.error("Error al cargar el restaurante:", error);
        setError("Error al cargar el restaurante");
        return;
      }
      
      // Si encontramos el restaurante, lo establecemos en el estado
      if (data && data.length > 0) {
        setRestaurant(data[0]);
        return;
      }
      
      // Si no existe el restaurante, lo creamos automáticamente
      try {
        const { data: newRestaurant, error: createError } = await supabase
          .from("restaurants")
          .insert([{
            name: restaurantName,
            menu: path,
          }])
          .select();
          
        if (createError) {
          console.error("Error al crear el restaurante:", createError);
          setError("Error al crear el restaurante");
          return;
        }
        
        console.log("Restaurante creado automáticamente:", newRestaurant[0]);
        setRestaurant(newRestaurant[0]);
      } catch (err) {
        console.error("Error inesperado al crear el restaurante:", err);
        setError("Error inesperado al crear el restaurante");
      }
    };

    getRestaurant();
  }, [restaurantName, path]);

  useEffect(() => {
    const loadReviews = async () => {
      if (!restaurant || !restaurant.id) return;
      
      const { data, error } = await supabase
        .from("review")
        .select("rate, comment, created_at")
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error al cargar reseñas:", error);
        setError("Error al cargar reseñas");
      } else {

        setReviews(
          data.map((review) => ({
            rating: review.rate,
            comment: review.comment,
            created_at: review.created_at,
            restaurant_id: restaurant.id,
          }))
        );
      }
    };

    loadReviews();
  }, [restaurant]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (rating === 0 || !comment.trim()) {
      setError("Por favor completa todos los campos");
      return;
    }

    const { data, error } = await supabase
      .from("review")
      .insert([
        {
          rate: rating,
          comment: comment.trim(),
          restaurant: restaurantName,
          restaurant_id: restaurant.id,
        },
      ])
      .select();

    if (error) {
      console.error("Error al insertar la reseña:", error);
      setError("Error al enviar la reseña");
    } else {
      // Añadir la nueva reseña al estado local
      const newReview = {
        rating: data[0].rate,
        comment: data[0].comment,
        created_at: data[0].created_at,
        restaurant_id: restaurant.id
      };
      
      // Actualizar el estado de reseñas con la nueva reseña
      const updatedReviews = [newReview, ...reviews];
      setReviews(updatedReviews);
      
      // Calcular el nuevo promedio de calificaciones
      const totalRating = updatedReviews.reduce((sum, review) => sum + review.rating, 0);
      const newAverageRating = totalRating / updatedReviews.length;
      
      // Actualizar la columna rating en la tabla restaurants
      try {
        const { error: updateError } = await supabase
          .from("restaurants")
          .update({ rating: newAverageRating.toFixed(1) })
          .eq("id", restaurant.id);
          
        if (updateError) {
          console.error("Error al actualizar la calificación del restaurante:", updateError);
        } else {
          console.log("Calificación del restaurante actualizada:", newAverageRating.toFixed(1));
        }
      } catch (updateErr) {
        console.error("Error inesperado al actualizar la calificación:", updateErr);
      }
      
      // Limpiar el formulario
      setRating(0);
      setComment("");
    }
  };

  const averageRating =
    reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length || 0;

  const scrollToReviews = () => {
    reviewsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!restaurant) {
    return (
      <div className="p-4 text-center">
        <div className="animate-pulse">
          <p className="text-gray-600 mb-2">Preparando el sistema de reseñas...</p>
          <p className="text-sm text-gray-500">Estamos configurando este restaurante para recibir reseñas.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold mb-4" id="comment">
        Deja tu reseña para {restaurantName}
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-black"
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

      <div className="mt-8" ref={reviewsRef}>
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
                <p>{review.comment}</p>
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
    </>
  );
}
