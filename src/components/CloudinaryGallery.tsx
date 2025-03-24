import { useState } from 'react';
import { optimizeImage } from '../lib/cloudinary';

interface CloudinaryGalleryProps {
  images: string[];
  className?: string;
}

export default function CloudinaryGallery({ images, className = '' }: CloudinaryGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageClick = (image: string) => {
    setSelectedImage(image);
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <div key={index} className="relative aspect-square overflow-hidden rounded-lg cursor-pointer">
            <img
              src={optimizeImage(image, { width: 300, height: 300, quality: 80 })}
              alt={`Imagen ${index + 1}`}
              className="w-full h-full object-cover transition-transform hover:scale-105"
              onClick={() => handleImageClick(image)}
            />
          </div>
        ))}
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div className="max-w-4xl max-h-[90vh] p-4">
            <img
              src={optimizeImage(selectedImage, { width: 1200, quality: 90 })}
              alt="Imagen ampliada"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}