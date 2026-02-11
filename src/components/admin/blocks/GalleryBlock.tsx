import { useState, useRef } from 'react';
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
  const [isPasting, setIsPasting] = useState(false);

  const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME || 'dvdq078aa'
  const uploadPreset = import.meta.env.PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default'

  const optimizeImageUrl = (url: string) => {
    const params = 'f_auto,q_auto,w_1000'
    return url.includes('/upload/') ? url.replace('/upload/', `/upload/${params}/`) : url
  }

  const compressImage = (file: File): Promise<Blob | File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const maxDimension = 1080;
        const fileSizeThreshold = 200 * 1024;
        if (img.width <= maxDimension && img.height <= maxDimension && file.size <= fileSizeThreshold) {
          resolve(file);
          return;
        }
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const isPng = file.type === 'image/png';
        const type = isPng ? 'image/png' : 'image/jpeg';
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name || 'pasted-image.jpg', {
              type: type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, type, isPng ? undefined : 0.9);
      };
      img.onerror = () => resolve(file);
    });
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length === 0) return;

    setIsPasting(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const processedFile = await compressImage(file);
        const formData = new FormData();
        formData.append('file', processedFile);
        formData.append('upload_preset', uploadPreset);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        return optimizeImageUrl(data.secure_url);
      });

      const urls = await Promise.all(uploadPromises);
      addImageToGallery(urls);
      if (onUploadToLibrary) onUploadToLibrary(urls);
    } catch (error) {
      console.error('Error pasting image:', error);
      alert('Error al subir imagen pegada');
    } finally {
      setIsPasting(false);
    }
  };

  const addImageToGallery = (urls: string[]) => {
    const newImages = urls.map(url => ({ src: url, alt: '', title: '' }));
    onChange({
      ...data,
      images: [...newImages, ...(data.images || [])]
    });
  };

  const removeImageFromGallery = (index: number) => {
    onChange({
      ...data,
      images: data.images.filter((_, i) => i !== index)
    });
  };

  return (
    <div
      className={`bg-white rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden transition-all ${isPasting ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
      onPaste={handlePaste}
      tabIndex={0}
    >
      <div className="bg-gray-50 p-2 border-b-2 border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-700 rounded-xl text-white ">
            <PiSparkle className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-gray-800 uppercase tracking-wider text-sm">Galería de Imágenes</h3>
          {isPasting && <span className="text-[10px] font-black text-blue-600 animate-pulse">¡PEGANDO IMAGEN!</span>}
        </div>
        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter px-2 italic">
          Tip: Haz clic aquí y presiona Ctrl+V para pegar
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
