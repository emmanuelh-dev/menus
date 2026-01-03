import { useState } from 'react'
import type { ChangeEvent } from 'react'

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
    const params = 'f_auto,q_auto,w_1000'
    return url.includes('/upload/') ? url.replace('/upload/', `/upload/${params}/`) : url
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    // Convertimos FileList a Array para poder usar .map()
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploading(true)
    onUploadStart?.()

    try {
      // Ejecutamos todas las subidas en paralelo
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
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
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      )}
      
      <div className="rounded-xl border-2 border-dashed border-gray-200 p-4 hover:border-black transition-colors">
        <input
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleFileChange}
          disabled={uploading}
          className="block w-full text-xs text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-black file:text-white file:px-4 file:py-2 file:font-bold cursor-pointer"
        />
        {uploading && (
          <p className="mt-2 animate-pulse text-[10px] font-bold text-blue-600 uppercase">Subiendo ráfaga...</p>
        )}
      </div>
    </div>
  )
}