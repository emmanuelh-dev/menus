import { supabase } from '../lib/supabase';

export async function isAuthenticated(request: Request, cookies: any) {
  const accessToken = cookies.get('sb-access-token');
  const refreshToken = cookies.get('sb-refresh-token');

  if (!accessToken || !refreshToken) {
    console.log('Autenticación fallida: No hay tokens en las cookies');
    return false;
  }

  console.log('Verificando autenticación con tokens existentes');

  try {
    // Verificar si el token es válido
    const { data, error } = await supabase.auth.getUser(accessToken.value);

    if (error || !data.user) {
      console.log('Token de acceso inválido, intentando refrescar sesión');
      if (error) {
        console.error('Error al verificar token:', error.message);
      }
      
      // Intentar refrescar el token
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
        refresh_token: refreshToken.value,
      });

      if (refreshError || !refreshData.session) {
        console.error('Error al refrescar sesión:', refreshError?.message || 'No se pudo obtener una nueva sesión');
        return false;
      }

      console.log('Sesión refrescada exitosamente, actualizando cookies');
      
      // Actualizar cookies con los nuevos tokens
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
        maxAge: 60 * 60 * 24 * 30, // 30 días
      });

      return true;
    }
    
    console.log('Token de acceso válido, verificando rol de usuario')

    // Verificar si el usuario es administrador
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (userError) {
      console.error('Error al verificar rol de usuario:', userError.message);
      return false;
    }
    
    if (!userData) {
      console.error('No se encontró el usuario en la tabla users');
      return false;
    }
    
    if (userData.role !== 'admin') {
      console.error('El usuario no tiene rol de administrador, rol actual:', userData.role);
      return false;
    }

    console.log('Autenticación exitosa para usuario con rol admin');
    return true;
  } catch (e) {
    console.error('Error al verificar autenticación:', e);
    return false;
  }
}