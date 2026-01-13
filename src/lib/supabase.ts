import { createClient } from '@supabase/supabase-js';
import type { Place } from '../types/app';

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
export async function getRestaurants({type}: {type: string | null}) {

  let query = supabase
    .from('places')
    .select('*')

  if (type){
    query = query.eq('type', type);
  }

  const { data, error } = await query
  if (error) {
    console.error(`Error fetching ${type}:`, error);
    return [];
  }
  return data as Place[];
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
  
  return data as Place[];
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
  
  return data;
}

export async function getRestaurantByName({ name }: { name: string }) {
  const { data, error } = await supabase
    .from('places')
    .select('*')
    .eq('short_name', name)
  if (error) {
    console.error('Error fetching cafeterias:', error);
    return [];
  }
  return data as Place[];
}