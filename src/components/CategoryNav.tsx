import React, { useState, useEffect, useRef } from 'react';
import {
  Utensils,
  Pizza,
  Coffee,
  IceCream,
  Fish,
  Drumstick,
  Soup,
  Beef,
  Egg,
  Tag,
  Heart,
  Sparkles,
  Box,
  Cake,
  Beer,
  CupSoda,
  Cookie,
  Apple,
  Croissant,
  Grape,
  Dessert,
  BadgePercent,
  Flame,
  Star,
  Info
} from 'lucide-react';

interface Props {
  blocks: any[];
  variant?: 'default' | 'icons' | 'pills';
  backgroundClass?: string;
  textClass?: string;
  activeColorClass?: string;
}

// Map category slugs to Lucide icons
const categoryIcons: Record<string, any> = {
  'hamburguesas': Beef,
  'hamburguesa': Beef,
  'burgers': Beef,
  'pizzas': Pizza,
  'pizza': Pizza,
  'tacos': Utensils,
  'taco': Utensils,
  'burritos': Box,
  'burrito': Box,
  'bebidas': CupSoda,
  'drinks': CupSoda,
  'refrescos': CupSoda,
  'postres': Cake,
  'desserts': Cake,
  'dulces': Cookie,
  'ensaladas': Apple,
  'salads': Apple,
  'sopas': Soup,
  'caldos': Soup,
  'mariscos': Fish,
  'seafood': Fish,
  'carnes': Beef,
  'meat': Beef,
  'pollo': Drumstick,
  'chicken': Drumstick,
  'pastas': Utensils,
  'pasta': Utensils,
  'sushi': Fish,
  'desayunos': Egg,
  'breakfast': Egg,
  'combos': Box,
  'paquetes': Box,
  'promociones': BadgePercent,
  'especiales': Star,
  'favoritos': Heart,
  'nuevos': Sparkles,
  'hot dogs': Utensils,
  'hotdogs': Utensils,
  'papas': Cookie,
  'fries': Cookie,
  'alitas': Drumstick,
  'wings': Drumstick,
  'cafe': Coffee,
  'café': Coffee,
  'coffee': Coffee,
  'helados': IceCream,
  'ice cream': IceCream,
  'tortas': Croissant,
  'sandwiches': Croissant,
  'sandwich': Croissant,
  'quesadillas': Utensils,
  'nachos': Utensils,
  'snacks': Cookie,
  'botanas': Cookie,
  'default': Utensils
};

const CategoryIcon = ({ title, className }: { title: string, className?: string }) => {
  const normalizedTitle = title.toLowerCase().trim();
  let IconComponent = categoryIcons.default;

  for (const [key, icon] of Object.entries(categoryIcons)) {
    if (normalizedTitle.includes(key)) {
      IconComponent = icon;
      break;
    }
  }

  return <IconComponent className={className} size={24} strokeWidth={2.5} />;
};

export default function CategoryNav({
  blocks,
  variant = 'icons',
  backgroundClass = 'bg-white/80',
  textClass = 'text-neutral-700',
  activeColorClass = 'bg-red-500'
}: Props) {
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

  // Icons variant
  if (variant === 'icons') {
    return (
      <div className={`sticky top-0 z-30 border-b border-black/5 shadow-sm ${backgroundClass}`}>
        <div
          ref={navRef}
          className="max-w-7xl mx-auto px-4 py-4 overflow-x-auto hide-scrollbar flex items-center gap-3"
        >
          {sections.map(section => {
            const isActive = activeId === section.id;
            return (
              <button
                key={section.id}
                data-section-id={section.id}
                onClick={() => scrollTo(section.id)}
                className={`shrink-0 flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl transition-all duration-300 min-w-[70px] ${isActive
                  ? `${activeColorClass} shadow-lg scale-105`
                  : `bg-black/5 ${textClass} hover:bg-black/10`
                  }`}
              >
                <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
                  <CategoryIcon title={section.data.title} className={isActive ? '' : 'opacity-60'} />
                </div>
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

  // Pills variant
  if (variant === 'pills') {
    return (
      <div className={`sticky top-0 z-30 border-b border-black/5 py-3 shadow-sm backdrop-blur-md ${backgroundClass}`}>
        <div
          ref={navRef}
          className="max-w-7xl mx-auto px-4 overflow-x-auto hide-scrollbar flex items-center gap-2"
        >
          {sections.map(section => {
            const isActive = activeId === section.id;
            return (
              <button
                key={section.id}
                data-section-id={section.id}
                onClick={() => scrollTo(section.id)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 ${isActive
                  ? `${activeColorClass} shadow-lg scale-105`
                  : `bg-black/5 ${textClass} hover:bg-black/10`
                  }`}
              >
                <CategoryIcon title={section.data.title} className={isActive ? '' : 'opacity-60'} />
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

  // Default variant
  return (
    <div className={`sticky top-0 z-30 backdrop-blur-md border-b border-black/5 py-3 mb-8 shadow-sm ${backgroundClass}`}>
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
              ? `${activeColorClass} shadow-lg scale-105`
              : `bg-black/5 ${textClass} hover:bg-black/10 border border-black/5`
              }`}
          >
            {section.data.title}
          </button>
        ))}
      </div>
    </div>
  );
}
