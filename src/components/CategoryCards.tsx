import React from 'react';

interface Props {
  blocks: any[];
  onCategoryClick?: (id: string) => void;
  variant?: 'grid' | 'carousel';
  placeSlug?: string;
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

export default function CategoryCards({ blocks, onCategoryClick, variant = 'grid', placeSlug }: Props) {
  const sections = blocks.filter(b => b.type === 'section');

  if (sections.length < 2) return null;

  // Sort: featured sections first
  const sortedSections = [...sections].sort((a, b) => {
    if (a.data.featured && !b.data.featured) return -1;
    if (!a.data.featured && b.data.featured) return 1;
    return 0;
  });

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      if (el.tagName === 'DETAILS') {
        (el as HTMLDetailsElement).open = true;
      }
      const offset = 100;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
    onCategoryClick?.(id);
  };

  const toCategorySlug = (value: string) => {
    return (value || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleCategoryAction = (sectionId: string, title: string) => {
    if (variant === 'carousel') {
      scrollTo(sectionId);
      return;
    }

    if (placeSlug) {
      const categorySlug = toCategorySlug(title) || 'categoria';
      window.location.href = `/tienda/${encodeURIComponent(placeSlug)}/${encodeURIComponent(categorySlug)}`;
      return;
    }
    scrollTo(sectionId);
  };

  if (variant === 'carousel') {
    return (
      <div className="py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-nowrap gap-3 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {sortedSections.map(section => {
              const isFeatured = section.data.featured;
              return (
                <button
                  key={section.id}
                  onClick={() => handleCategoryAction(section.id, section.data.title || '')}
                  className={`group relative overflow-hidden flex-none w-[calc(45%-0.375rem)] h-auto snap-start border border-white/10 ${isFeatured ? 'ring-2 ring-amber-400/80' : ''}`}
                >
                  {section.data.image ? (
                    <img
                      src={section.data.image}
                      alt={section.data.title}
                      className='w-full'
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
                  )}

                  <div className="">
                    <div className="w-full text-left">
                      <p className="text-white font-black text-xs uppercase tracking-widest line-clamp-1">
                        {section.data.title}
                      </p>
                      {section.data.items?.length > 0 && (
                        <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider mt-1">
                          {section.data.items.length} productos
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedSections.map(section => {
            const isFeatured = section.data.featured;
            return (
              <button
                key={section.id}
                onClick={() => handleCategoryAction(section.id, section.data.title || '')}
                className={`group relative overflow-hidden aspect-[4/3] bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] ${isFeatured
                    ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#1a1a1a] hover:shadow-amber-500/30'
                    : 'hover:shadow-red-500/20'
                  }`}
              >
                {isFeatured && (
                  <div className="absolute top-3 right-3 z-20 bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 shadow-lg">
                    Popular
                  </div>
                )}

                {section.data.image ? (
                  <img
                    src={section.data.image}
                    alt={section.data.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-110 transition-all duration-700"
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${isFeatured ? 'from-amber-600/30 to-orange-600/30' : 'from-red-600/20 to-purple-600/20'}`} />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  <span className="text-4xl mb-3 drop-shadow-xl group-hover:scale-125 transition-transform duration-300">
                    {getIconForCategory(section.data.title)}
                  </span>
                  <h3 className="text-white font-black text-sm md:text-base uppercase tracking-widest text-center drop-shadow-xl">
                    {section.data.title}
                  </h3>
                  {section.data.items?.length > 0 && (
                    <span className="mt-2 text-[10px] text-white/60 font-bold uppercase tracking-wider">
                      {section.data.items.length} productos
                    </span>
                  )}
                </div>

                <div className={`absolute inset-0 border-2 transition-all duration-300 ${isFeatured
                    ? 'border-amber-400/50 group-hover:border-amber-400'
                    : 'border-white/0 group-hover:border-white/30'
                  }`} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
