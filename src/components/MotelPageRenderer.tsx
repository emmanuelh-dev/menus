import React, { useEffect, useRef } from 'react';
import {
  DollarSign, ParkingCircle, Clock, Phone as PhoneIcon, CreditCard, Star as StarIcon,
  MapPin, Wifi, Car, Snowflake, Waves, Utensils, Martini, Tv, CircleCheck
} from 'lucide-react';
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
  Price: () => <DollarSign className="size-4" />,
  Parking: () => <ParkingCircle className="size-4" />,
  Hours: () => <Clock className="size-4" />,
  Phone: () => <PhoneIcon className="size-4" />,
  Payment: () => <CreditCard className="size-4" />,
  Location: ({ className }: { className?: string }) => <MapPin className={className || "size-4"} />,
  Star: ({ filled }: { filled?: boolean }) => (
    <StarIcon className="size-3.5" fill={filled ? "currentColor" : "none"} />
  )
};

// Mismo mapeo de amenidad -> icono que usa MotelCard.astro en los listados,
// para que la iconografía sea consistente entre el directorio y la ficha.
function amenityIcon(amenity: string) {
  const a = amenity.toLowerCase();
  if (a.includes("wifi")) return Wifi;
  if (a.includes("estacionamiento") || a.includes("cochera")) return Car;
  if (a.includes("aire")) return Snowflake;
  if (a.includes("jacuzzi") || a.includes("alberca")) return Waves;
  if (a.includes("restaurante") || a.includes("cuarto")) return Utensils;
  if (a.includes("bar")) return Martini;
  if (a.includes("tv") || a.includes("television") || a.includes("televisión")) return Tv;
  return CircleCheck;
}

function featureIcon(feature: string) {
  const f = feature.toLowerCase();
  if (f.includes("jacuzzi") || f.includes("alberca")) return Waves;
  if (f.includes("wifi")) return Wifi;
  if (f.includes("aire")) return Snowflake;
  if (f.includes("estacionamiento") || f.includes("cochera")) return Car;
  if (f.includes("tv") || f.includes("television") || f.includes("televisión")) return Tv;
  return null;
}

// Recolecta fotos únicas (portada + habitaciones + galería de instalaciones)
// para el carrusel principal del header — la sección "Instalaciones" ya no
// se muestra por separado más abajo, así que sus fotos viven solo aquí.
function collectGalleryImages(place: any, blocks: any[]) {
  const images: { src: string; alt?: string }[] = [];
  const seen = new Set<string>();
  const MAX_IMAGES = 20;

  const push = (src?: string, alt?: string) => {
    if (!src || seen.has(src) || images.length >= MAX_IMAGES) return;
    seen.add(src);
    images.push({ src, alt: alt || place.name });
  };

  push(place.image, place.name);

  for (const block of blocks) {
    if (images.length >= MAX_IMAGES) break;
    if (block.type === "section" && block.data?.items) {
      for (const item of block.data.items) {
        if (images.length >= MAX_IMAGES) break;
        push(item.image, item.name);
      }
    }
    if (block.type === "gallery" && block.data?.images) {
      for (const img of block.data.images) {
        if (images.length >= MAX_IMAGES) break;
        push(img.src || img.url, img.alt);
      }
    }
  }

  return images;
}

function collectMinPrice(blocks: any[]): number | null {
  let min: number | null = null;
  for (const block of blocks) {
    if (block.type !== "section" || !block.data?.items) continue;
    for (const item of block.data.items) {
      const n = typeof item.price === "number" ? item.price : parseFloat(String(item.price ?? "").replace(/[^0-9.]/g, ""));
      if (!isNaN(n) && n > 0) min = min === null ? n : Math.min(min, n);
    }
  }
  return min;
}

