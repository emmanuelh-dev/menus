import { useState } from 'react';
import { PiX, PiSparkle, PiImage } from 'react-icons/pi';
import { ManualUploader } from '../../ManualUploader';
import { ImageSelector } from './ImageSelector';
import type { GalleryData } from './types';

interface GalleryBlockProps {
  data: GalleryData;
  onChange: (data: GalleryData) => void;
  existingImages?: string[];
  onUploadToLibrary?: (urls: string[]) => void;
}

export function GalleryBlock({ data, onChange, existingImages, onUploadToLibrary }: GalleryBlockProps) {
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
                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-red-600/80 text-white rounded-lg opacity-100 sm:opacity-0 group-hover:opacity-100 hover:bg-red-700 transition-opacity"
              >
                <PiX className="w-3 h-3" />
              </button>
            </div>
          ))}

          <div className="col-span-2 md:col-span-2 space-y-2">
            <ManualUploader
              onFilesUploaded={addImageToGallery}
              multiple={true}
            />
            <button
              onClick={() => setShowImageSelector(true)}
              className="w-full py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border border-blue-100"
            >
              <PiImage className="w-3 h-3" />  Biblioteca Existente
            </button>
          </div>
        </div>

        {showImageSelector && existingImages && (
          <ImageSelector
            existingImages={existingImages}
            multiple={true}
            onSelectMultiple={(urls) => addImageToGallery(urls)}
            onClose={() => setShowImageSelector(false)}
            onUpload={onUploadToLibrary}
          />
        )}
      </div>
    </div>
  );
}
