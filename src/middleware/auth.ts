export const prerender = false;

import { createAuthenticatedClient, createSupabaseClient } from '../lib/supabase';
import { createClient, type User } from '@supabase/supabase-js';

export async function isAuthenticated(request: Request, cookies: any) {
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;
  const magicAuthToken = cookies.get('sb-magic-token')?.value;

  // 1. Prioridad: Magic Token (Permanente y Cero Fricción)
  if (magicAuthToken) {
    const supabaseAdmin = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    // Verificar si el token existe en algún restaurante
    const { data: place } = await supabaseAdmin
      .from('places')
      .select('user_id, content')
      .contains('content', { admin: { magic_token: magicAuthToken } })
      .single();

    if (place) {
      console.log('✅ Autenticado vía Magic Token Permanente');
      return true;
    }
  }

  if (!accessToken || !refreshToken) {
    return false;
  }

  try {
    const supabase = await createAuthenticatedClient(accessToken, refreshToken);
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      const supabaseRefresh = createSupabaseClient();
      const { data: refreshData, error: refreshError } = await supabaseRefresh.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (refreshError || !refreshData?.session) {
        return false;
      }

      cookies.set('sb-access-token', refreshData.session.access_token, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: refreshData.session.expires_in,
      });

      cookies.set('sb-refresh-token', refreshData.session.refresh_token, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 30,
      });

      return true;
    }

    return true;
  } catch (e) {
    return false;
  }
}

export async function getEffectiveUser(request: Request, cookies: any) {
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;
  const magicAuthToken = cookies.get('sb-magic-token')?.value;

  try {
    let user: User | null = null;
    let isRealAdmin = false;

    // 1. Intentar por Magic Token
    if (magicAuthToken) {
      const supabaseAdmin = createClient(
        import.meta.env.PUBLIC_SUPABASE_URL,
        import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
      );

      const { data: place } = await supabaseAdmin
        .from('places')
        .select('user_id')
        .contains('content', { admin: { magic_token: magicAuthToken } })
        .single();

      if (place) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(place.user_id);
        if (userData?.user) {
          user = userData.user;
          const { isAdmin } = await import("../lib/admin");
          isRealAdmin = isAdmin(user.email || '');
        }
      }
    }

    // 2. Fallback a sesión normal
    if (!user && accessToken && refreshToken) {
      const supabase = await createAuthenticatedClient(accessToken, refreshToken);
      const { data } = await supabase.auth.getUser();
      user = data?.user;
      if (user) {
        const { isAdmin } = await import("../lib/admin");
        isRealAdmin = isAdmin(user.email || '');
      }
    }

    if (!user) return null;

    const impersonateId = cookies.get('sb-impersonate-id')?.value;

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
