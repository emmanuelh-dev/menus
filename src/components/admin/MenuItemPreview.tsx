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
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-emerald-50 mb-6 relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="flex justify-between items-center gap-6">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-black tracking-tight text-slate-800 mb-2">
              {item.name}
            </h3>
            {item.description && (
              <p className="text-slate-500 text-sm font-light leading-relaxed mb-4 line-clamp-2">
                {item.description}
              </p>
            )}

            {item.image && (
              <div className="w-24 h-24 rounded-[2rem] overflow-hidden shadow-sm border-4 border-white">
                <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-4 shrink-0">
            {item.price > 0 && (
              <div className="bg-[#FF4D00] text-white px-5 py-2 rounded-2xl font-black text-2xl shadow-xl shadow-orange-100 italic">
                ${item.price}
              </div>
            )}
            <button className="px-6 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-slate-200">
              + Agregar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isUber) {
    return (
      <div className="flex justify-between items-start gap-4 p-5 border-b border-white/10 hover:bg-white/5 transition-colors group">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-lg mb-1">{item.name}</h3>
          {item.description && (
            <p className="text-gray-400 text-sm line-clamp-2 flex-grow mb-3">
              {item.description}
            </p>
          )}
          <div className="mt-auto flex items-center gap-4">
            <span className="text-white font-bold text-lg">${item.price}</span>
            <button className="text-[10px] uppercase font-black tracking-widest text-emerald-400">
              Agregar
            </button>
          </div>
        </div>
        <div className="relative shrink-0">
          {item.image && (
            <div className="w-28 h-28 rounded-xl overflow-hidden shadow-2xl">
              <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
            </div>
          )}
          <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-white text-black rounded-full shadow-2xl flex items-center justify-center">
            <span className="text-2xl font-light">+</span>
          </button>
        </div>
      </div>
    );
  }

  if (isDidi) {
    return (
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-orange-50 mb-4 flex gap-4 hover:shadow-md transition-all group">
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h3 className="font-black text-slate-800 text-lg mb-1">{item.name}</h3>
            {item.description && (
              <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 mt-4">
            <span className="text-[#FF5B00] font-black text-xl italic">${item.price}</span>
            <span className="text-xs text-slate-300 line-through font-bold">
              ${(item.price * 1.2).toFixed(0)}
            </span>
          </div>
        </div>

        <div className="relative shrink-0 self-center">
          {item.image ? (
            <div className="w-28 h-28 rounded-3xl overflow-hidden shadow-inner border border-slate-50">
              <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
            </div>
          ) : (
            <div className="w-28 h-28 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-200">
              <span className="text-4xl">+</span>
            </div>
          )}
          <button className="absolute -bottom-1 -right-1 w-9 h-9 bg-[#FF5B00] text-white rounded-2xl shadow-lg flex items-center justify-center">
            <span className="text-xl font-black">+</span>
          </button>
        </div>
      </div>
    );
  }

  // Estilos por defecto (Tradicional, Moderno, Gourmet)
  return (
    <div className={`group ${config.itemCardClass || ''} mb-12`}>
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex justify-between items-baseline mb-1">
            <h3 className={`${config.itemTitleClass} text-lg`}>{item.name}</h3>
            {item.price > 0 && <span className={`${config.priceClass} text-sm`}>${item.price}</span>}
          </div>
          {item.description && <p className="text-stone-400 text-sm font-light leading-relaxed">{item.description}</p>}
        </div>
        {item.image && (
          <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 shadow-sm border border-gray-100">
            <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
          </div>
        )}
      </div>
    </div>
  );
}
