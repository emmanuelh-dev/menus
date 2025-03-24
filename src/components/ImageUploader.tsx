import { useState } from 'react';
import { uploadImage } from '../lib/cloudinary';

interface ImageUploaderProps {
  onImageUploaded: (url: string) => void;
  className?: string;
  label?: string;
}

export default function ImageUploader({ 
  onImageUploaded, 
  className = '', 
  label = 'Subir Imagen'
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      const imageUrl = await uploadImage(file);
      onImageUploaded(imageUrl);
    } catch (err) {
      setError('Error al subir la imagen. Por favor, intenta de nuevo.');
      console.error('Error al subir imagen:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="mt-1 flex items-center">
        <label
          className={
            `flex justify-center items-center px-6 py-2 border border-gray-300 
            rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white 
            hover:bg-gray-50 cursor-pointer ${
              isUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`
          }
        >
          <input
            type="file"
            className="sr-only"
            onChange={handleFileChange}
            accept="image/*"
            disabled={isUploading}
          />
          {isUploading ? 'Subiendo...' : 'Seleccionar archivo'}
        </label>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}