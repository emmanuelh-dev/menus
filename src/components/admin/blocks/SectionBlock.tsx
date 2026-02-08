import { useState, useEffect } from 'react';
import {
  PiPlus,
  PiTrash,
  PiCaretUp,
  PiCaretDown,
  PiImage,
  PiArrowCounterClockwise,
  PiSparkle,
  PiEye,
  PiEyeSlash
} from 'react-icons/pi';
import { ImageSelector } from './ImageSelector';
import type { SectionData, ItemData } from './types';

interface SectionBlockProps {
  data: SectionData;
  onChange: (data: SectionData) => void;
  placeType?: 'restaurant' | 'motel';
  forceCollapse?: boolean;
  existingImages?: string[];
  onUploadToLibrary?: (urls: string[]) => void;
}

export function SectionBlock({
  data,
  onChange,
  placeType = 'restaurant',
  forceCollapse,
  existingImages,
  onUploadToLibrary
}: SectionBlockProps) {
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
      features: [],
      options: []
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
    <div className={`xl:bg-white rounded-2xl duration-500 overflow-hidden ${isCollapsed ? 'border-gray-50 shadow-sm' : 'border-gray-200 shadow-xl'}`}>
      <div className={`${isCollapsed ? 'bg-white' : 'xl:bg-gray-50'} xl:p-4 transition-all uppercase tracking-wide`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl shadow-sm font-bold transition-all ${isCollapsed ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-gray-700 text-white shadow-gray-200'}`}
          >
            <PiPlus className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-45'}`} />
          </button>

          <div className="flex-1">
            <input
              value={data.title}
              onChange={(e) => onChange({ ...data, title: e.target.value })}
              placeholder="Ej: PLATILLOS FUERTES"
              className={`w-full font-bold uppercase bg-transparent outline-none transition-all tracking-wider ${isCollapsed ? 'text-xs text-gray-800' : 'text-xl sm:text-2xl text-gray-800 px-1 border-b-2 border-gray-300'
                }`}
            />
            <div className="flex items-center gap-1 mt-1 opacity-60">
              <input
                value={data.category || ''}
                onChange={(e) => onChange({ ...data, category: e.target.value })}
                placeholder="Añadir a un Submenú / Grupo (opcional)..."
                className="text-[10px] font-bold text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded outline-none w-full max-w-[200px] placeholder:text-gray-300"
              />
            </div>
            {isCollapsed && (
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 ml-1 leading-none">
                Sección Dinámica • {data.items.length} Elementos
              </p>
            )}
          </div>

          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onChange({ ...data, featured: !(data.featured ?? false) })}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${data.featured
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                  : 'bg-gray-100 text-gray-400 hover:bg-amber-50 hover:text-amber-600'
                  }`}
                title={data.featured ? 'Quitar destacado' : 'Marcar como destacada'}
              >
                ⭐ {data.featured ? 'Destacada' : 'Destacar'}
              </button>
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

            <div className='px-4'>
              <label className="text-xs font-bold text-gray-600 mb-2 block uppercase tracking-wider px-4">Imagen de fondo:</label>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-4">
                {data.image ? (
                  <div className="space-y-3">
                    <div className="relative aspect-[21/9] rounded-xl overflow-hidden shadow-sm border border-gray-100">
                      <img src={data.image} alt={data.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowImageSelector(true)}
                        className="flex-1 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <PiArrowCounterClockwise size={14} className="text-blue-500" /> Cambiar Imagen
                      </button>
                      <button
                        onClick={() => onChange({ ...data, image: '' })}
                        className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 active:scale-95 transition-all flex items-center justify-center"
                      >
                        <PiTrash size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowImageSelector(true)}
                    className="w-full aspect-[21/9] border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-emerald-500 hover:text-emerald-500 transition-all group bg-slate-50/50"
                  >
                    <PiImage size={24} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Elegir Imagen de Fondo</span>
                  </button>
                )}
              </div>

              {showImageSelector && (
                <ImageSelector
                  existingImages={existingImages || []}
                  onSelect={(url) => {
                    onChange({ ...data, image: url });
                    setShowImageSelector(false);
                  }}
                  onClose={() => setShowImageSelector(false)}
                  onUpload={onUploadToLibrary}
                />
              )}
            </div>

            <div className="mt-8">
              <div className="flex justify-between items-center border-t border-purple-50 pt-4 px-1">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Listado de Productos</h4>
                <button
                  onClick={addItem}
                  className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
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
                <div key={item.id} className="group relative bg-white rounded-[2rem] border border-gray-100 hover:border-gray-200 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md my-4">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-100" />

                  <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-900 text-white rounded-2xl flex items-center justify-center text-xs font-black ">{itemIndex + 1}</div>
                        <div>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block leading-none mb-1">Producto</span>
                          <span className="text-[9px] font-mono text-gray-300 uppercase leading-none">{item.id.split('-').pop()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateItem(itemIndex, { available: !(item.available ?? true) })}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${(item.available ?? true)
                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white'
                            : 'bg-stone-100 text-stone-400 hover:bg-stone-600 hover:text-white'
                            }`}
                          title={(item.available ?? true) ? 'Disponible' : 'Agotado / Oculto'}
                        >
                          {(item.available ?? true) ? <PiEye className="w-5 h-5" /> : <PiEyeSlash className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => moveItem(itemIndex, 'up')}
                          disabled={itemIndex === 0}
                          className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-900 hover:text-white disabled:opacity-30 flex items-center justify-center transition-all"
                        >
                          <PiCaretUp className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => moveItem(itemIndex, 'down')}
                          disabled={itemIndex === data.items.length - 1}
                          className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-900 hover:text-white disabled:opacity-30 flex items-center justify-center transition-all"
                        >
                          <PiCaretDown className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => { if (confirm('¿Eliminar este producto?')) removeItem(itemIndex); }}
                          className="w-10 h-10 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
                        >
                          <PiTrash className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 block">Nombre del Producto</label>
                          <input
                            value={item.name}
                            onChange={(e) => updateItem(itemIndex, { name: e.target.value })}
                            placeholder="Ej: Gordita de Chicharrón"
                            className="w-full text-sm font-bold bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-purple-600 shadow-sm transition-all"
                          />
                        </div>
                        <div className="w-full sm:w-32">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 block">Precio ($)</label>
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateItem(itemIndex, { price: parseFloat(e.target.value) })}
                            placeholder="0.00"
                            className="w-full text-left sm:text-right text-sm sm:text-base font-bold text-emerald-600 bg-white border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-purple-600 shadow-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 block">Descripción</label>
                        <textarea
                          value={item.description}
                          onChange={(e) => updateItem(itemIndex, { description: e.target.value })}
                          placeholder="Describe los ingredientes, tamaño o lo que incluye..."
                          rows={2}
                          className="w-full text-sm text-gray-700 p-3 rounded-xl bg-white border border-gray-200 outline-none focus:border-purple-600 resize-none shadow-sm transition-all"
                        />
                      </div>

                      <div className="space-y-6 pt-2">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 px-1">
                            <PiSparkle className="w-4 h-4 text-emerald-500" />
                            Variantes (Sabores o Tamaños)
                          </label>

                          <div className="space-y-4">
                            {item.options?.map((option, optIdx) => (
                              <div key={optIdx} className="space-y-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 relative group/opt">
                                <button
                                  onClick={() => {
                                    const newOptions = item.options?.filter((_, i) => i !== optIdx);
                                    updateItem(itemIndex, { options: newOptions });
                                  }}
                                  className="absolute -top-2 -right-2 w-8 h-8 bg-white text-slate-400 hover:text-red-500 rounded-full shadow-sm border border-slate-100 flex items-center justify-center transition-all opacity-0 group-hover/opt:opacity-100"
                                >
                                  <PiTrash className="w-4 h-4" />
                                </button>

                                <div className="flex flex-col gap-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Nombre del grupo (ej: Sabor, Tamaño):</label>
                                  <input
                                    value={option.name}
                                    onChange={(e) => {
                                      const newOptions = [...(item.options || [])];
                                      newOptions[optIdx].name = e.target.value;
                                      updateItem(itemIndex, { options: newOptions });
                                    }}
                                    placeholder="Ej: Sabor de la masa..."
                                    className="w-full text-sm font-bold bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-emerald-500 transition-all"
                                  />
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {option.values.map((val, vIdx) => (
                                    <span key={vIdx} className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-[10px] font-bold flex flex-col gap-1 border border-emerald-100 group transition-all hover:border-emerald-300">
                                      <div className="flex items-center gap-2">
                                        <span className="flex-1 whitespace-nowrap">{val}</span>
                                        <button
                                          onClick={() => {
                                            const newOptions = [...(item.options || [])];
                                            newOptions[optIdx].values = newOptions[optIdx].values.filter((_, i) => i !== vIdx);
                                            if (newOptions[optIdx].prices) {
                                              const newPrices = { ...newOptions[optIdx].prices };
                                              delete newPrices[val];
                                              newOptions[optIdx].prices = newPrices;
                                            }
                                            updateItem(itemIndex, { options: newOptions });
                                          }}
                                          className="text-emerald-300 hover:text-red-500 transition-colors"
                                        >×</button>
                                      </div>
                                      <div className="flex items-center gap-1 bg-white/50 rounded-lg px-2 py-0.5 border border-emerald-100/50">
                                        <span className="text-[8px] text-emerald-400 font-black">+$</span>
                                        <input
                                          type="number"
                                          placeholder="0"
                                          className="w-12 bg-transparent border-none p-0 text-[10px] font-black text-emerald-600 focus:ring-0 outline-none placeholder:text-emerald-200"
                                          value={option.prices?.[val] || ''}
                                          onChange={(e) => {
                                            const newOptions = [...(item.options || [])];
                                            const newPrices = { ...(newOptions[optIdx].prices || {}) };
                                            if (e.target.value) {
                                              newPrices[val] = parseFloat(e.target.value);
                                            } else {
                                              delete newPrices[val];
                                            }
                                            newOptions[optIdx].prices = newPrices;
                                            updateItem(itemIndex, { options: newOptions });
                                          }}
                                        />
                                      </div>
                                    </span>
                                  ))}
                                  <input
                                    placeholder="Escribe sabores separados por comas..."
                                    className="text-xs bg-white px-4 py-2 rounded-xl outline-none flex-1 min-w-[200px] border border-slate-200 focus:border-emerald-500"
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val.includes(',')) {
                                        const parts = val.split(',').map(p => p.trim()).filter(p => p);
                                        const newOptions = [...(item.options || [])];
                                        newOptions[optIdx].values = [...newOptions[optIdx].values, ...parts];
                                        updateItem(itemIndex, { options: newOptions });
                                        e.target.value = '';
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (e.currentTarget.value.trim()) {
                                          const newOptions = [...(item.options || [])];
                                          newOptions[optIdx].values.push(e.currentTarget.value.trim());
                                          updateItem(itemIndex, { options: newOptions });
                                          e.currentTarget.value = '';
                                        }
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            ))}

                            <button onClick={() => {
                              const newOptions = [...(item.options || []), { name: '', values: [], required: true }];
                              updateItem(itemIndex, { options: newOptions });
                            }} className="w-full py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center justify-center gap-2">
                              <PiPlus className="w-4 h-4" /> Añadir Nueva Variante
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block px-1">Etiquetas (Picante, Veggie, etc)</label>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {item.features?.map((feature, fIdx) => (
                              <span key={fIdx} className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-2 border border-gray-200">
                                {feature}
                                <button
                                  onClick={() => {
                                    const newFeatures = item.features?.filter((_, i) => i !== fIdx);
                                    updateItem(itemIndex, { features: newFeatures });
                                  }}
                                  className="text-gray-400 hover:text-red-600"
                                >×</button>
                              </span>
                            ))}
                          </div>
                          <input
                            type="text"
                            placeholder="Escribe etiquetas separadas por comas..."
                            className="w-full text-xs p-4 rounded-xl bg-gray-50 border border-transparent focus:border-gray-200 outline-none transition-all"
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val.includes(',')) {
                                const parts = val.split(',').map(p => p.trim()).filter(p => p);
                                const currentFeatures = item.features || [];
                                updateItem(itemIndex, { features: [...currentFeatures, ...parts] });
                                e.target.value = '';
                              }
                            }}
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
                      </div>

                      <div className="space-y-4 pt-4 border-t border-gray-50">
                        <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 px-1">
                          <PiImage className="w-4 h-4 text-emerald-500" />
                          Fotos del Producto
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Main Image Selector */}
                          <div className="bg-gray-50 p-4 rounded-2xl space-y-4">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Imagen Principal</p>

                            {item.image ? (
                              <div className="space-y-3">
                                <div className="relative aspect-video rounded-xl overflow-hidden shadow-sm border border-gray-200">
                                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setShowItemImageSelector({ ...showItemImageSelector, [itemIndex]: true })}
                                    className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
                                  >
                                    <PiArrowCounterClockwise size={14} className="text-blue-500" /> Cambiar
                                  </button>
                                  <button
                                    onClick={() => updateItem(itemIndex, { image: '' })}
                                    className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 active:scale-95 transition-all flex items-center justify-center shadow-sm"
                                  >
                                    <PiTrash size={14} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowItemImageSelector({ ...showItemImageSelector, [itemIndex]: true })}
                                className="w-full aspect-video border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-emerald-500 hover:text-emerald-500 transition-all group bg-white"
                              >
                                <PiImage size={24} className="group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Añadir Foto</span>
                              </button>
                            )}

                            {showItemImageSelector[itemIndex] && (
                              <ImageSelector
                                existingImages={existingImages || []}
                                onSelect={(url) => {
                                  updateItem(itemIndex, { image: url });
                                  setShowItemImageSelector({ ...showItemImageSelector, [itemIndex]: false });
                                }}
                                onClose={() => setShowItemImageSelector({ ...showItemImageSelector, [itemIndex]: false })}
                                onUpload={onUploadToLibrary}
                              />
                            )}
                          </div>
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
                                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs shadow-md opacity-100 transition-opacity"
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
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