export default function MotelPageRenderer({
  place,
  isPreview = false,
  isAdmin = false,
  initialReviews = [] as any[]
}: MotelPageRendererProps) {
  const adPushed = useRef(false);

  useEffect(() => {
    if (isPreview || !place || adPushed.current) return;
    adPushed.current = true;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (error) {
      console.error("adsbygoogle push failed:", error);
    }
  }, [isPreview, place]);

  if (!place) return null;

  const { blocks = [], view_settings = {} } = place.content || {};
  const semantic_data = place.content?.semantic_data || {};
  const template = view_settings.template || "default";

  const templateConfigs: Record<string, any> = {
    default: {
      bg: "bg-[#0A0A0A]",
      text: "text-stone-300",
      accent: "text-pink-500",
      accentBg: "bg-pink-600",
      accentBorder: "border-pink-500/20",
      cardBg: "bg-white/[0.03]",
      cardHover: "hover:bg-white/[0.05]",
      selection: "selection:bg-pink-900 font-sans",
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

  const galleryImages = collectGalleryImages(place, blocks);
  const heroImage = galleryImages[0]?.src || place.image || "/placeholder.svg";
  const minPrice = collectMinPrice(blocks);
  // Los precios siempre se muestran (decisión del negocio: nunca ocultarlos,
  // sin importar view_settings.show_prices) — antes de este cambio, places
  // sin ese flag seteado explícitamente (la mayoría, contenido nunca
  // recompilado por Go, ver ESTADO.md) no mostraban precio en la página
  // aunque el <title>/meta de MotelLayout.astro sí lo anunciara.
  const showPrices = true;

  const firstWhatsapp = semantic_data.whatsapp
    ? semantic_data.whatsapp.split(/[,/|y]/)[0].trim().replace(/\D/g, '')
    : null;

  const renderWhatsappLinks = (waStr: string, message?: string) => {
    if (!waStr) return null;
    return waStr.split(/[,/|y]/).map((w: string, idx: number) => {
      const cleanWA = w.trim().replace(/\D/g, '');
      if (!cleanWA) return null;
      return (
        <a
          key={idx}
          href={`https://wa.me/${cleanWA}?text=${encodeURIComponent(message || `Hola, me interesa obtener información sobre ${place.name}`)}`}
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
      <div className={`${isPreview ? 'p-4' : `max-w-3xl mx-auto p-4 pt-0 ${!isPreview ? 'pb-28' : ''}`}`}>
        <header className="mb-8">
          {/* Título y meta arriba de la galería, al estilo Airbnb */}
          <div className="mb-4">
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-white mb-2">
              {place.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <span className="text-amber-400"><Icons.Star filled /></span>
                {place.rating || "5.0"}
                <span className="text-stone-400 font-normal">({place.count || 0} opiniones)</span>
              </div>

              {address && (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-400 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Icons.Location className={`size-4 ${config.accent}`} />
                  {address}
                </a>
              )}
            </div>
          </div>

          {/* Carrusel compacto (antes: grid estilo Airbnb de hasta 420px de
              alto + galería aparte debajo — mucho scroll para llegar al resto
              de la ficha). Una sola fila deslizable, siempre baja altura. */}
          <div className="mb-6 rounded-2xl overflow-hidden shadow-2xl">
            <ReactGallery
              images={galleryImages.length > 0 ? galleryImages : [{ src: heroImage, alt: place.name }]}
              altPrefix={place.name}
              layout="scroll"
            />
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {!!semantic_data.phone && (
                <a
                  href={`tel:${semantic_data.phone.split(/[,/|y]/)[0].trim().replace(/\D/g, '')}`}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 ${config.accentBg} text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg`}
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
                  <Icons.Location className="size-4" />
                  Ubicación
                </a>
              )}
            </div>

            <p className="text-sm text-stone-400 leading-relaxed max-w-2xl">
              {semantic_data.description || place.description || place.name}
            </p>

            <div className="flex flex-wrap gap-2">
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

            {!!semantic_data.reservation_url && (
              <a
                href={semantic_data.reservation_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-block text-center ${config.accentBg} text-white px-10 py-4 rounded-2xl text-xs font-bold tracking-[0.2em] transition-all uppercase`}
              >
                Reservar Ahora
              </a>
            )}
          </div>
        </header>

        {/* Lo que ofrece este lugar */}
        {Array.isArray(place.amenities) && place.amenities.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-white tracking-tight mb-4">Lo que ofrece este lugar</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
              {place.amenities.map((amenity: string, idx: number) => {
                const Icon = amenityIcon(amenity);
                return (
                  <div key={idx} className="flex items-center gap-2.5 text-sm text-stone-300">
                    <Icon className={`size-4 shrink-0 ${config.accent}`} />
                    <span className="truncate">{amenity}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Suites y Servicios */}
        <div className="space-y-12">
          {blocks.map((block: any, idx: number) => {
            if (block.type === "section") {
              return (
                <section key={block.id || idx} className="relative">
                  <div className="flex items-center gap-4 mb-3">
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      {block.data.title}
                    </h2>
                    <div className="h-[1px] flex-1 bg-white/10"></div>
                  </div>

                  {block.data.image && (
                    <div className="mb-6 overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
                      <img
                        src={block.data.image}
                        alt={block.data.title}
                        className="w-full h-36 sm:h-52 object-cover"
                      />
                    </div>
                  )}

                  {block.data.description && (
                    <p className="text-stone-400 text-sm italic mb-6 px-4 border-l-2 border-stone-800">
                      {block.data.description}
                    </p>
                  )}

                  <div className="grid gap-5">
                    {block.data.items?.map((item: any, iIdx: number) => (
                      <div key={item.id || iIdx} className={`${config.cardBg} border border-white/5 rounded-2xl overflow-hidden ${config.cardHover} transition-all duration-500 group`}>
                        <div className="flex flex-col md:flex-row">
                          {item.image && item.image.trim() !== "" && (
                            <div className="w-full md:w-56 aspect-[16/10] md:aspect-square overflow-hidden shrink-0">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              />
                            </div>
                          )}

                          <div className="flex-1 p-5 md:p-6 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start gap-3 mb-2">
                                <h3 className="text-xl font-bold text-white transition-colors">
                                  {item.name}
                                </h3>
                                {showPrices && !!item.price && (
                                  <span className={`text-lg font-bold ${config.accent} whitespace-nowrap`}>
                                    ${item.price}
                                  </span>
                                )}
                              </div>

                              <p className="text-stone-400 text-xs leading-relaxed mb-4 line-clamp-3">
                                {item.description}
                              </p>

                              {item.features && item.features.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                  {item.features.map((feature: string, fIdx: number) => {
                                    const FeatIcon = featureIcon(feature);
                                    return (
                                      <span key={fIdx} className="inline-flex items-center gap-1 px-3 py-1 bg-white/5 rounded-full text-[9px] uppercase tracking-wider text-stone-400 font-bold">
                                        {FeatIcon && <FeatIcon className="size-3" />}
                                        {feature}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {item.gallery && item.gallery.length > 0 && (
                              <div className="pt-3 border-t border-white/5 mb-4">
                                <ReactGallery
                                  images={item.gallery.map((img: any) => ({
                                    src: img.src || img.url,
                                    alt: img.alt || `${place.name} - ${item.name}`,
                                    title: img.title
                                  }))}
                                  altPrefix={`${place.name} - ${item.name}`}
                                  size="sm"
                                />
                              </div>
                            )}

                            {firstWhatsapp && (
                              <div>
                                {renderWhatsappLinks(
                                  firstWhatsapp,
                                  `Hola, me interesa la habitación "${item.name}" de ${place.name}`
                                )}
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

            return null;
          })}
        </div>
        {!isPreview && (
          <div className="mt-8 flex flex-col items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-widest text-stone-600">Publicidad</span>
            <ins className="adsbygoogle"
              style={{ display: "inline-block", width: "400px", height: "90px" }}
              data-ad-client="ca-pub-3646138644530578"
              data-ad-slot="7914990909"></ins>
          </div>
        )}
        {!isPreview && (
          <div className="mt-12">
            <QuickFeed placeId={place.id} isInline />
          </div>
        )}

        {!isPreview && (
          <section id="reviews" data-review-section className="mt-10 border-t border-white/5 pt-6">
            <h2 className="text-xl font-bold text-white tracking-tight mb-4">Opiniones de huéspedes</h2>
            {React.createElement(ReviewForm as any, {
              id: place.id,
              restaurantName: place.name,
              isAdmin: isAdmin,
              initialReviews: initialReviews as any[]
            })}
          </section>
        )}

        {!isPreview && (
          <footer className="mt-16 pb-10 text-center px-6">
            <p className="text-[10px] text-stone-600 uppercase tracking-[0.5em] mb-8">
              Sitio verificado • {place.name} • {new Date().getFullYear()}
            </p>

            <div className="inline-block bg-white/[0.02] border border-white/5 rounded-2xl p-8 max-w-sm">
              <p className="text-xs font-bold text-white mb-2 uppercase tracking-tight">¿Administras un motel o restaurante?</p>
              <p className="text-[10px] text-stone-500 mb-6 leading-relaxed">Moderniza tu establecimiento con un menú digital interactivo. Sube tus habitaciones, precios y servicios gratis.</p>
              <a
                href="/menu-digital-gratis"
                className={`inline-flex items-center gap-2 px-6 py-3 ${config.accentBg} text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl`}
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
