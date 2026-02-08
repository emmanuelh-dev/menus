import React, { useState, useEffect, useRef } from 'react';

interface Props {
  blocks: any[];
  variant?: 'default' | 'icons' | 'pills';
}

// Icon mapping for common food categories
const categoryIcons: Record<string, string> = {
  'hamburguesas': '🍔',
  'hamburguesa': '🍔',
  'burgers': '🍔',
  'pizzas': '🍕',
  'pizza': '🍕',
  'tacos': '🌮',
  'taco': '🌮',
  'burritos': '🌯',
  'burrito': '🌯',
  'bebidas': '🥤',
  'drinks': '🥤',
  'refrescos': '🥤',
  'postres': '🍰',
  'desserts': '🍰',
  'dulces': '🍬',
  'ensaladas': '🥗',
  'salads': '🥗',
  'sopas': '🍲',
  'caldos': '🍲',
  'mariscos': '🦐',
  'seafood': '🦐',
  'carnes': '🥩',
  'meat': '🥩',
  'pollo': '🍗',
  'chicken': '🍗',
  'pastas': '🍝',
  'pasta': '🍝',
  'sushi': '🍣',
  'desayunos': '🍳',
  'breakfast': '🍳',
  'combos': '🍱',
  'paquetes': '📦',
  'promociones': '🏷️',
  'especiales': '⭐',
  'favoritos': '❤️',
  'nuevos': '🆕',
  'hot dogs': '🌭',
  'hotdogs': '🌭',
  'papas': '🍟',
  'fries': '🍟',
  'alitas': '🍗',
  'wings': '🍗',
  'cafe': '☕',
  'café': '☕',
  'coffee': '☕',
  'helados': '🍦',
  'ice cream': '🍦',
  'tortas': '🥪',
  'sandwiches': '🥪',
  'sandwich': '🥪',
  'quesadillas': '🧀',
  'nachos': '🌽',
  'snacks': '🍿',
  'botanas': '🍿',
  'default': '🍽️'
};

const getIconForCategory = (title: string): string => {
  const normalizedTitle = title.toLowerCase().trim();
  for (const [key, icon] of Object.entries(categoryIcons)) {
    if (normalizedTitle.includes(key)) {
      return icon;
    }
  }
  return categoryIcons.default;
};

export default function CategoryNav({ blocks, variant = 'icons' }: Props) {
  const [activeId, setActiveId] = useState<string>('');
  const navRef = useRef<HTMLDivElement>(null);
  const sections = blocks.filter(b => b.type === 'section');

  useEffect(() => {
    const sectionIds = sections.map(s => s.id);
    const observerOptions = {
      root: null,
      rootMargin: '-100px 0px -60% 0px',
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

  // Icons variant - like DiDi/Uber with emoji icons
  if (variant === 'icons') {
    return (
      <div className="sticky top-0 z-40  backdrop-blur-xl border-b  shadow-sm">
        <div
          ref={navRef}
          className="max-w-7xl mx-auto px-4 py-4 overflow-x-auto hide-scrollbar flex items-center gap-3"
        >
          {sections.map(section => {
            const isActive = activeId === section.id;
            const icon = getIconForCategory(section.data.title);
            return (
              <button
                key={section.id}
                data-section-id={section.id}
                onClick={() => scrollTo(section.id)}
                className={`shrink-0 flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl transition-all duration-300 min-w-[70px] ${isActive
                  ? 'bg-red-500 text-white shadow-lg shadow-red-200 scale-105'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-100'
                  }`}
              >
                <span className={`text-2xl transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
                  {icon}
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider whitespace-nowrap">
                  {section.data.title.length > 12 ? section.data.title.substring(0, 12) + '...' : section.data.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Pills variant - compact pills
  if (variant === 'pills') {
    return (
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-100 py-3 shadow-sm">
        <div
          ref={navRef}
          className="max-w-7xl mx-auto px-4 overflow-x-auto hide-scrollbar flex items-center gap-2"
        >
          {sections.map(section => {
            const isActive = activeId === section.id;
            const icon = getIconForCategory(section.data.title);
            return (
              <button
                key={section.id}
                data-section-id={section.id}
                onClick={() => scrollTo(section.id)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 ${isActive
                  ? 'bg-gray-900 text-white shadow-lg shadow-gray-200 scale-105'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
              >
                <span className="text-lg">{icon}</span>
                <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                  {section.data.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Default variant - simple text buttons
  return (
    <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 py-3 mb-8 shadow-sm">
      <div
        ref={navRef}
        className="max-w-7xl mx-auto px-4 overflow-x-auto hide-scrollbar flex items-center gap-2"
      >
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
