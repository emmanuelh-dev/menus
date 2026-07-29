import React, { useState, useRef, useEffect } from 'react';

interface CarouselItem {
  src: string;
  alt?: string;
  link?: string;
  caption?: string;
}

interface CarouselProps {
  items: CarouselItem[];
  className?: string;
  autoPlay?: boolean;
  interval?: number;
}

export default function Carousel({ items, className = "", autoPlay = true, interval = 5000 }: CarouselProps) {
  // Para el scroll infinito clonamos el primero y el último
  const extendedItems = items.length > 1 ? [items[items.length - 1], ...items, items[0]] : items;

  const [activeIndex, setActiveIndex] = useState(0); // Índice del item real (0 a items.length - 1)
  const scrollRef = useRef<HTMLDivElement>(null);
  const isJumping = useRef(false);
  const autoPlayTimer = useRef<NodeJS.Timeout | null>(null);

  if (!items || items.length === 0) return null;

  const getRealIndex = (scrollLeft: number, clientWidth: number) => {
    const rawIndex = Math.round(scrollLeft / clientWidth);
    if (items.length <= 1) return 0;

    // Ajustamos el índice real basado en los clones
    if (rawIndex === 0) return items.length - 1;
    if (rawIndex === items.length + 1) return 0;
    return rawIndex - 1;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || items.length <= 1) return;

    // Empezar en el primer elemento real (índice 1 del extended)
    el.scrollLeft = el.clientWidth;

    const handleScroll = () => {
      if (isJumping.current) return;

      const { scrollLeft, clientWidth } = el;
      if (clientWidth === 0) return;

      const rawIndex = Math.round(scrollLeft / clientWidth);

      // Actualizar el puntito indicador
      setActiveIndex(getRealIndex(scrollLeft, clientWidth));

      // Lógica de salto infinito "silencioso"
      if (scrollLeft <= 0) {
        // Estamos en el clon del último, saltar al último real
        isJumping.current = true;
        el.style.scrollBehavior = 'auto';
        el.scrollLeft = items.length * clientWidth;
        setTimeout(() => {
          el.style.scrollBehavior = 'smooth';
          isJumping.current = false;
        }, 50);
      } else if (scrollLeft >= (items.length + 1) * clientWidth) {
        // Estamos en el clon del primero, saltar al primero real
        isJumping.current = true;
        el.style.scrollBehavior = 'auto';
        el.scrollLeft = clientWidth;
        setTimeout(() => {
          el.style.scrollBehavior = 'smooth';
          isJumping.current = false;
        }, 50);
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [items.length]);

  // Auto-play logic
  useEffect(() => {
    if (!autoPlay || items.length <= 1) return;

    const startAutoPlay = () => {
      autoPlayTimer.current = setInterval(() => {
        if (scrollRef.current) {
          const { scrollLeft, clientWidth } = scrollRef.current;
          scrollRef.current.scrollTo({
            left: scrollLeft + clientWidth,
            behavior: 'smooth'
          });
        }
      }, interval);
    };

    startAutoPlay();
    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, [autoPlay, interval, items.length]);

  const scrollTo = (index: number) => {
    if (scrollRef.current) {
      // +1 porque el índice 0 es el clon del último
      scrollRef.current.scrollTo({
        left: (index + 1) * scrollRef.current.clientWidth,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className={`w-full relative group ${className}`}>
      {/* Contenedor con scroll táctil habilitado */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide touch-auto"
        style={{
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth'
        }}
      >
        {extendedItems.map((item, index) => (
          <div
            key={`${index}-${item.src}`}
            className="flex-none w-full snap-center"
          >
            {item.link ? (
              <a href={item.link} className="block w-full">
                <img
                  src={item.src}
                  alt={item.alt || item.caption || `Slide ${index}`}
                  className="w-full h-auto object-cover pointer-events-none"
                  loading={index === 1 ? "eager" : "lazy"}
                />
              </a>
            ) : (
              <img
                src={item.src}
                alt={item.alt || item.caption || `Slide ${index}`}
                className="w-full h-auto object-cover pointer-events-none"
              />
            )}
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`w-3 h-3 rounded-full transition-all border ${activeIndex === index
                ? 'bg-marca-500 scale-125 border-marca-600'
                : 'bg-neutral-300 border-neutral-400'
                }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}