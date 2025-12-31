import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { FaStar, FaRegStar } from "react-icons/fa";
import { supabase } from "../lib/supabase";

const STAR_COUNT = 5;
const DEFAULT_MENU = "campomar";

export default function ReviewForm({ restaurantName, path }) {
  const [reviews, setReviews] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reviewsRef = useRef(null);

  const menu = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname.split('/').pop() || DEFAULT_MENU;
    }
    return path?.split('/').pop() || DEFAULT_MENU;
  }, [path]);

  const findOrCreateRestaurant = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("places")
        .select("*")
        .eq("menu", short_name)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setRestaurant(data);
        return;
      }

      const { data: newRestaurant, error: createError } = await supabase
        .from("places")
        .insert([{
          name: restaurantName || menu,
          short_name: menu,
        }])
        .select()
        .single();

      if (createError) throw createError;

      setRestaurant(newRestaurant);
    } catch (err) {
      console.error("Restaurant operation failed:", err);
      setError("Failed to load restaurant data");
    }
  }, [menu, restaurantName]);

  const loadReviews = useCallback(async () => {
    if (!restaurant?.id) return;

    try {
      const { data, error } = await supabase
        .from("review")
        .select("rate, comment, created_at")
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mappedReviews = data.map(review => ({
        rating: review.rate,
        comment: review.comment,
        created_at: review.created_at,
        restaurant_id: restaurant.id,
      }));

      setReviews(mappedReviews);
    } catch (err) {
      console.error("Failed to load reviews:", err);
      setError("Failed to load reviews");
    }
  }, [restaurant?.id]);

  const updateRestaurantRating = useCallback(async (newReviews) => {
    if (!restaurant?.id || newReviews.length === 0) return;

    const totalRating = newReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = (totalRating / newReviews.length).toFixed(1);

    try {
      const { error } = await supabase
        .from("places")
        .update({ rating: averageRating })
        .eq("id", restaurant.id);

      if (error) throw error;
    } catch (err) {
      console.error("Failed to update restaurant rating:", err);
    }
  }, [restaurant?.id]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (rating === 0 || !comment.trim()) {
      setError("Please complete all fields");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("review")
        .insert([{
          rate: rating,
          comment: comment.trim(),
          restaurant: restaurant.name,
          restaurant_id: restaurant.id,
        }])
        .select()
        .single();

      if (error) throw error;

      const newReview = {
        rating: data.rate,
        comment: data.comment,
        created_at: data.created_at,
        restaurant_id: restaurant.id
      };

      const updatedReviews = [newReview, ...reviews];
      setReviews(updatedReviews);
      
      await updateRestaurantRating(updatedReviews);

      setRating(0);
      setComment("");
    } catch (err) {
      console.error("Failed to submit review:", err);
      setError("Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  }, [rating, comment, restaurant, reviews, updateRestaurantRating]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  }, [reviews]);

  const isFormValid = rating > 0 && comment.trim().length > 0;

  useEffect(() => {
    findOrCreateRestaurant();
  }, [findOrCreateRestaurant]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const renderStars = useCallback((count, interactive = false) => {
    return Array.from({ length: STAR_COUNT }, (_, index) => {
      const starNumber = index + 1;
      const isActive = starNumber <= count;
      
      return (
        <button
          key={starNumber}
          type="button"
          {...(interactive && {
            onClick: () => setRating(starNumber),
            onMouseEnter: () => setHoverRating(starNumber),
            onMouseLeave: () => setHoverRating(0),
          })}
          className={`text-2xl transition-colors ${
            interactive ? 'focus:outline-none hover:scale-110' : ''
          }`}
          aria-label={`${starNumber} star${starNumber !== 1 ? 's' : ''}`}
          disabled={!interactive}
        >
          {isActive ? (
            <FaStar className="text-yellow-500" />
          ) : (
            <FaRegStar className={interactive ? "text-gray-300 hover:text-yellow-400" : "text-gray-300"} />
          )}
        </button>
      );
    });
  }, []);

  if (!restaurant) {
    return (
      <div className="p-4 text-center">
        <div className="animate-pulse">
          <p className="text-gray-600 mb-2">Setting up review system...</p>
          <p className="text-sm text-gray-500">Configuring restaurant for reviews.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold mb-4" id="comment">
        Leave your review for {restaurant.name}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Rating (1 to 5 stars)
          </label>
          <div className="flex space-x-1">
            {renderStars(hoverRating || rating, true)}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Comment
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write your review..."
            rows="4"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-black resize-y"
            required
            disabled={isSubmitting}
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>

      <div className="mt-8" ref={reviewsRef}>
        <h3 className="text-lg font-semibold mb-4">Previous Reviews</h3>

        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review, index) => (
              <article key={`${review.restaurant_id}-${index}`} className="border-b pb-4 last:border-b-0">
                <div className="flex items-center mb-2">
                  <div className="flex">
                    {renderStars(review.rating)}
                  </div>
                  {review.created_at && (
                    <time className="ml-2 text-xs">
                      {new Date(review.created_at).toLocaleDateString()}
                    </time>
                  )}
                </div>
                <p className="">{review.comment}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="">No reviews yet</p>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Average Rating:</h4>
          <div className="flex items-center">
            <div className="flex">
              {renderStars(Math.round(averageRating))}
            </div>
            <span className="ml-2 text-gray-600">
              ({averageRating.toFixed(1)} out of 5 • {reviews.length} review{reviews.length !== 1 ? 's' : ''})
            </span>
          </div>
        </div>
      </div>
    </>
  );
}