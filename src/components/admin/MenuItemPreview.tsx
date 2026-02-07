import React from 'react';
import { PiPlus } from 'react-icons/pi';

interface Props {
  item: any;
  config: any;
  template: string;
}

export default function MenuItemPreview({ item, config, template }: Props) {
  const isVibrant = template === 'vibrant';
  const isUber = template === 'uber';
  const isDidi = template === 'didi';

  // Renderizado dinámico según el estilo solicitado
  if (isVibrant) {
    return (
      <div className={`group ${config.itemCardClass || ''} relative overflow-hidden bg-white p-5 rounded-[32px] shadow-sm border border-emerald-50 mb-4`}>
        <div className="flex justify-between items-center gap-4">
          <div className="flex-1">
            <h3 className={`${config.itemTitleClass} text-lg mb-1`}>{item.name}</h3>
            {item.description && <p className="text-gray-500 text-[11px] leading-relaxed mb-3 line-clamp-2">{item.description}</p>}
          </div>
          <div className="flex flex-col items-end gap-3 text-right shrink-0">
            {item.price > 0 && (
              <div className="bg-[#FF4D00] text-white px-4 py-1.5 rounded-2xl font-black text-xl shadow-lg italic">
                ${item.price}
              </div>
            )}
            {item.image && (
              <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-sm border-2 border-white">
                <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isUber) {
    return (
      <div className="flex justify-between items-start gap-4 p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-base mb-1 truncate">{item.name}</h3>
          {item.description && <p className="text-gray-400 text-xs line-clamp-2 mb-2">{item.description}</p>}
          <span className="text-white font-medium block mt-auto">${item.price}</span>
        </div>
        <div className="relative shrink-0">
          {item.image && (
            <div className="w-24 h-24 rounded-lg overflow-hidden">
              <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
            </div>
          )}
          <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-white text-black rounded-full shadow-xl flex items-center justify-center border border-gray-100">
            <PiPlus className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  if (isDidi) {
    return (
      <div className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-50 mb-3 hover:shadow-md transition-shadow">
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-base mb-1 truncate">{item.name}</h3>
            {item.description && <p className="text-gray-500 text-[11px] line-clamp-2 leading-snug">{item.description}</p>}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[#FF5B00] font-black text-lg">${item.price}</span>
            <span className="text-[10px] text-gray-400 line-through">${(item.price * 1.2).toFixed(0)}</span>
          </div>
        </div>
        <div className="relative shrink-0">
          {item.image ? (
            <div className="w-24 h-24 rounded-2xl overflow-hidden">
              <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-300">
              <PiPlus size={24} />
            </div>
          )}
          <button className="absolute bottom-1 right-1 w-7 h-7 bg-[#FF5B00] text-white rounded-full shadow-lg flex items-center justify-center">
            <PiPlus className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Estilos por defecto (Tradicional, Moderno, Gourmet)
  return (
    <div className={`group ${config.itemCardClass || ''} mb-4`}>
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex justify-between items-baseline mb-1">
            <h3 className={config.itemTitleClass}>{item.name}</h3>
            {item.price > 0 && <span className={config.priceClass}>${item.price}</span>}
          </div>
          {item.description && <p className="text-gray-500 text-xs leading-relaxed">{item.description}</p>}
        </div>
        {item.image && (
          <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 shadow-sm">
            <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
          </div>
        )}
      </div>
    </div>
  );
}
