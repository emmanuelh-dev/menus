import { useState } from 'react';
import { PiSparkle, PiPlus, PiX } from 'react-icons/pi';
import { ImageSelector } from '../ImageSelector';
import type { GalleryData } from '../../../types/app';

interface GalleryBlockProps {
  data: GalleryData;
  onChange: (data: GalleryData) => void;
  existingImages?: string[];
}

export function GalleryBlock({ data, onChange, existingImages }: GalleryBlockProps) {
  const [showImageSelector, setShowImageSelector] = useState(false);

  const addImageToGallery = (urls: string[]) => {
    const newImages = urls.map(url => ({ src: url, alt: '', title: '' }));
    onChange({
      ...data,
      images: [...(data.images || []), ...newImages]
    });
  };

  const removeImageFromGallery = (index: number) => {
    onChange({
      ...data,
      images: data.images.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden">
      <div className="bg-gray-50 p-2 border-b-2 border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-700 rounded-xl text-white ">
            <PiSparkle className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-gray-800 uppercase tracking-wider text-sm">Galería de Imágenes</h3>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.images?.map((img, gIdx) => (
            <div key={gIdx} className="relative aspect-square group overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
              <img src={img.src} alt={img.alt || ''} className="w-full h-full object-cover" />
              <button
                onClick={() => removeImageFromGallery(gIdx)}
                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-700"
              >
                <PiX className="w-3 h-3" />
              </button>
            </div>
          ))}

          <button
            onClick={() => setShowImageSelector(true)}
            className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 text-gray-600"
          >
            <PiPlus className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 text-center">Agregar</span>
          </button>
        </div>

        {showImageSelector && existingImages && (
          <ImageSelector
            existingImages={existingImages}
            onSelect={(url) => addImageToGallery([url])}
            onClose={() => setShowImageSelector(false)}
          />
        )}
      </div>
    </div>
  );
}
