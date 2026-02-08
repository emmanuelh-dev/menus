import { useState } from 'react';
import { PiX, PiImage, PiTrash } from 'react-icons/pi';
import { ManualUploader } from '../../ManualUploader';
import type { ImageData } from './types';

interface ImageBlockProps {
  data: ImageData;
  onChange: (data: ImageData) => void;
  existingImages?: string[];
}

export function ImageBlock({ data, onChange, existingImages }: ImageBlockProps) {
  const [showImageSelector, setShowImageSelector] = useState(false);

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden">
      <div className="bg-gray-50 p-4 border-b-2 border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-700 rounded-xl text-white ">
            <PiImage className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-gray-800 uppercase tracking-wider text-sm">Bloque de Imagen</h3>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/3 space-y-4">
            <div className="relative group rounded-2xl overflow-hidden border border-emerald-100 bg-emerald-50 aspect-square">
              {data.src ? (
                <>
                  <img src={data.src} alt={data.alt || ''} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 opacity-100 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={() => onChange({ ...data, src: '' })} className="bg-red-600 text-white p-2 rounded-xl">
                      <PiTrash className="w-5 h-5" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-emerald-200">
                  <PiImage className="w-16 h-16" />
                </div>
              )}
            </div>

            <button
              onClick={() => setShowImageSelector(true)}
              className="w-full py-2 bg-emerald-50 text-emerald-700 rounded-xl font-semibold uppercase text-[10px] tracking-wide border border-emerald-100 hover:bg-emerald-100"
            >
              Seleccionar Foto
            </button>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <label className="text-[10px] font-bold text-emerald-800/40 uppercase mb-2 block tracking-widest px-1">Texto Alternativo:</label>
              <input
                value={data.alt || ''}
                onChange={(e) => onChange({ ...data, alt: e.target.value })}
                placeholder="Describe la imagen para accesibilidad..."
                className="w-full text-sm bg-white p-3 rounded-xl border border-emerald-100 outline-none focus:border-emerald-600 shadow-sm"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-emerald-800/40 uppercase mb-2 block tracking-widest px-1">Pie de Foto:</label>
              <textarea
                value={data.caption || ''}
                onChange={(e) => onChange({ ...data, caption: e.target.value })}
                placeholder="Texto que aparecerá debajo de la imagen..."
                rows={3}
                className="w-full text-sm bg-white p-3 rounded-xl border border-emerald-100 outline-none focus:border-emerald-600 shadow-sm resize-none"
              />
            </div>
          </div>
        </div>

        {showImageSelector && existingImages && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowImageSelector(false)} />
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-xl">
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="font-bold uppercase tracking-widest">Seleccionar Imagen</h3>
                <button onClick={() => setShowImageSelector(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <PiX className="w-6 h-6" />
                </button>
              </div>
              <div className="overflow-y-auto p-6 max-h-[calc(90vh-140px)]">
                <div className="space-y-8">
                  <section>
                    <ManualUploader
                      currentImage={data.src}
                      onFilesUploaded={(url) => {
                        onChange({ ...data, src: url[0] });
                        setShowImageSelector(false);
                      }}
                      onImageRemove={() => onChange({ ...data, src: '' })}
                    />
                  </section>

                  {existingImages.length > 0 && (
                    <section>
                      <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-widest">Imágenes Existentes:</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {existingImages.map((url, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              onChange({ ...data, src: url });
                              setShowImageSelector(false);
                            }}
                            className="aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-emerald-500 transition-all"
                          >
                            <img src={url} className="w-full h-full object-cover" alt="" />
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
