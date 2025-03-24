import { createClient } from '@supabase/supabase-js';

// Crear el cliente de Supabase con las variables de entorno de Astro
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseKey);

// Tipos para la autenticación
export type AuthUser = {
  id: string;
  email: string;
  role: 'admin' | 'owner' | 'user';
};

// Hook personalizado para manejar la autenticación
export const getUser = async (): Promise<AuthUser | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email!,
      role: profile?.role || 'user'
    };
  } catch (error) {
    console.error('Error al obtener el usuario:', error);
    return null;
  }
};

// Funciones de autenticación
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};