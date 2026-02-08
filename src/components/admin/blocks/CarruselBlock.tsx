import { useState } from 'react';
import { PiPlus, PiLayout, PiImage } from 'react-icons/pi';
import { ImageSelector } from './ImageSelector';
import type { CarruselData, CarruselItem } from './types';

interface CarruselBlockProps {
  data: CarruselData;
  onChange: (data: CarruselData) => void;
  existingImages?: string[];
  onUploadToLibrary?: (urls: string[]) => void;
}

export function CarruselBlock({ data, onChange, existingImages, onUploadToLibrary }: CarruselBlockProps) {
  const [showImageSelector, setShowImageSelector] = useState(false);

  const addItem = (urls: string[]) => {
    const newItems = urls.map(url => ({ src: url, alt: '', link: '', caption: '' }));
    onChange({ ...data, items: [...(data.items || []), ...newItems] });
  };

  const removeItem = (index: number) => {
    const newItems = [...data.items];
    newItems.splice(index, 1);
    onChange({ ...data, items: newItems });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= data.items.length) return;
    const newItems = [...data.items];
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    onChange({ ...data, items: newItems });
  };

  const updateItem = (index: number, itemData: Partial<CarruselItem>) => {
    const newItems = [...data.items];
    newItems[index] = { ...newItems[index], ...itemData };
    onChange({ ...data, items: newItems });
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden">
      <div className="bg-gray-50 p-4 border-b-2 border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-700 rounded-xl text-white ">
            <PiLayout className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-gray-800 uppercase tracking-wider text-sm">Carrusel de Promociones</h3>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.items?.map((item, idx) => (
            <div key={idx} className="group relative bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden hover: transition-all">
              <div className="aspect-video relative overflow-hidden bg-gray-200">
                {item.src ? (
                  <img src={item.src} className="w-full h-full object-cover" alt={item.alt} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <PiImage className="w-10 h-10 opacity-20" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1 opacity-100 transition-opacity">
                  <button onClick={() => moveItem(idx, 'up')} className="p-1.5 bg-white shadow-md rounded-lg hover:bg-gray-50 text-gray-700 border border-gray-100">↑</button>
                  <button onClick={() => moveItem(idx, 'down')} className="p-1.5 bg-white shadow-md rounded-lg hover:bg-gray-50 text-gray-700 border border-gray-100">↓</button>
                  <button onClick={() => removeItem(idx)} className="p-1.5 bg-white shadow-md rounded-lg hover:bg-red-50 text-red-600 border border-red-100">✕</button>
                </div>
              </div>

              <div className="p-3 space-y-2">
                <input
                  value={item.caption || ''}
                  onChange={(e) => updateItem(idx, { caption: e.target.value })}
                  placeholder="Título / Promo"
                  className="w-full text-xs font-bold bg-white p-2 rounded-lg border border-gray-200 outline-none focus:border-emerald-500"
                />
                <input
                  value={item.link || ''}
                  onChange={(e) => updateItem(idx, { link: e.target.value })}
                  placeholder="Enlace (opcional)"
                  className="w-full text-[10px] bg-white p-2 rounded-lg border border-gray-200 outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          ))}

          <button
            onClick={() => setShowImageSelector(true)}
            className="aspect-video flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl hover:bg-gray-50 hover:border-gray-400 transition-all text-gray-600 group"
          >
            <PiPlus className="w-8 h-8 mb-2 group transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Agregar Foto</span>
          </button>
        </div>

        {showImageSelector && (
          <ImageSelector
            existingImages={existingImages || []}
            multiple={true}
            onSelectMultiple={(urls) => addItem(urls)}
            onClose={() => setShowImageSelector(false)}
            onUpload={onUploadToLibrary}
          />
        )}
      </div>
    </div>
  );
}
