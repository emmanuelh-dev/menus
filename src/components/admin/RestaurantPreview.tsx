import React from 'react';
import { PiPhone, PiMapPin, PiClock, PiWhatsappLogo } from 'react-icons/pi';
import MenuItemPreview from './MenuItemPreview';

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
      titleClass: "text-4xl md:text-6xl font-bold italic drop-shadow-2xl",
      sectionTitleClass: "text-xl uppercase tracking-[0.3em] font-black text-stone-800",
      itemTitleClass: "text-lg font-medium tracking-tight",
      priceClass: "text-stone-500 font-bold",
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
      headerClass: "text-center py-10",
      titleClass: "text-5xl md:text-7xl font-black uppercase tracking-tighter text-green-700 drop-shadow-sm",
      sectionTitleClass: "text-xl font-black uppercase tracking-widest text-white bg-green-600 px-8 py-3 rounded-2xl inline-block shadow-lg",
    },
    uber: {
      bg: "bg-[#121212]",
      text: "text-white",
      headerClass: "text-left py-10 px-6 bg-gradient-to-b from-[#1a1a1a] to-[#121212]",
      titleClass: "text-3xl font-bold",
      sectionTitleClass: "text-xl font-bold border-b border-white/10 pb-4 mb-4",
    },
    didi: {
      bg: "bg-[#F8F8F8]",
      text: "text-gray-900",
      headerClass: "text-center py-10 bg-white shadow-sm mb-6",
      titleClass: "text-3xl font-black italic text-[#FF5B00]",
      sectionTitleClass: "text-lg font-bold text-gray-800 mb-4 bg-gray-100/50 px-4 py-2 rounded-lg",
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

        <div className="flex flex-wrap justify-center sm:justify-start gap-2">
          {semantic_data.phone && <span className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm"><PiPhone /> Llamar</span>}
          {semantic_data.whatsapp && <span className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm"><PiWhatsappLogo /> WhatsApp</span>}
          <span className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm"><PiMapPin /> Ubicación</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-10">
        {blocks.map((block: any, bIdx: number) => {
          if (block.type === 'section') {
            const isVibrant = template === 'vibrant';
            return (
              <div key={block.id || bIdx} className="space-y-4">
                <div className={isVibrant ? 'text-center' : ''}>
                  <div className={`${config.sectionTitleClass} flex items-center justify-between gap-4 w-full`}>
                    <span>{block.data.title}</span>
                    {isVibrant && <span className="text-[10px] opacity-70 font-normal normal-case">Menú del Día</span>}
                  </div>
                </div>

                {block.data.description && (
                  <p className="text-stone-400 text-sm font-normal italic mb-8 px-4 opacity-80 leading-relaxed">{block.data.description}</p>
                )}

                <div className="pt-2">
                  {block.data.items?.map((item: any, iIdx: number) => (
                    <MenuItemPreview
                      key={item.id || iIdx}
                      item={item}
                      config={config}
                      template={template}
                    />
                  ))}
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>

      <footer className="p-10 text-center border-t border-gray-100/10 mt-20 opacity-40 hover:opacity-100 transition-opacity">
        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Potenciado por BYSMAX</p>
      </footer>
    </div>
  );
}
