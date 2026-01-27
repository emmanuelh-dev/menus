import { createClient } from '@supabase/supabase-js';
import type { SupabasePlace } from '../types/app';

// Obtener las variables de entorno
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

/**
 * Crea un cliente de Supabase para requests sin autenticación
 */
export function createSupabaseClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
}

/**
 * Crea un cliente de Supabase autenticado con tokens de sesión
 * @param {string} accessToken - Token de acceso para autenticación
 * @param {string} refreshToken - Token de actualización para renovar la sesión
 * @returns Promise con cliente de Supabase configurado
 */
export async function createAuthenticatedClient(accessToken: string, refreshToken: string) {
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
  
  await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  });
  
  return client;
}

// Crear el cliente de Supabase por defecto
export const supabase = createClient(supabaseUrl, supabaseKey);

// Interfaz para las cafeterías
export interface Restaurant {
  short_name: string;
  id: number;
  name: string;
  rating: number;
  reviewCount: number;
  priceRange: string;
  address: string;
  hours: string;
  services: string[];
  image: string;
  menu?: string;
  distance?: string;
  closed?: boolean;
  openingTime?: string;
  featured?: boolean;
  type?: string;
}

// Función para obtener todas las cafeterías
export async function getRestaurants({type, state_id}: {type: string | null, state_id?: number}) {

  let query = supabase
    .from('places')
    .select('*, states(*)')

  if (type){
    query = query.eq('type', type);
  }

  if (state_id) {
    query = query.eq('state_id', state_id);
  }

  const { data, error } = await query
  if (error) {
    console.error(`Error fetching ${type}:`, error);
    return [];
  }

  // Si no hay lugares, retornamos vacío pronto
  if (!data || data.length === 0) return [];

  // Obtenemos los ratings para los lugares encontrados en una sola consulta
  const placeIds = data.map(p => p.id);
  const { data: reviewsData } = await supabase
    .from('reviews')
    .select('place_id, rate')
    .in('place_id', placeIds);

  const statsMap: Record<number, { rating: number, count: number }> = {};
  if (reviewsData) {
    reviewsData.forEach((rev: any) => {
      if (!statsMap[rev.place_id]) {
        statsMap[rev.place_id] = { sum: 0, count: 0 } as any;
      }
      const s = statsMap[rev.place_id] as any;
      s.sum += rev.rate;
      s.count += 1;
    });
    Object.keys(statsMap).forEach((id: any) => {
      const s = statsMap[id] as any;
      statsMap[id] = {
        rating: Number((s.sum / s.count).toFixed(1)),
        count: s.count
      };
    });
  }

  return (data as any[]).map(place => {
    const stats = statsMap[place.id];
    return {
      ...place,
      state_slug: place.states?.slug || 'nuevo-leon',
      rating: stats?.rating || place.rating || 4.0,
      reviewCount: stats?.count || place.reviewCount || 0,
      priceRange: place.priceRange || "$$",
      address: place.address || "",
      hours: place.hours || "24 horas",
      amenities: place.amenities || [],
      specialties: place.specialties || [],
      destacado: place.featured
    } as SupabasePlace;
  });
}

/**
 * Obtiene el promedio de calificación y conteo de reseñas para todos los lugares
 */
export async function getAllPlaceRatings() {
  const { data, error } = await supabase
    .from('reviews')
    .select('place_id, rate');

  if (error) {
    console.error('Error fetching all ratings:', error);
    return {};
  }

  const stats: Record<number, { rating: number, count: number }> = {};
  
  data.forEach((rev: any) => {
    if (!stats[rev.place_id]) {
      stats[rev.place_id] = { sum: 0, count: 0 } as any;
    }
    const s = stats[rev.place_id] as any;
    s.sum += rev.rate;
    s.count += 1;
  });

  const finalStats: Record<number, { rating: number, count: number }> = {};
  Object.keys(stats).forEach((id: any) => {
    const s = stats[id] as any;
    finalStats[id] = {
      rating: Number((s.sum / s.count).toFixed(1)),
      count: s.count
    };
  });

  return finalStats;
}

/**
 * Obtiene el promedio de calificación y conteo de reseñas para un lugar específico
 */
export async function getPlaceRating(placeId: number) {
  const { data, error } = await supabase
    .from('reviews')
    .select('rate')
    .eq('place_id', placeId);

  if (error || !data || data.length === 0) {
    return { rating: 0, count: 0 };
  }

  const sum = data.reduce((acc, rev) => acc + (rev.rate || 0), 0);
  const count = data.length;
  const rating = Number((sum / count).toFixed(1));

  return { rating, count };
}

export async function getStates() {
  const { data, error } = await supabase
    .from('states')
    .select(`
      *,
      places:places(count)
    `);

  if (error) {
    console.error('Error fetching states with count:', error);
    return [];
  }

  return data.map(state => ({
    ...state,
    total_places: state.places[0]?.count || 0
  }));
}
// Función para obtener cafeterías destacadas
export async function getCafeteriasDestacadas() {
  const { data, error } = await supabase
    .from('cafeterias')
    .select('*')
    .eq('featured', true);
  
  if (error) {
    console.error('Error fetching featured cafeterias:', error);
    return [];
  }
  
  return data as SupabasePlace[];
}

// Función para obtener opiniones de una cafetería
export async function getOpinionesCafeteria(cafeteriaId: number) {
  const { data, error } = await supabase
    .from('opiniones')
    .select('*')
    .eq('cafeteria_id', cafeteriaId);
  
  if (error) {
    console.error('Error fetching opinions:', error);
    return [];
  }
  
  return data as SupabasePlace[];
}

export async function getRestaurantByName({ name }: { name: string }) {
  const { data, error } = await supabase
    .from('places')
    .select('*, states(*)')
    .eq('short_name', name);
    
  if (error) {
    console.error('Error fetching restaurant:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  const place = data[0];
  const stats = await getPlaceRating(place.id);

  return [{
    ...place,
    state_slug: place.states?.slug || 'nuevo-leon',
    rating: stats?.rating || place.rating || 4.0,
    reviewCount: stats?.count || place.reviewCount || 0,
    priceRange: place.priceRange || "$$",
    address: place.address || "",
    hours: place.hours || "24 horas",
    amenities: place.amenities || [],
    specialties: place.specialties || [],
    destacado: place.featured
  }] as SupabasePlace[];
}
