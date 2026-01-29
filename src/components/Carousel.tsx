import React from 'react';

interface CarouselItem {
  src: string;
  alt?: string;
  link?: string;
  caption?: string;
}

interface CarouselProps {
  items: CarouselItem[];
}

export default function Carousel({ items }: CarouselProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="relative group/carousel w-full h-full overflow-hidden rounded-none bg-stone-100">
      <div
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide h-full"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item, index) => (
          <div
            key={index}
            className="flex-none w-full h-full snap-start relative"
          >
            {item.link ? (
              <a href={item.link} className="block w-full h-full">
                <img
                  src={item.src}
                  alt={item.alt || item.caption || `Promoción ${index + 1}`}
                  className="w-full h-full object-contain bg-stone-900"
                />
              </a>
            ) : (
              <img
                src={item.src}
                alt={item.alt || item.caption || `Promoción ${index + 1}`}
                className="w-full h-full object-contain bg-stone-900"
              />
            )}

            {item.caption && (
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white">
                <p className="text-sm md:text-lg font-bold uppercase tracking-widest drop-shadow-md">
                  {item.caption}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Indicadores visuales (puntos) */}
      {items.length > 1 && (
        <div className="absolute bottom-4 right-6 flex gap-2">
          {items.map((_, index) => (
            <div
              key={index}
              className="w-1.5 h-1.5 rounded-full bg-white/40 border border-white/20"
            />
          ))}
        </div>
      )}

      {/* Instrucción de scroll para mobile */}
      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black/20 to-transparent flex items-center justify-center sm:hidden pointer-events-none opacity-50">
        <span className="text-white text-xs rotate-90 whitespace-nowrap font-black tracking-widest">SCROLL →</span>
      </div>
    </div>
  );
}
