import React from 'react';
import { ReactGallery } from './ReactGallery';
import ReviewForm from './ReviewForm';
import QuickFeed from './QuickFeed';

interface MotelPageRendererProps {
  place: any;
  isPreview?: boolean;
  isAdmin?: boolean;
  initialReviews?: any[];
}

const Icons = {
  Price: () => <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>,
  Parking: () => <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h3a2 2 0 110 4H8m0 0v4m0-4H7m11-8a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Hours: () => <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Phone: () => <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
  Payment: () => <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
  Star: ({ filled }: { filled?: boolean }) => (
    <svg className="size-3.5" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  )
};

export default function MotelPageRenderer({
  place,
  isPreview = false,
  isAdmin = false,
  initialReviews = [] as any[]
}: MotelPageRendererProps) {
  if (!place) return null;

  const { blocks = [], view_settings = {} } = place.content || {};
  const semantic_data = place.content?.semantic_data || {};
  const template = view_settings.template || "default";

  const templateConfigs: Record<string, any> = {
    default: {
      bg: "bg-[#0A0A0A]",
      text: "text-stone-300",
      accent: "text-red-500",
      accentBg: "bg-red-700",
      accentBorder: "border-red-500/20",
      cardBg: "bg-white/[0.03]",
      cardHover: "hover:bg-white/[0.05]",
      selection: "selection:bg-red-900 font-sans",
      customFont: "'Inter', sans-serif"
    },
    classic: {
      bg: "bg-[#050505]",
      text: "text-stone-200",
      accent: "text-[#D4AF37]",
      accentBg: "bg-[#D4AF37] text-black",
      accentBorder: "border-[#D4AF37]/30",
      cardBg: "bg-[#D4AF37]/[0.02]",
      cardHover: "hover:bg-[#D4AF37]/[0.05]",
      selection: "selection:bg-[#D4AF37] selection:text-black font-serif",
      customFont: "'Playfair Display', serif"
    },
    night: {
      bg: "bg-black",
      text: "text-pink-100",
      accent: "text-pink-500",
      accentBg: "bg-pink-600",
      accentBorder: "border-pink-500/20",
      cardBg: "bg-pink-500/[0.02]",
      cardHover: "hover:bg-pink-500/[0.05]",
      selection: "selection:bg-pink-900 font-sans",
      customFont: "'Inter', sans-serif"
    }
  };

  const config = templateConfigs[template] || templateConfigs.default;

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
          className="hover:text-white transition-colors"
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
          className={`border ${config.accentBorder} px-6 py-4 rounded-2xl text-[10px] uppercase tracking-widest ${config.accent} hover:bg-white/5 transition-all flex items-center gap-3 group font-bold`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.438 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
          </svg>
          Chatear {w.trim()}
        </a>
      );
    });
  };

  return (
    <div className={`min-h-screen ${config.bg} ${config.text} ${config.selection}`} style={{ fontFamily: config.customFont }}>
      <div className={`${isPreview ? 'p-4' : 'max-w-3xl mx-auto p-4 pt-0'}`}>
        {/* Header Estilo App Moderna */}
        <header className="mb-16">
          <div className="relative mb-10 overflow-hidden rounded-[2.5rem] shadow-2xl">
            <img
              src={place.image || "/placeholder.svg"}
              alt={place.name}
              className="w-full aspect-[4/3] md:aspect-video object-cover transition-transform duration-1000 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

            <div className="absolute bottom-8 left-8 right-8">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">
                {place.name}
              </h1>

              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-1 bg-amber-500/90 text-black px-2 py-0.5 rounded-lg font-bold text-sm">
                  <Icons.Star filled />
                  {place.rating || "5.0"}
                </div>
                <span className="text-stone-400 text-xs uppercase tracking-widest font-medium">
                  {place.count || 0} REVOLUCIONES
                </span>
              </div>

              {address && (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-stone-300 hover:text-white transition-colors flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`size-4 ${config.accent}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {address}
                </a>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <p className="text-base text-stone-400 leading-relaxed max-w-2xl italic">
              "{semantic_data.description || place.description || place.name}"
            </p>

            <div className="flex flex-wrap gap-3">
              {!!semantic_data.price_range && (
                <div className={`flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl group hover:bg-white/10 transition-all`}>
                  <span className={config.accent}><Icons.Price /></span>
                  <span className="text-xs uppercase tracking-wider text-stone-200 font-semibold">{semantic_data.price_range}</span>
                </div>
              )}

              {!!semantic_data.hours && (
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl group hover:bg-white/10 transition-all">
                  <span className="text-blue-500"><Icons.Hours /></span>
                  <span className="text-xs uppercase tracking-wider text-stone-200 font-semibold">{semantic_data.hours}</span>
                </div>
              )}

              {!!semantic_data.parking && (
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl group hover:bg-white/10 transition-all">
                  <span className="text-emerald-500"><Icons.Parking /></span>
                  <span className="text-xs uppercase tracking-wider text-stone-200 font-semibold">{semantic_data.parking}</span>
                </div>
              )}

              {!!semantic_data.phone && (
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl group hover:bg-white/10 transition-all">
                  <span className="text-amber-500"><Icons.Phone /></span>
                  <div className="flex gap-3 text-xs uppercase tracking-wider text-stone-200 font-semibold">
                    {renderPhoneLinks(semantic_data.phone)}
                  </div>
                </div>
              )}

              {Array.isArray(semantic_data.payment_options) && semantic_data.payment_options.length > 0 && (
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl group hover:bg-white/10 transition-all">
                  <span className="text-purple-500"><Icons.Payment /></span>
                  <span className="text-xs uppercase tracking-wider text-stone-200 font-semibold">
                    {semantic_data.payment_options.join(", ")}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              {!!semantic_data.whatsapp && (
                <div className="flex gap-4">
                  {renderWhatsappLinks(semantic_data.whatsapp)}
                </div>
              )}

              {!!semantic_data.reservation_url && (
                <a
                  href={semantic_data.reservation_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex-1 md:flex-none text-center ${config.accentBg} text-white px-10 py-4 rounded-2xl text-xs font-bold tracking-[0.2em] shadow-lg transition-all uppercase`}
                >
                  Reservar Ahora
                </a>
              )}
            </div>
          </div>

          <ins className="adsbygoogle block h-48"

            data-ad-client="ca-pub-3646138644530578"
            data-ad-slot="7426120296"
            data-ad-format="auto"
            data-full-width-responsive="true"></ins>
        </header>

        {/* Suites y Servicios */}
        <div className="space-y-24">
          {blocks.map((block: any, idx: number) => {
            if (block.type === "section") {
              return (
                <section key={block.id || idx} className="relative">
                  <div className="flex items-center gap-4 mb-4">
                    <h2 className="text-3xl font-bold text-white tracking-tight">
                      {block.data.title}
                    </h2>
                    <div className="h-[1px] flex-1 bg-white/10"></div>
                  </div>

                  {block.data.image && (
                    <div className="mb-10 overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl">
                      <img
                        src={block.data.image}
                        alt={block.data.title}
                        className="w-full h-48 sm:h-80 object-cover"
                      />
                    </div>
                  )}

                  {block.data.description && (
                    <p className="text-stone-400 text-sm italic mb-10 px-4 border-l-2 border-stone-800">
                      {block.data.description}
                    </p>
                  )}

                  <div className="grid gap-8">
                    {block.data.items?.map((item: any, iIdx: number) => (
                      <div key={item.id || iIdx} className={`${config.cardBg} border border-white/5 rounded-[2rem] overflow-hidden ${config.cardHover} transition-all duration-500 group`}>
                        <div className="flex flex-col md:flex-row">
                          {item.image && item.image.trim() !== "" && (
                            <div className="w-full md:w-72 aspect-[4/3] md:aspect-square overflow-hidden">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              />
                            </div>
                          )}

                          <div className="flex-1 p-8 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-4">
                                <h3 className={`text-2xl font-bold text-white group-hover:${config.accent.replace('text-', '')} transition-colors`}>
                                  {item.name}
                                </h3>
                                <span className={`text-xl font-bold ${config.accent}`}>
                                  {view_settings.show_prices && `$${item.price}`}
                                </span>
                              </div>

                              <p className="text-stone-400 text-sm leading-relaxed mb-6 line-clamp-3">
                                {item.description}
                              </p>

                              {item.features && item.features.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-6">
                                  {item.features.map((feature: string, fIdx: number) => (
                                    <span key={fIdx} className="px-3 py-1 bg-white/5 rounded-lg text-[10px] uppercase tracking-wider text-stone-500 font-bold">
                                      {feature}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {item.gallery && item.gallery.length > 0 && (
                              <div className="pt-4 border-t border-white/5">
                                <ReactGallery
                                  images={item.gallery.map((img: any) => ({
                                    src: img.src || img.url,
                                    alt: img.alt || `${place.name} - ${item.name}`,
                                    title: img.title
                                  }))}
                                  altPrefix={`${place.name} - ${item.name}`}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
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
          <div className="mt-32">
            <QuickFeed placeId={place.id} isInline />
          </div>
        )}

        {!isPreview && (
          <section className="mt-40 border-t border-white/5 pt-20">
            {React.createElement(ReviewForm as any, {
              id: place.id,
              restaurantName: place.name,
              isAdmin: isAdmin,
              initialReviews: initialReviews as any[]
            })}
          </section>
        )}

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
