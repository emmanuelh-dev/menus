import { useRef, useEffect } from 'react';
import type { Block } from './types';

interface SectionNavProps {
  blocks: Block[];
  activeSectionId: string | null;
  onScrollTo: (id: string) => void;
}

export function SectionNav({ blocks, activeSectionId, onScrollTo }: SectionNavProps) {
  const sections = blocks.filter(b => b.type === 'section');
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeSectionId && navRef.current) {
      const activeBtn = navRef.current.querySelector(`[data-section-id="${activeSectionId}"]`);
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeSectionId]);

  if (sections.length === 0) return null;

  return (
    <div className="sticky top-0 md:top-14 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 py-3 shadow-sm transition-all overflow-hidden shrink-0">
      <div
        ref={navRef}
        className="max-w-[1600px] mx-auto px-4 overflow-x-auto hide-scrollbar flex gap-2 scroll-smooth items-center"
      >
        <div className="flex-shrink-0 mr-2 text-gray-400">
          <span className="text-[9px] font-black uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-md">Categorías:</span>
        </div>
        {sections.map((section) => (
          <button
            key={section.id}
            data-section-id={section.id}
            onClick={() => onScrollTo(section.id)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${activeSectionId === section.id
              ? 'bg-gray-900 text-white shadow-lg shadow-gray-200 scale-105'
              : 'bg-white text-gray-400 hover:text-gray-900 border border-gray-100 hover:border-gray-300'
              }`}
          >
            {section.data.title || 'Sección'}
          </button>
        ))}
      </div>
    </div>
  );
}
