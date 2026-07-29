import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { PiX } from 'react-icons/pi'

interface ManualUploaderProps {
  onFilesUploaded: (urls: string[]) => void
  onUploadStart?: () => void
  onUploadError?: () => void
  onImageRemove?: () => void
  currentImage?: string
  multiple?: boolean
}

export function ManualUploader({
  onFilesUploaded,
  onUploadStart,
  onUploadError,
  onImageRemove,
  currentImage,
  multiple = false,
}: ManualUploaderProps) {
  const [uploading, setUploading] = useState(false)

  const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME || 'dvdq078aa'
  const uploadPreset = import.meta.env.PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default'

  const optimizeImageUrl = (url: string) => {
    const params = 'f_auto,q_auto:good,dpr_auto,c_limit,w_1800'
    return url.includes('/upload/') ? url.replace('/upload/', `/upload/${params}/`) : url
  }

  const compressImage = (file: File): Promise<Blob | File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      img.onload = () => {
        const fileSizeThreshold = 1024 * 1024; // 1MB
        const maxDimensionWithoutCompression = 2200;

        if (
          file.size <= fileSizeThreshold &&
          img.width <= maxDimensionWithoutCompression &&
          img.height <= maxDimensionWithoutCompression
        ) {
          URL.revokeObjectURL(objectUrl);
          resolve(file);
          return;
        }

        const maxDimension = file.size > 4 * 1024 * 1024 ? 1600 : 2000;
        const jpegQuality = file.size > 4 * 1024 * 1024 ? 0.78 : 0.86;

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
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const isPng = file.type === 'image/png';
        const type = isPng ? 'image/png' : 'image/jpeg';

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          type,
          isPng ? undefined : jpegQuality,
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
    });
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploading(true)
    onUploadStart?.()

    try {
      const uploadPromises = files.map(async (file) => {
        // Compress image before upload
        const processedFile = file.type.startsWith('image/') ? await compressImage(file) : file;

        const formData = new FormData()
        formData.append('file', processedFile)
        formData.append('upload_preset', uploadPreset)

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) throw new Error('Upload failed')

        const data = await response.json()
        return optimizeImageUrl(data.secure_url)
      })

      const optimizedUrls = await Promise.all(uploadPromises)
      onFilesUploaded(optimizedUrls)
    } catch (error) {
      onUploadError?.()
      console.error('Error masivo en Cloudinary:', error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      {currentImage && currentImage.trim() !== '' && !multiple && (
        <div className="relative inline-block">
          <img src={optimizeImageUrl(currentImage)} className="h-32 rounded border" alt="Preview" />
          {onImageRemove && (
            <button
              type="button"
              onClick={onImageRemove}
              className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-red-100 text-red-500 rounded-full flex items-center justify-center text-xs shadow-md hover:bg-red-50 transition-colors"
            >
              <PiX className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      <div className="rounded-xl border-2 border-dashed border-neutral-200 p-4 hover:border-black transition-colors">
        <input
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleFileChange}
          disabled={uploading}
          className="block w-full text-[10px] text-neutral-500 file:mr-3 file:rounded-xl file:border-0 file:bg-neutral-100 file:text-neutral-700 file:px-4 file:py-1.5 file:font-semibold cursor-pointer hover:file:bg-neutral-200 transition-all"
        />
        {uploading && (
          <p className="mt-2 animate-pulse text-[10px] font-bold text-neutral-600 uppercase">Subiendo ráfaga...</p>
        )}
      </div>
    </div>
  )
}