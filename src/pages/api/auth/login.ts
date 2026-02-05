export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { email, password, token } = body;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email y contraseña son requeridos' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Verificar Turnstile token
    const { verifyTurnstileToken } = await import("../../../lib/turnstile");
    const verifyData = await verifyTurnstileToken(token);
    
    if (!verifyData.success) {
      return new Response(JSON.stringify({ error: "Verificación de CAPTCHA fallida" }), { status: 400 });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message || 'Error al iniciar sesión' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!data.session) {
      return new Response(
        JSON.stringify({ error: 'No se pudo crear la sesión' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const maxAge = 30 * 24 * 60 * 60;
    
    cookies.set('sb-access-token', data.session.access_token, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge,
    });

    cookies.set('sb-refresh-token', data.session.refresh_token, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge,
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
        }
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
