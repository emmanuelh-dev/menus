import React from 'react';
import { ReactGallery } from './ReactGallery';

interface MotelPageRendererProps {
  place: any;
  isPreview?: boolean;
}

export default function MotelPageRenderer({ place, isPreview = false }: MotelPageRendererProps) {
  if (!place) return null;

  const { blocks = [], view_settings = {} } = place.content || {};
  const semantic_data = place.content?.semantic_data || {};
  
  const address = semantic_data.address || place.address || "";
  const mapsSearchQuery = encodeURIComponent(`${place.name} ${address || ""}`);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsSearchQuery}`;

  const renderPhoneLinks = (phoneStr: string) => {
    if (!phoneStr) return null;
    return phoneStr.split(/[,/|y]/).map((p: string, idx: number) => {
      const cleanPhone = p.trim().replace(/\D/g, '');
      if (!cleanPhone) return null;
      return (
        <a 
          key={idx}
          href={`tel:${cleanPhone}`}
          className="text-sm text-stone-600 hover:text-red-700 transition-colors"
        >
          {p.trim()}
        </a>
      );
    });
  };

  const renderWhatsappLinks = (waStr: string) => {
    if (!waStr) return null;
    return waStr.split(/[,/|y]/).map((w: string, idx: number) => {
      const cleanWA = w.trim().replace(/\D/g, '');
      if (!cleanWA) return null;
      return (
        <a 
          key={idx}
          href={`https://wa.me/${cleanWA}?text=${encodeURIComponent(`Hola, me interesa obtener información sobre ${place.name}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-stone-600 hover:text-green-600 transition-colors flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.438 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
          WhatsApp {w.trim()}
        </a>
      );
    });
  };

  return (
    <div className={`min-h-screen bg-[#0A0A0A] text-stone-300 selection:bg-red-900 selection:text-white`}>
      <div className={`${isPreview ? 'p-4' : 'max-w-3xl mx-auto px-6 py-12 md:py-24'}`}>
        {/* Header Sensual y Nocturno */}
      <header className="mb-24 flex flex-col items-center">
        <div className="relative mb-8">
          <img
            src={place.image || "/placeholder.svg"}
            alt={place.name}
            className="size-48 rounded-full transition-all duration-700 object-cover ring-1 ring-stone-200 ring-offset-4"
          />
        </div>
        <h1 className="text-5xl text-center font-light tracking-tighter serif italic mb-2 text-balance text-white">
          {place.name}
        </h1>
        <p className="text-[10px] uppercase tracking-[0.4em] text-stone-400 font-semibold mb-8 text-balance text-center">
          {semantic_data.description || place.description || place.name}
        </p>
        {address && (
          <div className="space-y-1 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 font-bold">
              Ubicación
            </p>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg text-stone-600 hover:text-red-700 transition-colors inline-flex items-center gap-2 group"
            >
              {address}
              <svg xmlns="http://www.w3.org/2000/svg" className="size-3 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}

        <div className="w-full mx-auto max-w-lg space-y-4 text-center mt-8 mb-8">
          {semantic_data.price_range && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 font-bold">Precios</p>
              <p className="text-sm text-stone-600">{semantic_data.price_range}</p>
            </div>
          )}

          {semantic_data.parking && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 font-bold">Estacionamiento</p>
              <p className="text-sm text-stone-600">{semantic_data.parking}</p>
            </div>
          )}

          {semantic_data.hours && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 font-bold">Horarios</p>
              <p className="text-sm text-stone-600 whitespace-pre-line">{semantic_data.hours}</p>
            </div>
          )}

          {semantic_data.phone && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 font-bold">Teléfono</p>
              <div className="flex flex-col gap-1 italic">
                {renderPhoneLinks(semantic_data.phone)}
              </div>
            </div>
          )}

          {semantic_data.whatsapp && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 font-bold">WhatsApp</p>
              <div className="flex flex-col gap-2 italic">
                {renderWhatsappLinks(semantic_data.whatsapp)}
              </div>
            </div>
          )}

          {semantic_data.reservation_url && (
            <div className="py-4">
              <a 
                href={semantic_data.reservation_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-red-700 text-white px-8 py-3 rounded-full text-sm font-bold tracking-widest hover:bg-black transition-colors"
              >
                RESERVAR AHORA
              </a>
            </div>
          )}

          {semantic_data.payment_options && semantic_data.payment_options.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 font-bold">Métodos de Pago</p>
              <p className="text-sm text-stone-600">{semantic_data.payment_options.join(", ")}</p>
            </div>
          )}
        </div>

        <div className="h-[1px] w-12 bg-stone-800"></div>
      </header>

      {/* Suites y Servicios */}
      <div className="space-y-32">
        {blocks.map((block: any, idx: number) => {
          if (block.type === "section") {
            return (
              <section key={block.id || idx} className="relative">
                <div className="sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-xl z-20 py-6 mb-16">
                  <h2 className="text-3xl font-light serif italic text-white tracking-tight">
                    {block.data.title}
                  </h2>
                </div>

                <div className="space-y-20">
                  {block.data.image && (
                    <div className="overflow-hidden rounded-sm group">
                      <img
                        src={block.data.image}
                        alt={block.data.title}
                        className="w-full h-80 object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000"
                      />
                    </div>
                  )}

                  <div className="grid gap-y-16">
                    {block.data.items?.map((item: any, iIdx: number) => (
                      <div key={item.id || iIdx} className="space-y-8">
                        <div className="group flex flex-col md:flex-row gap-8 items-center md:items-start transition-colors duration-500">
                          <div className="w-full">
                            <div className="flex justify-between items-baseline mb-3">
                              <h3 className="text-2xl font-light text-white group-hover:text-red-700 transition-colors">
                                {item.name}
                              </h3>
                              <div className="h-[1px] flex-1 mx-4 bg-white/5 hidden md:block" />
                              <span className="text-xl font-light text-stone-500">
                                {view_settings.show_prices && `$${item.price}`}
                              </span>
                            </div>
                            <p className="text-stone-500 text-sm font-light leading-relaxed mb-4 text-balance">
                              {item.description}
                            </p>
                            {item.features && item.features.length > 0 && (
                              <div className="flex flex-wrap gap-3 text-[9px] uppercase tracking-widest text-stone-600 font-bold">
                                {item.features.map((feature: string, fIdx: number) => (
                                  <React.Fragment key={fIdx}>
                                    <span>{feature}</span>
                                    {fIdx < item.features.length - 1 && <span>•</span>}
                                  </React.Fragment>
                                ))}
                              </div>
                            )}
                          </div>

                          {item.image && item.image.trim() !== "" && (
                            <div className="w-full md:w-48 aspect-video md:aspect-square overflow-hidden rounded-sm order-1 md:order-2 shadow-2xl">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover brightness-75 group-hover:brightness-110 transition-all duration-700"
                              />
                            </div>
                          )}
                        </div>

                        {item.gallery && item.gallery.length > 0 && (
                          <ReactGallery
                            images={item.gallery.map((img: any) => ({
                              src: img.src || img.url,
                              alt: img.alt || `${place.name} - ${item.name}`,
                              title: img.title
                            }))}
                            altPrefix={`${place.name} - ${item.name}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          if (block.type === "gallery") {
            return (
              <div key={block.id || idx} className="py-20 border-y border-white/5">
                <p className="text-center text-[10px] uppercase tracking-[0.5em] text-stone-600 mb-12">
                  Instalaciones
                </p>
                <ReactGallery
                  images={(block.data.images || []).map((img: any) => ({
                    src: img.src || img.url,
                    alt: img.alt || `${place.name} Instalaciones`,
                    title: img.title
                  }))}
                  altPrefix={`${place.name} Instalaciones`}
                />
              </div>
            );
          }
          return null;
        })}
      </div>

      {!isPreview && (
        <footer className="mt-40 pb-20 text-center">
          <p className="text-[10px] text-stone-600 uppercase tracking-[0.5em]">
            Privacy Guaranteed • {place.name} • 2026
          </p>
        </footer>
      )}
    </div>
    </div>
  );
}
