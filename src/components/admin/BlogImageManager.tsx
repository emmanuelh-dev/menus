import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Check, Image as ImageIcon, RefreshCw, Trash2 } from 'lucide-react';
import { ManualUploader } from '../ManualUploader';

interface CloudinaryImage {
  asset_id: string;
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  created_at: string;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-MX');
}

const BlogImageManager = () => {
  const [images, setImages] = useState<CloudinaryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [deletingPublicId, setDeletingPublicId] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/cloudinary-images');
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'No se pudieron cargar las imágenes');
        setImages([]);
        return;
      }

      setImages((data.images || []) as CloudinaryImage[]);
    } catch (requestError) {
      setError('Error de conexión al cargar imágenes');
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleUploadedFiles = (urls: string[]) => {
    const now = new Date().toISOString();
    const mapped: CloudinaryImage[] = urls.map((url, index) => ({
      asset_id: `${now}-${index}`,
      public_id: `manual-${now}-${index}`,
      secure_url: url,
      width: 0,
      height: 0,
      format: 'image',
      bytes: 0,
      created_at: now,
    }));

    setImages((prev) => [...mapped, ...prev].slice(0, 100));
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => {
        setCopiedUrl((current) => (current === url ? null : current));
      }, 1500);
    } catch (copyError) {
      setError('No se pudo copiar el enlace');
    }
  };

  const handleDelete = async (image: CloudinaryImage) => {
    if (!window.confirm('¿Eliminar esta imagen de Cloudinary?')) return;

    setDeletingPublicId(image.public_id);
    setError(null);

    try {
      const response = await fetch('/api/admin/cloudinary-images', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: image.public_id }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'No se pudo eliminar la imagen');
        return;
      }

      setImages((prev) => prev.filter((item) => item.asset_id !== image.asset_id));
    } catch {
      setError('Error de conexión al eliminar la imagen');
    } finally {
      setDeletingPublicId((current) => (current === image.public_id ? null : current));
    }
  };

  const totalLabel = useMemo(() => `${images.length} de 100`, [images.length]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6">
        <h2 className="text-lg font-black text-slate-900 tracking-tight">Subir imágenes para blog</h2>
        <p className="text-sm text-slate-500 mt-1">Sube imágenes a Cloudinary y copia el enlace para usarlo en tus posts.</p>

        <div className="mt-4">
          <ManualUploader
            multiple={true}
            onUploadStart={() => setUploading(true)}
            onUploadError={() => {
              setUploading(false);
              setError('Error al subir imágenes a Cloudinary');
            }}
            onFilesUploaded={(urls) => {
              setUploading(false);
              handleUploadedFiles(urls);
            }}
          />
        </div>

        {uploading && <p className="text-xs font-semibold text-blue-600 mt-3">Subiendo imágenes...</p>}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Últimas fotos</h3>
            <p className="text-xs text-slate-500 mt-1">Mostrando {totalLabel}</p>
          </div>

          <button
            onClick={fetchImages}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 text-sm text-slate-500">Cargando imágenes...</div>
        ) : images.length === 0 ? (
          <div className="mt-6 text-sm text-slate-500">No hay imágenes para mostrar.</div>
        ) : (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {images.map((image) => (
              <article key={image.asset_id} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="aspect-[4/3] bg-slate-100">
                  <img
                    src={image.secure_url}
                    alt={image.public_id || 'Imagen de Cloudinary'}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <ImageIcon className="w-3 h-3" />
                    <span>{formatDate(image.created_at)}</span>
                  </div>

                  <input
                    value={image.secure_url}
                    readOnly
                    className="w-full text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleCopy(image.secure_url)}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
                    >
                      {copiedUrl === image.secure_url ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedUrl === image.secure_url ? 'Copiado' : 'Copiar'}
                    </button>

                    <button
                      onClick={() => handleDelete(image)}
                      disabled={deletingPublicId === image.public_id}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {deletingPublicId === image.public_id ? 'Eliminando' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogImageManager;