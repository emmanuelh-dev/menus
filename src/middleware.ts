import { defineMiddleware } from "astro:middleware";
import { isAuthenticated } from "./middleware/auth";

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, redirect } = context;

  // Solo aplicar a rutas de administración
  if (url.pathname.startsWith("/admin")) {
    // Excluir login y registro de la redirección automática
    const isPublicAdminPage = url.pathname === "/admin/login" || url.pathname === "/admin/register";
    
    if (!isPublicAdminPage) {
      console.log(`🔐 Verificando acceso para: ${url.pathname}`);
      
      const authenticated = await isAuthenticated(context.request, cookies);
      
      if (!authenticated) {
        console.warn(`🛑 Acceso denegado a ${url.pathname}, redirigiendo a login`);
        return redirect("/admin/login");
      }
      
      console.log(`✅ Acceso concedido a ${url.pathname}`);
    }
  }

  return next();
});
