import React, { useState, useEffect, useRef } from 'react';
import { PiTag } from 'react-icons/pi';

interface Props {
  blocks: any[];
}

export default function CategoryNav({ blocks }: Props) {
  const [activeId, setActiveId] = useState<string>('');
  const navRef = useRef<HTMLDivElement>(null);
  const sections = blocks.filter(b => b.type === 'section');

  useEffect(() => {
    const sectionIds = sections.map(s => s.id);
    const observerOptions = {
      root: null,
      rootMargin: '-100px 0px -60% 0px', // Adjust to trigger when section is near top
      threshold: 0
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      sectionIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.unobserve(el);
      });
    };
  }, [sections]);

  // Center active item in nav
  useEffect(() => {
    if (activeId && navRef.current) {
      const activeBtn = navRef.current.querySelector(`[data-section-id="${activeId}"]`);
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeId]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      // Si es un <details>, lo abrimos
      if (el.tagName === 'DETAILS') {
        (el as HTMLDetailsElement).open = true;
      }

      const offset = 80;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  if (sections.length < 2) return null;

  return (
    <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 py-3 mb-8 shadow-sm">
      <div
        ref={navRef}
        className="max-w-7xl mx-auto px-4 overflow-x-auto no-scrollbar flex items-center gap-2"
      >
        <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-400">
          <PiTag className="w-3 h-3" />
          Categorías
        </div>

        {sections.map(section => (
          <button
            key={section.id}
            data-section-id={section.id}
            onClick={() => scrollTo(section.id)}
            className={`shrink-0 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeId === section.id
              ? 'bg-gray-900 text-white shadow-lg shadow-gray-200 scale-105'
              : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-100'
              }`}
          >
            {section.data.title}
          </button>
        ))}
      </div>
    </div>
  );
}
