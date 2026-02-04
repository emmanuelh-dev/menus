import React, { useState } from 'react';
import { PiX, PiImage, PiImages, PiPencilSimple, PiCheck } from 'react-icons/pi';
import { ManualUploader } from '../ManualUploader';

export interface GalleryImage {
  src: string;
  alt?: string;
  title?: string;
  description?: string;
}

interface GalleryManagerProps {
  images: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
  existingImages?: string[];
  onUploadToLibrary?: (urls: string[]) => void;
  title?: string;
  compact?: boolean;
}

export default function GalleryManager({
  images,
  onChange,
  existingImages,
  onUploadToLibrary,
  title = "Galería de Imágenes",
  compact = false
}: GalleryManagerProps) {
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; description: string }>({ title: '', description: '' });

  const addImages = (urls: string[]) => {
    const newImages = urls.map(url => ({
      src: url,
      alt: '',
      title: '',
      description: ''
    }));
    onChange([...images, ...newImages]);
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const startEditing = (index: number) => {
    const img = images[index];
    setEditForm({
      title: img.title || '',
      description: img.description || ''
    });
    setEditingIndex(index);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const updated = [...images];
    updated[editingIndex] = {
      ...updated[editingIndex],
      title: editForm.title,
      description: editForm.description
    };
    onChange(updated);
    setEditingIndex(null);
    setEditForm({ title: '', description: '' });
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditForm({ title: '', description: '' });
  };

  return (
    <div className={`bg-white rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden ${compact ? 'p-4' : ''}`}>
      {!compact && (
        <div className="bg-gray-50 p-3 border-b-2 border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600 rounded-xl text-white">
              <PiImages className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 uppercase tracking-wider text-sm">{title}</h3>
              <p className="text-xs text-gray-500">{images.length} imágenes</p>
            </div>
          </div>
        </div>
      )}

      <div className={`${compact ? '' : 'p-6'} space-y-4`}>
        {/* Grid de imágenes */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img, idx) => (
            <div key={idx} className="relative group">
              <div className="aspect-square rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-50">
                <img
                  src={img.src}
                  alt={img.alt || img.title || ''}
                  className="w-full h-full object-cover"
                />

                {/* Overlay con botones */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => startEditing(idx)}
                    className="w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center hover:bg-white transition-colors"
                    title="Editar descripción"
                  >
                    <PiPencilSimple className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    onClick={() => removeImage(idx)}
                    className="w-8 h-8 bg-red-500/90 rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors"
                    title="Eliminar"
                  >
                    <PiX className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Título y descripción debajo de la imagen */}
              {(img.title || img.description) && (
                <div className="mt-2 px-1">
                  {img.title && (
                    <p className="text-xs font-semibold text-gray-800 truncate">{img.title}</p>
                  )}
                  {img.description && (
                    <p className="text-[10px] text-gray-500 line-clamp-2">{img.description}</p>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Botón para agregar */}
          <div className="aspect-square">
            <ManualUploader
              onFilesUploaded={addImages}
              multiple={true}
            />
          </div>
        </div>

        {/* Botón para seleccionar de biblioteca */}
        {existingImages && existingImages.length > 0 && (
          <button
            onClick={() => setShowImageSelector(true)}
            className="w-full py-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border border-blue-100"
          >
            <PiImage className="w-4 h-4" />
            Seleccionar de Biblioteca ({existingImages.length})
          </button>
        )}

        {/* Modal de edición */}
        {editingIndex !== null && (
          <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
                <h3 className="font-bold text-gray-800">Editar imagen</h3>
                <button onClick={cancelEdit} className="p-1 hover:bg-gray-200 rounded-lg">
                  <PiX className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Preview de imagen */}
                <div className="aspect-video rounded-xl overflow-hidden bg-gray-100">
                  <img
                    src={images[editingIndex].src}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Campo de título */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    placeholder="Ej: Vista del jacuzzi"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                  />
                </div>

                {/* Campo de descripción */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Describe esta imagen..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none"
                  />
                </div>

                {/* Botones */}
                <div className="flex gap-2">
                  <button
                    onClick={cancelEdit}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveEdit}
                    className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-purple-700 flex items-center justify-center gap-2"
                  >
                    <PiCheck className="w-4 h-4" />
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Selector de imágenes existentes */}
        {showImageSelector && existingImages && (
          <ImageSelector
            existingImages={existingImages}
            multiple={true}
            onSelectMultiple={addImages}
            onClose={() => setShowImageSelector(false)}
            onUpload={onUploadToLibrary}
          />
        )}
      </div>
    </div>
  );
}

// Selector de imágenes de la biblioteca
function ImageSelector({
  existingImages,
  multiple,
  onSelectMultiple,
  onClose,
  onUpload
}: {
  existingImages: string[];
  multiple: boolean;
  onSelectMultiple: (urls: string[]) => void;
  onClose: () => void;
  onUpload?: (urls: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleSelect = (url: string) => {
    if (multiple) {
      setSelected(prev =>
        prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
      );
    } else {
      onSelectMultiple([url]);
      onClose();
    }
  };

  const confirmSelection = () => {
    onSelectMultiple(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-gray-800">Biblioteca de Imágenes</h3>
            <p className="text-xs text-gray-500">{selected.length} seleccionadas</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-lg">
            <PiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {existingImages.map((url, idx) => (
              <button
                key={idx}
                onClick={() => toggleSelect(url)}
                className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${selected.includes(url)
                    ? 'border-purple-500 ring-2 ring-purple-200'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {multiple && (
          <div className="p-4 bg-gray-50 border-t shrink-0 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-bold text-xs uppercase"
            >
              Cancelar
            </button>
            <button
              onClick={confirmSelection}
              disabled={selected.length === 0}
              className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-xs uppercase disabled:bg-gray-300"
            >
              Agregar {selected.length} imágenes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
