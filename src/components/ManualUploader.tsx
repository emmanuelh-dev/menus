import { useState } from 'react'
import type { ChangeEvent } from 'react'

interface ManualUploaderProps {
  onFileUploaded: (url: string) => void
  onUploadStart?: () => void
  onUploadError?: () => void
  currentImage?: string
}

export function ManualUploader({
  onFileUploaded,
  onUploadStart,
  onUploadError,
  currentImage,
}: ManualUploaderProps) {
  const [uploading, setUploading] = useState(false)

  const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME || 'dvdq078aa'
  const uploadPreset = import.meta.env.PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default'

  const optimizeImageUrl = (url: string) => {
    const watermarkParams =
      'f_auto,q_auto,w_800'
    
    if (url.includes('/upload/')) {
      return url.replace('/upload/', `/upload/${watermarkParams}/`)
    }
    return url
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    onUploadStart?.()

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', uploadPreset)

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error?.message || 'Upload failed')

      const optimizedUrl = optimizeImageUrl(data.secure_url)
      console.log('URL optimizada guardada:', optimizedUrl)
      onFileUploaded(optimizedUrl)
    } catch (error) {
      onUploadError?.()
      console.error('Error al subir la imagen a Cloudinary:', error)
    } finally {
      setUploading(false)
    }
  }

  const displayImage = currentImage ? optimizeImageUrl(currentImage) : ''

  return (
    <div className="space-y-3">
      {displayImage && (
        <div className="relative group">
          <img 
            src={displayImage} 
            alt="Vista previa" 
            className="h-40 w-full object-cover rounded-2xl border border-gray-100 shadow-sm" 
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
            <p className="text-white text-xs font-bold uppercase">Cambiar Imagen</p>
          </div>
        </div>
      )}
      <div className="rounded-2xl border-2 border-dashed border-gray-200 p-4 hover:border-black transition-colors">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="block w-full text-xs text-gray-400 file:mr-4 file:rounded-full file:border-0 file:bg-black file:text-white file:px-4 file:py-2 file:font-bold cursor-pointer"
        />
      </div>
    </div>
  )
}
