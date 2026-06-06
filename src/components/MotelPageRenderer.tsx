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
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-green-500/20"
        >
          <svg className="w-4 h-4 pointer-events-none" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
          WhatsApp
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

            <div className="flex flex-wrap gap-2">
              {!!semantic_data.phone && (
                <a
                  href={`tel:${semantic_data.phone.split(/[,/|y]/)[0].trim().replace(/\D/g, '')}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-500/20"
                >
                  <Icons.Phone />
                  Llamar
                </a>
              )}

              {!!semantic_data.whatsapp && renderWhatsappLinks(semantic_data.whatsapp)}

              {address && (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Ubicación
                </a>
              )}

              {!!semantic_data.hours && (
                <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 text-stone-300 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-blue-400"><Icons.Hours /></span>
                  {semantic_data.hours}
                </div>
              )}

              {!!semantic_data.price_range && (
                <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 text-stone-300 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  <span className={config.accent}><Icons.Price /></span>
                  {semantic_data.price_range}
                </div>
              )}

              {!!semantic_data.parking && (
                <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 text-stone-300 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-emerald-400"><Icons.Parking /></span>
                  {semantic_data.parking}
                </div>
              )}

              {Array.isArray(semantic_data.payment_options) && semantic_data.payment_options.length > 0 && (
                <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 text-stone-300 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-purple-400"><Icons.Payment /></span>
                  {semantic_data.payment_options.join(", ")}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              {!!semantic_data.reservation_url && (
                <a
                  href={semantic_data.reservation_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex-1 md:flex-none text-center ${config.accentBg} text-white px-10 py-4 rounded-2xl text-xs font-bold tracking-[0.2em]  transition-all uppercase`}
                >
                  Reservar Ahora
                </a>
              )}
            </div>
          </div>

          {/* <ins className="adsbygoogle block h-48"

            data-ad-client="ca-pub-3646138644530578"
            data-ad-slot="7426120296"
            data-ad-format="auto"
            data-full-width-responsive="true"></ins> */}
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
                                    <span key={fIdx} className="px-3 py-1 bg-white/5 rounded-full text-[10px] uppercase tracking-wider text-stone-500 font-bold">
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
          <div className="mt-24">
            <QuickFeed placeId={place.id} isInline />
          </div>
        )}

        {!isPreview && (
          <section id="reviews" data-review-section className="mt-20 border-t border-white/5 pt-12">
            {React.createElement(ReviewForm as any, {
              id: place.id,
              restaurantName: place.name,
              isAdmin: isAdmin,
              initialReviews: initialReviews as any[]
            })}
          </section>
        )}

        {!isPreview && (
          <footer className="mt-40 pb-20 text-center px-6">
            <p className="text-[10px] text-stone-600 uppercase tracking-[0.5em] mb-8">
              Privacy Guaranteed • {place.name} • 2026
            </p>

            <div className="inline-block bg-white/[0.02] border border-white/5 rounded-3xl p-8 max-w-sm">
              <p className="text-xs font-bold text-white mb-2 uppercase tracking-tight">¿Administras un motel o restaurante?</p>
              <p className="text-[10px] text-stone-500 mb-6 leading-relaxed">Moderniza tu establecimiento con un menú digital interactivo. Sube tus habitaciones, precios y servicios gratis.</p>
              <a
                href="/menu-digital-gratis"
                className={`inline-flex items-center gap-2 px-6 py-3 ${config.accentBg} text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-red-900/20`}
              >
                Crear Catálogo Gratis
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
              </a>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
