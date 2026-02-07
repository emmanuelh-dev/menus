import React from 'react';
import { PiPhone, PiMapPin, PiClock, PiWhatsappLogo } from 'react-icons/pi';

interface Props {
  place: any;
  template?: string;
}

export default function RestaurantPreview({ place, template = 'default' }: Props) {
  const { blocks = [], semantic_data = {} } = place.content || {};

  const templateConfigs: Record<string, any> = {
    default: {
      bg: "bg-[#FCFCFC]",
      text: "text-[#1A1A1A]",
      headerClass: "text-center",
      titleClass: "text-4xl font-bold italic",
      sectionTitleClass: "text-xl uppercase tracking-widest font-black text-stone-800",
      itemTitleClass: "text-lg font-medium tracking-tight",
      priceClass: "text-stone-600 font-bold",
    },
    modern: {
      bg: "bg-white",
      text: "text-gray-900",
      headerClass: "text-left border-l-4 border-black pl-6",
      titleClass: "text-5xl font-black uppercase tracking-tighter leading-none",
      sectionTitleClass: "text-3xl font-black tracking-tighter text-gray-900",
      itemTitleClass: "text-xl font-bold tracking-tight",
      priceClass: "text-blue-600 font-bold",
    },
    elegant: {
      bg: "bg-stone-50",
      text: "text-stone-900",
      headerClass: "text-center py-8",
      titleClass: "text-5xl font-light italic tracking-tight",
      sectionTitleClass: "text-2xl serif italic tracking-widest text-stone-800",
      itemTitleClass: "text-lg font-semibold tracking-wide",
      priceClass: "text-amber-700 font-bold",
    },
    vibrant: {
      bg: "bg-[#f4f7f4]",
      text: "text-slate-900",
      headerClass: "text-center py-8 bg-white/50 rounded-b-[40px] shadow-sm mb-6",
      titleClass: "text-4xl font-black uppercase tracking-tighter text-green-700",
      sectionTitleClass: "text-lg font-black uppercase tracking-widest text-white bg-green-600 px-6 py-2 rounded-2xl inline-block shadow-lg",
      itemTitleClass: "text-md font-black tracking-tight text-gray-800",
      priceClass: "text-[#FF4D00] font-black italic text-lg",
      itemCardClass: "bg-white p-4 rounded-3xl shadow-sm border border-green-50/50 mb-3",
    }
  };

  const config = templateConfigs[template] || templateConfigs.default;

  return (
    <div className={`w-full max-w-2xl mx-auto min-h-screen shadow-2xl overflow-hidden ${config.bg} ${config.text} font-sans`}>
      {/* Hero */}
      <div className="relative h-64 bg-gray-200 overflow-hidden">
        {place.image ? (
          <img src={place.image} className="w-full h-full object-cover" alt={place.name} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-stone-900">
            <span className="text-4xl font-black opacity-20">{place.name}</span>
          </div>
        )}
      </div>

      {/* Header Info */}
      <div className={`p-6 ${config.headerClass}`}>
        <h1 className={`${config.titleClass} mb-4`}>{place.name}</h1>

        <div className="flex flex-wrap justify-center gap-2">
          {semantic_data.phone && <span className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded-full text-[10px] font-bold uppercase"><PiPhone /> Llamar</span>}
          {semantic_data.whatsapp && <span className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-full text-[10px] font-bold uppercase"><PiWhatsappLogo /> WhatsApp</span>}
          <span className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-full text-[10px] font-bold uppercase"><PiMapPin /> Ubicación</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-10">
        {blocks.map((block: any, bIdx: number) => {
          if (block.type === 'section') {
            const isVibrant = template === 'vibrant';
            return (
              <div key={block.id || bIdx} className="space-y-6">
                <div className={isVibrant ? 'text-center' : ''}>
                  <div className={`${config.sectionTitleClass} flex items-center justify-between gap-4 w-full`}>
                    <span>{block.data.title}</span>
                    {isVibrant && <span className="text-[10px] opacity-70 font-normal normal-case">Deliciosos</span>}
                  </div>
                </div>

                {block.data.description && (
                  <p className="text-gray-500 text-xs italic border-l-2 border-gray-200 px-4">{block.data.description}</p>
                )}

                <div className="space-y-4">
                  {block.data.items?.map((item: any, iIdx: number) => (
                    <div key={item.id || iIdx} className={`group ${config.itemCardClass || ''} relative overflow-hidden`}>
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between items-baseline mb-1">
                            <h3 className={config.itemTitleClass}>{item.name}</h3>
                            {item.price > 0 && !isVibrant && <span className={config.priceClass}>${item.price}</span>}
                          </div>
                          {item.description && <p className="text-gray-500 text-[11px] leading-relaxed mb-2">{item.description}</p>}

                          {/* Vibrant Style Price Badge */}
                          {item.price > 0 && isVibrant && (
                            <div className="inline-block bg-[#FF4D00] text-white px-4 py-1.5 rounded-xl font-black text-lg shadow-md italic">
                              ${item.price}
                            </div>
                          )}
                        </div>
                        {item.image && (
                          <div className="w-24 h-24 rounded-3xl overflow-hidden shrink-0 shadow-sm border-4 border-white">
                            <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>

      <footer className="p-10 text-center border-t border-gray-100 mt-20">
        <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest">Potenciado por BYSMAX</p>
      </footer>
    </div>
  );
}
