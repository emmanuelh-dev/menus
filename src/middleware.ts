import { defineMiddleware } from 'astro:middleware';
import { getUser } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
    const user = await getUser();
  
    // Rutas protegidas que requieren autenticación
    const protectedRoutes = [
      '/admin',
    ];
  
    // Rutas específicas por rol
    const roleRoutes = {
      admin: ['/admin'],
      owner: ['/cafeterias/edit', '/cafeterias/create', '/menus/create', '/menus/edit']
    };
  
    const currentPath = new URL(context.request.url).pathname;
  
    // Verificar si la ruta actual requiere autenticación
    if (protectedRoutes.some(route => currentPath.startsWith(route))) {
      if (!user) {
        return context.redirect('/login');
      }
  
      // Verificar permisos por rol
      if (roleRoutes.admin.some(route => currentPath.startsWith(route)) && user.role !== 'admin') {
        return context.redirect('/');
      }
  
      // Verificar permisos de propietario
      if (roleRoutes.owner.some(route => currentPath.startsWith(route)) && 
          user.role !== 'owner' && user.role !== 'admin') {
        return context.redirect('/');
      }
    }
  
    // Redirigir usuarios autenticados según su rol
    if (user && (currentPath === '/login' || currentPath === '/registro')) {
      if (user.role === 'admin') {
        return context.redirect('/admin');
      } else if (user.role === 'owner') {
        return context.redirect('/cafeterias');
      } else {
        return context.redirect('/');
      }
    }
  
    context.locals.user = user;
    return next();
});