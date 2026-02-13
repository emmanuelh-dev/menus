export const prerender = false;
import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '../../../lib/supabase';
import { getEffectiveUser } from '../../../middleware/auth';
import { invalidateByTag } from '@vercel/functions';

const ADMIN_EMAILS = [
  "emmanuelh.dev@gmail.com",
  "admin@bysmax.com",
  "e805177@gmail.com",
];

const toSlug = (value: string) =>
  (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const getPublicIdFromCloudinaryUrl = (imageUrl?: string) => {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) return null;

  try {
    const parsed = new URL(imageUrl);
    const marker = '/image/upload/';
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex === -1) return null;

    const afterUpload = parsed.pathname.slice(markerIndex + marker.length);
    const segments = afterUpload.split('/').filter(Boolean);
    const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
    const publicIdSegments = versionIndex >= 0 ? segments.slice(versionIndex + 1) : segments;
    if (publicIdSegments.length === 0) return null;

    return publicIdSegments.join('/').replace(/\.[a-zA-Z0-9]+$/, '');
  } catch {
    return null;
  }
};

const deleteCloudinaryImageByUrl = async (imageUrl?: string) => {
  const publicId = getPublicIdFromCloudinaryUrl(imageUrl);
  if (!publicId) return;

  const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = import.meta.env.CLOUDINARY_API_KEY;
  const apiSecret = import.meta.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) return;

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      public_id: publicId,
      invalidate: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }
};

export const GET: APIRoute = async ({ params, cookies, request }) => {
  const { id } = params;
  if (!id) {
    return new Response(
      JSON.stringify({ error: 'ID de restaurante no proporcionado' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const authResult = await getEffectiveUser(request, cookies);
    if (!authResult) {
       return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
    }

    const { effectiveUser, isAdmin } = authResult;
    
    // Decidir qué cliente usar
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;
    const isMagicOrImpersonating = !accessToken || !refreshToken || (effectiveUser as any).isImpersonated;

    let supabase;
    if (isMagicOrImpersonating) {
      const { createClient } = await import("@supabase/supabase-js");
      supabase = createClient(
        import.meta.env.PUBLIC_SUPABASE_URL,
        import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
      );
    } else {
      supabase = await createAuthenticatedClient(accessToken!, refreshToken!);
    }

    // Obtener el restaurante por ID
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return new Response(
        JSON.stringify({ error: 'Restaurante no encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar propiedad o admin
    if (data.user_id !== effectiveUser.id && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'No tienes permisos para ver este establecimiento' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ data }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error inesperado:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const PUT: APIRoute = async ({ request, params, cookies }) => {
  const { id } = params;
  if (!id) {
    return new Response(
      JSON.stringify({ error: 'ID de restaurante no proporcionado' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const authResult = await getEffectiveUser(request, cookies);
    if (!authResult) {
       return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
    }

    const { effectiveUser, isAdmin } = authResult;

    // Decidir qué cliente usar
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;
    const isMagicOrImpersonating = !accessToken || !refreshToken || (effectiveUser as any).isImpersonated;

    let supabase;
    if (isMagicOrImpersonating) {
      const { createClient } = await import("@supabase/supabase-js");
      supabase = createClient(
        import.meta.env.PUBLIC_SUPABASE_URL,
        import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
      );
    } else {
      supabase = await createAuthenticatedClient(accessToken!, refreshToken!);
    }

    // Verificar que el restaurante pertenezca al usuario (o sea admin)
    const { data: existingPlace } = await supabase
      .from('places')
      .select('user_id, short_name, name, image')
      .eq('id', id)
      .single();

    if (!existingPlace) {
      return new Response(
        JSON.stringify({ error: 'Restaurante no encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (existingPlace.user_id !== effectiveUser.id && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'No tienes permiso para editar este establecimiento' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener datos del cuerpo de la solicitud
    const restaurantData = await request.json();
    
    // Validar datos mínimos requeridos
    const isContentOnlyUpdate = Object.keys(restaurantData).length === 1 && 'content' in restaurantData;
    
    if (!isContentOnlyUpdate && (!restaurantData.name || !restaurantData.address)) {
      return new Response(
        JSON.stringify({ error: 'El nombre y la dirección son obligatorios' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Mapear type
    const { type, ...rest } = restaurantData;
    const dataToUpdate: any = {
      ...rest,
      type: type || rest.type,
    };

    if (dataToUpdate.content === null || dataToUpdate.content === undefined) {
      delete dataToUpdate.content;
    }
    
    // Actualizar en la base de datos
    const { data, error } = await supabase
      .from('places')
      .update(dataToUpdate)
      .eq('id', id)
      .select('*, states(*)')
      .single();
    
    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const currentSlug = toSlug(data?.short_name || data?.name || '');
    const previousSlug = toSlug(existingPlace.short_name || existingPlace.name || '');
    const tagsToInvalidate = new Set<string>();

    if (currentSlug) {
      tagsToInvalidate.add(`place-${currentSlug}`);
    }

    if (previousSlug && previousSlug !== currentSlug) {
      tagsToInvalidate.add(`place-${previousSlug}`);
    }

    if (tagsToInvalidate.size > 0) {
      try {
        await Promise.all([...tagsToInvalidate].map((tag) => invalidateByTag(tag)));
      } catch (invalidateError) {
        console.error('Error invalidando caché por tags:', invalidateError);
      }
    }

    const previousImage = existingPlace.image || '';
    const nextImage = data?.image || '';
    const shouldDeletePreviousImage =
      previousImage &&
      nextImage &&
      previousImage !== nextImage &&
      previousImage.includes('cloudinary.com');

    if (shouldDeletePreviousImage) {
      try {
        await deleteCloudinaryImageByUrl(previousImage);
      } catch (cloudinaryDeleteError) {
        console.error('Error eliminando imagen anterior de Cloudinary:', cloudinaryDeleteError);
      }
    }
    
    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error inesperado:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async ({ params, cookies, request }) => {
  const { id } = params;
  if (!id) {
    return new Response(
      JSON.stringify({ error: 'ID de restaurante no proporcionado' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const authResult = await getEffectiveUser(request, cookies);
    if (!authResult) {
       return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
    }

    const { effectiveUser, isAdmin } = authResult;

    // Decidir qué cliente usar
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;
    const isMagicOrImpersonating = !accessToken || !refreshToken || (effectiveUser as any).isImpersonated;

    let supabase;
    if (isMagicOrImpersonating) {
      const { createClient } = await import("@supabase/supabase-js");
      supabase = createClient(
        import.meta.env.PUBLIC_SUPABASE_URL,
        import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
      );
    } else {
      supabase = await createAuthenticatedClient(accessToken!, refreshToken!);
    }

    // Verificar propiedad o admin
    const { data: existingPlace } = await supabase
      .from('places')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existingPlace) {
      return new Response(
        JSON.stringify({ error: 'Restaurante no encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (existingPlace.user_id !== effectiveUser.id && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'No tienes permiso para eliminar este establecimiento' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Eliminar de la base de datos
    const { error } = await supabase
      .from('places')
      .delete()
      .eq('id', id);
    
    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error inesperado:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};