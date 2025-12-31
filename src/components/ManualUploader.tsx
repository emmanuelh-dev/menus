import { useState, ChangeEvent } from 'react'

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

      const watermarkParams =
        'f_auto,q_auto/b_white,co_black,l_text:arial_20:restaurantmenu.com.mx,g_south_east,x_10,y_10'

      const optimizedUrl = data.secure_url.replace('/upload/', `/upload/${watermarkParams}/`)
      onFileUploaded(optimizedUrl)
    } catch (error) {
      onUploadError?.()
      console.error('Error al subir la imagen a Cloudinary:', error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      {currentImage && (
        <div className="mb-3">
          <img 
            src={currentImage} 
            alt="Vista previa" 
            className="h-32 w-auto object-contain rounded border border-gray-300"
          />
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
          <p className="mt-2 animate-pulse text-xs text-blue-600">Subiendo a Cloudinary...</p>
        )}
      </div>
    </div>
  )
}
