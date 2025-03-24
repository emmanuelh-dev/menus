import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { createReview, getRestaurantReviews } from '../lib/supabase-schema';
import type { Review } from '../lib/supabase-schema';

interface ReviewSystemProps {
  restaurantId: number;
}

export default function ReviewSystem({ restaurantId }: ReviewSystemProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchReviews();
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchReviews = async () => {
    const { data, error } = await getRestaurantReviews(restaurantId);
    if (error) {
      console.error('Error fetching reviews:', error);
      return;
    }
    setReviews(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Debes iniciar sesión para dejar una reseña');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await createReview({
        restaurant_id: restaurantId,
        user_id: user.id,
        rating,
        comment
      });

      if (error) throw error;

      setRating(0);
      setComment('');
      fetchReviews();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 bg-white rounded-xl p-6 shadow-md">
      <h2 className="text-2xl font-serif font-bold text-[#3A2E27] mb-6">Reseñas y Calificaciones</h2>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tu Calificación
            </label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tu Comentario
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#A67C52]"
              rows={3}
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-[#A67C52] text-white rounded-md hover:bg-[#8C5E3B] transition-colors disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar Reseña'}
          </button>
        </form>
      ) : (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600">
            Debes <a href="/login" className="text-[#A67C52] hover:text-[#8C5E3B] font-medium">iniciar sesión</a> para dejar una reseña
          </p>
        </div>
      )}

      <div className="space-y-6">
        {reviews.map((review) => (
          <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-yellow-400 text-lg">
                  {'★'.repeat(review.rating)}
                  <span className="text-gray-300">
                    {'★'.repeat(5 - review.rating)}
                  </span>
                </span>
                <span className="text-sm text-gray-600">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>
              <span className="text-sm text-gray-500">
                {review.users?.email}
              </span>
            </div>
            <p className="text-gray-700">{review.comment}</p>
          </div>
        ))}

        {reviews.length === 0 && (
          <p className="text-center text-gray-600">
            No hay reseñas todavía. ¡Sé el primero en dejar una!
          </p>
        )}
      </div>
    </div>
  );
}