import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Definición de tipos para la base de datos
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'owner' | 'user';
  created_at: string;
}

export interface Restaurant {
  id: number;
  name: string;
  description: string;
  address: string;
  phone: string;
  hours: string;
  services: string[];
  image: string;
  menu_images: string[];
  owner_id: string;
  created_at: string;
  updated_at: string;
  rating: number;
  review_count: number;
  price_range: string;
  featured: boolean;
}

export interface Review {
  id: number;
  restaurant_id: number;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
}

// Funciones de autenticación
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// Funciones para restaurantes
export async function createRestaurant(restaurant: Omit<Restaurant, 'id' | 'created_at' | 'updated_at' | 'rating' | 'review_count'>) {
  const { data, error } = await supabase
    .from('restaurants')
    .insert(restaurant)
    .select()
    .single();
  return { data, error };
}

export async function updateRestaurant(id: number, restaurant: Partial<Restaurant>) {
  const { data, error } = await supabase
    .from('restaurants')
    .update(restaurant)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

// Funciones para reseñas
export async function createReview(review: Omit<Review, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('reviews')
    .insert(review)
    .select()
    .single();

  if (!error) {
    // Actualizar el rating promedio y el contador de reseñas del restaurante
    const { data: reviewStats } = await supabase
      .from('reviews')
      .select('rating')
      .eq('restaurant_id', review.restaurant_id);

    if (reviewStats) {
      const avgRating = reviewStats.reduce((acc, curr) => acc + curr.rating, 0) / reviewStats.length;
      await updateRestaurant(review.restaurant_id, {
        rating: avgRating,
        review_count: reviewStats.length
      });
    }
  }

  return { data, error };
}

export async function getRestaurantReviews(restaurantId: number) {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      users:user_id (email)
    `)
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });
  return { data, error };
}