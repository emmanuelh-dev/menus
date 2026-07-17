import React, { useState } from 'react';

interface ImageData {
  src: string;
  alt?: string;
  title?: string;
}

interface ReactGalleryProps {
  images: ImageData[];
  altPrefix?: string;
  layout?: 'grid' | 'scroll';
  size?: 'sm' | 'md';
}

export const ReactGallery: React.FC<ReactGalleryProps> = ({
  images,
  altPrefix = 'Imagen',
  layout = 'scroll',
  size = 'md'
}) => {
  if (!images || images.length === 0) return null;

  const galleryId = `gallery-${Math.random().toString(36).substr(2, 9)}`;

  if (layout === 'scroll') {
    const sizeClasses = size === 'sm'
      ? 'w-32 h-24 md:w-40 md:h-28'
      : 'w-60 h-[260px] md:w-80 md:h-[308px]';
    return (
      <div className="relative w-full">
        <style>{`
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
        <div className="flex overflow-x-auto gap-4 py-2 scroll-smooth snap-x snap-mandatory no-scrollbar -mx-4 px-4 md:-mx-0 md:px-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          {images.map((image, index) => {
            const displayUrl = typeof image.src === 'string' ? image.src : (image.src as any)?.src || '';
            return (
              <div
                key={index}
                className={`relative flex-shrink-0 ${sizeClasses} rounded-2xl overflow-hidden snap-start cursor-pointer group shadow-lg border border-white/5 bg-white/[0.02] transition-all duration-300`}
              >
                <img
                  src={displayUrl}
                  alt={image.alt || `${altPrefix} ${index + 1}`}
                  className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                  loading="lazy"
                />
                
                {image.title && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 pt-8">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-white font-semibold">
                      {image.title}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <style>{`
        #${galleryId}-check:checked ~ .gallery-grid .gallery-item-hidden {
          display: flex !important;
        }
        #${galleryId}-check:checked ~ .gallery-footer {
          display: none !important;
        }
      `}</style>
      
      <input type="checkbox" id={`${galleryId}-check`} className="hidden" />
      
      <div className="gallery-grid grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-[150px] md:auto-rows-[200px]">
        {images.map((image, index) => {
          const isFeatured = index === 0 || index === 5;
          const isHidden = index >= 10;
          const displayUrl = typeof image.src === 'string' ? image.src : (image.src as any)?.src || '';
          
          return (
            <div 
              key={index}
              className={`relative overflow-hidden rounded-sm cursor-pointer group transition-all duration-700 ease-out shadow-sm
                     ${isFeatured ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1'}
                     ${isHidden ? 'gallery-item-hidden hidden' : 'flex'}`}
            >
              <img
                src={displayUrl}
                alt={image.alt || `${altPrefix} Galería ${String(index + 1).padStart(2, '0')}`}
                className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                loading="lazy"
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-4">
                {image.title && (
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white font-light">
                    {image.title}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {images.length > 10 && (
        <label 
          htmlFor={`${galleryId}-check`}
          className="gallery-footer flex justify-center mt-12 cursor-pointer"
        >
          <div className="group flex flex-col items-center gap-2 outline-none">
            <span className="text-[10px] uppercase tracking-[0.4em] text-stone-300 group-hover:text-white transition-colors">
              Ver Galería Completa
            </span>
            <div className="h-[1px] w-8 bg-stone-700 group-hover:w-16 group-hover:bg-white transition-all duration-500"></div>
          </div>
        </label>
      )}
    </div>
  );
};
