import { useState } from 'react';
import { PiX, PiPlus, PiCheckCircle, PiImages } from 'react-icons/pi';
import { ManualUploader } from '../../ManualUploader';

interface ImageSelectorProps {
  existingImages: string[];
  onSelect?: (url: string) => void;
  onClose: () => void;
  onUpload?: (urls: string[]) => void;
  multiple?: boolean;
  onSelectMultiple?: (urls: string[]) => void;
}

export function ImageSelector({
  existingImages,
  onSelect,
  onClose,
  onUpload,
  multiple = false,
  onSelectMultiple
}: ImageSelectorProps) {
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);

  const handleToggleSelect = (url: string) => {
    if (!multiple) {
      onSelect?.(url);
      onClose();
      return;
    }

    if (selectedUrls.includes(url)) {
      setSelectedUrls(prev => prev.filter(u => u !== url));
    } else {
      setSelectedUrls(prev => [...prev, url]);
    }
  };

  const handleConfirm = () => {
    if (multiple && onSelectMultiple) {
      onSelectMultiple(selectedUrls);
    }
    onClose();
  };

  if (existingImages.length === 0 && !onUpload) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md w-full animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-300 mx-auto mb-6">
            <PiImages className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Biblioteca vacía</h3>
          <p className="text-sm text-gray-500 mb-6">Usa los botones de "Subir" en cada bloque para agregar contenido nuevo.</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-black transition-all"
          >
            Entendido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10">
          <h3 className="text-sm font-bold uppercase text-gray-800 tracking-wide">Biblioteca de Medios</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
          >
            <PiX className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)] space-y-8">
          {onUpload && (
            <section className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Subir nuevas imágenes a la biblioteca:</h4>
              <ManualUploader
                onFilesUploaded={(urls) => {
                  onUpload(urls);
                }}
                multiple={true}
              />
            </section>
          )}

          <section>
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Seleccionar de la biblioteca:</h4>
            {existingImages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-2">📸</div>
                <p className="text-sm text-gray-400">No hay imágenes en la biblioteca. ¡Sube algunas arriba!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4  gap-3">
                {existingImages.map((url, idx) => {
                  const isSelected = selectedUrls.includes(url);
                  return (
                    <button
                      key={idx}
                      onClick={() => handleToggleSelect(url)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all group ${isSelected
                        ? 'border-blue-600 shadow-md ring-2 ring-blue-100'
                        : 'border-gray-200 hover:border-blue-400'
                        }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />

                      {/* Selection Overlay (Only shown if selected) */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center animate-in fade-in zoom-in duration-200">
                          <div className="bg-blue-600 text-white p-1.5 rounded-full transform scale-110">
                            <PiCheckCircle className="w-6 h-6" />
                          </div>
                        </div>
                      )}

                      {/* Hover Indicator (Only for non-selected items) */}
                      {!isSelected && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-end">
                          <div className="bg-white/90 text-gray-900 p-1  opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-200 rounded-full overflow-clip m-1">
                            <PiPlus className="w-5 h-5" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {multiple && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-between items-center shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)]">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-none">
              {selectedUrls.length} seleccionadas
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={selectedUrls.length === 0}
                onClick={handleConfirm}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-700 shadow-blue-200 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-95"
              >
                Insertar Imágenes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
