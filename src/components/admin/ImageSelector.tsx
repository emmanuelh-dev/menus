import { PiX } from 'react-icons/pi';

interface ImageSelectorProps {
  existingImages: string[];
  onSelect: (url: string) => void;
  onClose: () => void;
}

export function ImageSelector({ existingImages, onSelect, onClose }: ImageSelectorProps) {
  if (existingImages.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-sm text-gray-500 mb-4">No hay imágenes disponibles todavía</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold"
          >
            Cerrar
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
          <h3 className="text-sm font-bold uppercase text-gray-800 tracking-wide">Selecciona una imagen existente</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
          >
            <PiX className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {existingImages.map((url, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onSelect(url);
                  onClose();
                }}
                className="relative aspect-square rounded-xl overflow-hidden border-2 border-gray-200 hover:border-blue-500 hover: transition-all group"
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 text-white text-3xl font-bold">✓</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
