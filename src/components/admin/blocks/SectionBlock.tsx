import { useState, useEffect } from 'react';
import { PiPlus, PiTrash } from 'react-icons/pi';
import { ManualUploader } from '../../ManualUploader';
import { ImageSelector } from '../ImageSelector';
import type { SectionData, ItemData } from '../../../types/app';

interface SectionBlockProps {
  data: SectionData;
  onChange: (data: SectionData) => void;
  placeType?: 'restaurant' | 'motel';
  forceCollapse?: boolean;
  existingImages?: string[];
}

export function SectionBlock({ data, onChange, placeType = 'restaurant', forceCollapse, existingImages }: SectionBlockProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [showItemImageSelector, setShowItemImageSelector] = useState<{ [key: number]: boolean }>({});
  const [showItemGallerySelector, setShowItemGallerySelector] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    if (forceCollapse !== undefined) {
      setIsCollapsed(forceCollapse);
    }
  }, [forceCollapse]);

  const addItem = () => {
    const newItem: ItemData = {
      id: `item-${Date.now()}-${Math.random()}`,
      name: '',
      price: 0,
      description: '',
      image: '',
      features: []
    };
    onChange({ ...data, items: [...data.items, newItem] });
    setIsCollapsed(false);
  };

  const updateItem = (itemIndex: number, itemData: Partial<ItemData>) => {
    const newItems = [...data.items];
    newItems[itemIndex] = { ...newItems[itemIndex], ...itemData };
    onChange({ ...data, items: newItems });
  };

  const removeItem = (itemIndex: number) => {
    onChange({ ...data, items: data.items.filter((_, i) => i !== itemIndex) });
  };

  const moveItem = (itemIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
    if (targetIndex < 0 || targetIndex >= data.items.length) return;

    const newItems = [...data.items];
    [newItems[itemIndex], newItems[targetIndex]] = [newItems[targetIndex], newItems[itemIndex]];
    onChange({ ...data, items: newItems });
  };

  return (
    <div className={`bg-white rounded-2xl border-2 transition-all duration-500 overflow-hidden ${isCollapsed ? 'border-gray-100 shadow-sm' : 'border-gray-200 shadow-xl'}`}>
      <div className={`${isCollapsed ? 'bg-white' : 'bg-gray-50'} p-4 transition-all uppercase tracking-wide`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl shadow-sm font-bold transition-all ${isCollapsed ? 'bg-gray-100 text-gray-400 hover:bg-gray-200' : 'bg-gray-700 text-white shadow-gray-200'}`}
          >
            <PiPlus className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-45'}`} />
          </button>

          <div className="flex-1">
            <input
              value={data.title}
              onChange={(e) => onChange({ ...data, title: e.target.value })}
              placeholder="Ej: PLATILLOS FUERTES"
              className={`w-full font-bold uppercase bg-transparent outline-none transition-all tracking-wider ${isCollapsed ? 'text-xs text-gray-500' : 'text-xl sm:text-2xl text-gray-800 px-1 border-b-2 border-gray-300'
                }`}
            />
            {isCollapsed && (
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 ml-1 leading-none">
                Sección Dinámica • {data.items.length} Elementos
              </p>
            )}
          </div>

          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block text-[10px] font-bold bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full">
                {data.items.length} PLATILLOS
              </span>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <div className="mt-4 space-y-4">
            <div className="bg-white/50 p-4 rounded-xl border border-emerald-100/50">
              <label className="text-[10px] font-bold text-emerald-800/40 uppercase mb-2 block tracking-widest px-1">Concepto de la Sección:</label>
              <textarea
                value={data.description || ''}
                onChange={(e) => onChange({ ...data, description: e.target.value })}
                placeholder="Breve historia o descripción de esta categoría..."
                rows={2}
                className="w-full text-sm bg-white p-3 rounded-xl border border-emerald-100 outline-none focus:border-emerald-600 shadow-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider">Imagen de fondo:</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <ManualUploader
                    currentImage={data.image}
                    onFilesUploaded={(url) => onChange({ ...data, image: url[0] })}
                    onImageRemove={() => onChange({ ...data, image: '' })}
                    onUploadStart={() => console.log('Subiendo imagen de sección...')}
                    onUploadError={() => console.error('Error al subir imagen')}
                  />
                </div>
                {existingImages && existingImages.length > 0 && (
                  <button
                    onClick={() => setShowImageSelector(!showImageSelector)}
                    className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors text-sm font-bold whitespace-nowrap"
                  >
                    Existentes
                  </button>
                )}
              </div>
              {showImageSelector && existingImages && (
                <ImageSelector
                  existingImages={existingImages}
                  onSelect={(url) => onChange({ ...data, image: url })}
                  onClose={() => setShowImageSelector(false)}
                />
              )}
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center border-t border-purple-100 pt-4">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Contenido de la sección</h4>
                <button
                  onClick={addItem}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-purple-100 flex items-center gap-2"
                >
                  <PiPlus className="w-3 h-3" /> Agregar Ítem
                </button>
              </div>

              {data.items.length === 0 && (
                <div className="text-center py-10 bg-white/30 rounded-xl border-2 border-dashed border-purple-200">
                  <p className="text-purple-400 text-xs font-bold uppercase">No hay items en esta sección</p>
                </div>
              )}

              {data.items.map((item, itemIndex) => (
                <div key={item.id} className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm">
                  <div className="flex justify-end gap-2 mb-3">
                    <button
                      onClick={() => moveItem(itemIndex, 'up')}
                      disabled={itemIndex === 0}
                      className="w-6 h-6 bg-gray-100 border rounded hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center text-xs"
                    >↑</button>
                    <button
                      onClick={() => moveItem(itemIndex, 'down')}
                      disabled={itemIndex === data.items.length - 1}
                      className="w-6 h-6 bg-gray-100 border rounded hover:bg-gray-200 disabled:opacity-30 flex items-center justify-center text-xs"
                    >↓</button>
                    <button
                      onClick={() => removeItem(itemIndex)}
                      className="w-6 h-6 bg-red-50 border border-red-200 rounded hover:bg-red-100 text-red-500 flex items-center justify-center text-xs"
                    >✕</button>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-2">
                      <input
                        value={item.name}
                        onChange={(e) => updateItem(itemIndex, { name: e.target.value })}
                        placeholder="Nombre del platillo"
                        className="col-span-3 text-sm font-bold bg-white border border-gray-100 rounded-xl px-3 py-2 outline-none focus:border-purple-600 shadow-sm"
                      />
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateItem(itemIndex, { price: parseFloat(e.target.value) })}
                        placeholder="0.00"
                        className="text-left sm:text-right text-sm sm:text-base font-bold text-red-600 bg-gray-50 border border-gray-200 rounded px-3 py-2 outline-none focus:border-purple-600"
                      />
                    </div>

                    <textarea
                      value={item.description}
                      onChange={(e) => updateItem(itemIndex, { description: e.target.value })}
                      placeholder="Descripción del platillo..."
                      rows={2}
                      className="w-full text-sm text-gray-700 p-2 rounded bg-gray-50 border border-gray-200 outline-none focus:border-purple-600 resize-none"
                    />

                    <div>
                      <label className="text-xs font-bold text-gray-600 mb-2 block">{placeType === 'motel' ? 'CARACTERÍSTICAS DE LA HABITACIÓN (ej: Jacuzzi, Smart TV, Tina):' : 'CARACTERÍSTICAS DEL PLATILLO (ej: Picante, Vegetariano):'}</label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {item.features?.map((feature, fIdx) => (
                          <span key={fIdx} className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            {feature}
                            <button
                              onClick={() => {
                                const newFeatures = item.features?.filter((_, i) => i !== fIdx);
                                updateItem(itemIndex, { features: newFeatures });
                              }}
                              className="hover:text-red-600"
                            >×</button>
                          </span>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder={placeType === 'motel' ? 'Agregar característica de habitación (Enter)' : 'Agregar característica del platillo (Enter)'}
                        className="w-full text-sm p-2 rounded bg-gray-50 border border-gray-200 outline-none focus:border-purple-600"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            const newFeature = e.currentTarget.value.trim();
                            const currentFeatures = item.features || [];
                            updateItem(itemIndex, { features: [...currentFeatures, newFeature] });
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    </div>

                    <div className="w-full">
                      <label className="text-xs font-bold text-gray-600 mb-2 block">IMAGEN PRINCIPAL:</label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <ManualUploader
                            currentImage={item.image}
                            onFilesUploaded={(url) => updateItem(itemIndex, { image: url[0] })}
                            onImageRemove={() => updateItem(itemIndex, { image: '' })}
                            onUploadStart={() => console.log('Subiendo imagen del item...')}
                            onUploadError={() => console.error('Error al subir imagen')}
                          />
                        </div>
                        {existingImages && existingImages.length > 0 && (
                          <button
                            onClick={() => setShowItemImageSelector({ ...showItemImageSelector, [itemIndex]: !showItemImageSelector[itemIndex] })}
                            className="px-3 py-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors text-xs font-bold whitespace-nowrap"
                          >
                            Existentes
                          </button>
                        )}
                      </div>
                      {showItemImageSelector[itemIndex] && existingImages && (
                        <ImageSelector
                          existingImages={existingImages}
                          onSelect={(url) => updateItem(itemIndex, { image: url })}
                          onClose={() => setShowItemImageSelector({ ...showItemImageSelector, [itemIndex]: false })}
                        />
                      )}
                    </div>

                    <div className="w-full">
                      <label className="text-xs font-bold text-gray-600 mb-2 block">GALERÍA DEL ITEM (opcional):</label>
                      <div className="space-y-2">
                        <ManualUploader
                          currentImage=""
                          multiple={true}
                          onFilesUploaded={(urls) => {
                            const newGalleryItems = urls.map(url => ({ src: url, alt: item.name || '', title: '' }));
                            const currentGallery = item.gallery || [];
                            updateItem(itemIndex, { gallery: [...currentGallery, ...newGalleryItems] });
                          }}
                          onUploadStart={() => console.log('Subiendo galería...')}
                          onUploadError={() => console.error('Error al subir galería')}
                        />

                        {existingImages && existingImages.length > 0 && (
                          <div>
                            <button
                              onClick={() => setShowItemGallerySelector({ ...showItemGallerySelector, [itemIndex]: !showItemGallerySelector[itemIndex] })}
                              className="w-full px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-xs font-bold border border-purple-200"
                            >
                              Agregar desde existentes
                            </button>
                            {showItemGallerySelector[itemIndex] && (
                              <ImageSelector
                                existingImages={existingImages}
                                onSelect={(url) => {
                                  const newGalleryItem = { src: url, alt: item.name || '', title: '' };
                                  const currentGallery = item.gallery || [];
                                  updateItem(itemIndex, { gallery: [...currentGallery, newGalleryItem] });
                                }}
                                onClose={() => setShowItemGallerySelector({ ...showItemGallerySelector, [itemIndex]: false })}
                              />
                            )}
                          </div>
                        )}
                      </div>

                      {item.gallery && item.gallery.length > 0 && (
                        <div className="mt-3 grid grid-cols-4 gap-2">
                          {item.gallery.map((img, gIdx) => (
                            <div key={gIdx} className="relative group">
                              <img src={img.src} alt={img.alt || ''} className="w-full h-20 object-cover rounded" />
                              <button
                                type="button"
                                onClick={() => {
                                  const newGallery = item.gallery?.filter((_, i) => i !== gIdx);
                                  updateItem(itemIndex, { gallery: newGallery });
                                }}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
