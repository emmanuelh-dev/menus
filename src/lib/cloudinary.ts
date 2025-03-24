import { v2 as cloudinary } from 'cloudinary';

interface CloudinaryResponse {
  secure_url: string;
  [key: string]: any;
}

interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
}

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: import.meta.env.PUBLIC_CLOUDINARY_API_KEY,
  api_secret: import.meta.env.PUBLIC_CLOUDINARY_API_SECRET,
});

// Función para subir una imagen
export const uploadImage = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', import.meta.env.PUBLIC_CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json() as CloudinaryResponse;
    return data.secure_url;
  } catch (error) {
    console.error('Error al subir la imagen:', error);
    throw new Error('Error al subir la imagen a Cloudinary');
  }
};

// Función para optimizar una URL de imagen
export const optimizeImage = (url: string, options: ImageOptimizationOptions = {}): string => {
  if (!url) return '';
  
  try {
    const cloudinaryUrl = new URL(url);
    const transformations: string[] = [];

    if (options.width) transformations.push(`w_${options.width}`);
    if (options.height) transformations.push(`h_${options.height}`);
    if (options.quality) transformations.push(`q_${options.quality}`);

    if (transformations.length > 0) {
      const transformationString = transformations.join(',');
      const urlParts: string[] = cloudinaryUrl.pathname.split('/');
      urlParts.splice(6, 0, transformationString);
      cloudinaryUrl.pathname = urlParts.join('/');
    }

    return cloudinaryUrl.toString();
  } catch (error) {
    console.error('Error al optimizar la imagen:', error);
    return url;
  }
};