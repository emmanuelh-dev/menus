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
        <div className="mb-3">
          <img 
            src={displayImage} 
            alt="Vista previa optimizada" 
            className="h-32 w-auto object-contain rounded border border-gray-300"
          />
          <p className="text-xs text-gray-500 mt-1">Imagen optimizada automáticamente</p>
        </div>
      )}
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-4">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="block w-full cursor-pointer text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
        />
        {uploading && (
          <p className="mt-2 animate-pulse text-xs text-blue-600">Subiendo...</p>
        )}
      </div>
    </div>
  )
}
