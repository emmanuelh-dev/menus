export const prerender = false;

import type { APIRoute } from 'astro';
import { createAuthenticatedClient } from '../../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export const POST: APIRoute = async ({ request, cookies }) => {
  // Verificar autenticación
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  if (!accessToken || !refreshToken) {
    return new Response(
      JSON.stringify({ error: 'No autorizado' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Crear cliente de Supabase con autenticación
    const supabase = await createAuthenticatedClient(accessToken, refreshToken);
    
    // Procesar la solicitud multipart/form-data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    
    if (!imageFile) {
      return new Response(
        JSON.stringify({ error: 'No se proporcionó ninguna imagen' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(imageFile.type)) {
      return new Response(
        JSON.stringify({ error: 'Tipo de archivo no válido. Solo se permiten JPG, PNG y WEBP' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validar tamaño (máximo 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (imageFile.size > maxSize) {
      return new Response(
        JSON.stringify({ error: 'La imagen es demasiado grande. El tamaño máximo es 2MB' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Generar un nombre único para el archivo
    const fileExtension = imageFile.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    
    // Convertir el archivo a ArrayBuffer
    const arrayBuffer = await imageFile.arrayBuffer();
    
    // Subir el archivo al bucket 'restaurant-images'
    const { data, error } = await supabase.storage
      .from('restaurant-images')
      .upload(fileName, arrayBuffer, {
        contentType: imageFile.type,
        cacheControl: '3600'
      });
    
    if (error) {
      console.error('Error al subir la imagen:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Obtener la URL pública del archivo
    const { data: { publicUrl } } = supabase.storage
      .from('restaurant-images')
      .getPublicUrl(fileName);
    
    return new Response(
      JSON.stringify({ success: true, url: publicUrl }),
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