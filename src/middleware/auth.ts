export const prerender = false;

import { createAuthenticatedClient, createSupabaseClient } from '../lib/supabase';

export async function isAuthenticated(request: Request, cookies: any) {
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  if (!accessToken || !refreshToken) {
    console.log('❌ No hay tokens en las cookies');
    return false;
  }

  console.log('🔍 Verificando autenticación con tokens existentes');

  try {
    // Crear cliente de Supabase con los tokens de la sesión
    const supabase = await createAuthenticatedClient(accessToken, refreshToken);
    
    // Verificar si el token es válido
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      console.warn('⚠️ Token inválido, intentando refrescar sesión...');
      
      // Intentar refrescar la sesión
      const supabaseRefresh = createSupabaseClient();
      const { data: refreshData, error: refreshError } = await supabaseRefresh.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (refreshError || !refreshData?.session) {
        console.error('🚨 Error al refrescar sesión:', refreshError?.message || 'No se pudo obtener una nueva sesión');
        return false;
      }

      console.log('✅ Sesión refrescada correctamente, actualizando cookies');

      // Actualizar cookies con los nuevos tokens
      // No usamos httpOnly para que sean accesibles desde JavaScript
      cookies.set('sb-access-token', refreshData.session.access_token, {
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'strict',
        maxAge: refreshData.session.expires_in,
      });

      cookies.set('sb-refresh-token', refreshData.session.refresh_token, {
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 30,
      });

      return true;
    }

    // 1. Verificar si el usuario es administrador
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single();

    console.log('✅ Usuario autenticado correctamente');

    // 2. Manejo de Impersonación (Solo para Admins)
    const { isAdmin } = await import("../lib/admin");
    if (isAdmin(data.user.email)) {
      const impersonateId = cookies.get('sb-impersonate-id')?.value;
      if (impersonateId) {
        console.log(`👤 MODO IMPERSONACIÓN ACTIVO: Simulando usuario ${impersonateId}`);
      }
    }

    return true;
  } catch (e) {
    console.error('🚨 Error inesperado en autenticación:', e);
    return false;
  }
}

/**
 * Obtiene el usuario real y el usuario efectivo (impersonado) si aplica.
 * Útil para APIs que necesitan saber actuar en nombre de otro.
 */
export async function getEffectiveUser(request: Request, cookies: any) {
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  if (!accessToken || !refreshToken) return null;

  try {
    const supabase = await createAuthenticatedClient(accessToken, refreshToken);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const impersonateId = cookies.get('sb-impersonate-id')?.value;
    
    const { isAdmin } = await import("../lib/admin");
    const isRealAdmin = isAdmin(user.email);

    if (isRealAdmin && impersonateId) {
      return {
        realUser: user,
        effectiveUser: { id: impersonateId, isImpersonated: true },
        isAdmin: true
      };
    }

    return {
      realUser: user,
      effectiveUser: user,
      isAdmin: isRealAdmin
    };
  } catch (e) {
    return null;
  }
}
