
const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME || 'dvdq078aa'
const uploadPreset = import.meta.env.PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default'

export async function uploadToCloudinary(base64String: string) {
  try {
    // Cloudinary accepts base64 with data: prefix
    const formData = new FormData()
    formData.append('file', base64String)
    formData.append('upload_preset', uploadPreset)

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudinary upload failed:', errorText);
      return null;
    }
    
    const data = await response.json()
    // Optimize URL
    let url = data.secure_url;
    const params = 'f_auto,q_auto,w_1000'
    if (url.includes('/upload/')) {
        url = url.replace('/upload/', `/upload/${params}/`)
    }
    return url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error)
    return null
  }
}
