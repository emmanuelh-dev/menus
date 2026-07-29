import { useState, useEffect } from 'react';

interface Category {
  id: string;
  name: string;
  color?: string;
  description?: string;
  image?: string;
}

interface CategoryNavigationProps {
  categories: Category[];
  sticky?: boolean;
  backgroundColor?: string;
  textColor?: string;
}

export default function CategoryNavigation({ 
  categories, 
  sticky = true, 
  backgroundColor = 'bg-white',
  textColor = 'text-neutral-700'
}: CategoryNavigationProps) {
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Función para generar colores de hover dinámicos
  const getHoverColors = () => {
    // Si es un background oscuro, hover más claro
    if (backgroundColor.includes('bg-neutral-900') || backgroundColor.includes('bg-black') || 
        backgroundColor.includes('bg-neutral-900') || backgroundColor.includes('bg-neutral-900')) {
      return 'hover:bg-neutral-700 hover:bg-opacity-50';
    }
    // Si es un background claro, hover más oscuro
    if (backgroundColor.includes('bg-white') || backgroundColor.includes('bg-neutral-50') || 
        backgroundColor.includes('bg-neutral-100')) {
      return 'hover:bg-neutral-100 hover:bg-opacity-80';
    }
    // Para otros colores, usar opacity
    return 'hover:bg-black hover:bg-opacity-10';
  };

  const hoverColors = getHoverColors();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
      }
    );

    // Observar todas las secciones de categorías
    categories.forEach((category) => {
      const element = document.getElementById(category.id);
      if (element) {
        observer.observe(element);
      }
    });

    // Mostrar navegación después de un pequeño scroll
    const handleScroll = () => {
      setIsVisible(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [categories]);
  const scrollToCategory = (categoryId: string) => {
    const element = document.getElementById(categoryId);
    if (element) {
      const offset = 100; // Offset para header sticky
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
    // Cerrar menú móvil después de navegar
    setIsMobileMenuOpen(false);
  };

  if (!isVisible || categories.length === 0) return null;
  return (
    <nav 
      className={`${sticky ? 'fixed top-0 left-0 right-0' : ''} z-40 ${backgroundColor} shadow-md transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      <div className="px-4 w-full max-w-[100vw] overflow-x-auto">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-3">
            <h3 className={`font-semibold ${textColor} hidden`}>
              Secciones del Menú
            </h3>
            {/* Título para móvil */}
            <h3 className={`font-semibold ${textColor} md:hidden text-sm`}>
              Navegar por Secciones
            </h3>
          </div>
          
          {/* Botón hamburguesa - solo móvil */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden p-2 rounded-lg ${textColor} ${hoverColors} transition-colors`}
            title={isMobileMenuOpen ? "Cerrar menú de secciones" : "Ver secciones del menú"}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} 
              />
            </svg>
          </button>
          
          {/* Navegación horizontal scrolleable - solo desktop */}
          <div className="hidden md:flex flex-1 md:flex-initial">
            <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => scrollToCategory(category.id)}                  className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeCategory === category.id
                      ? `${category.color || 'bg-black -600'} text-white shadow-md transform scale-105`
                      : `${textColor} ${hoverColors} hover:shadow-sm`
                  }`}
                  title={category.description}
                >
                  <span className="whitespace-nowrap">
                    {category.name}
                  </span>
                </button>
              ))}
            </div>
          </div>          {/* Botón para cerrar/minimizar - solo desktop */}
          <button
            onClick={() => setIsVisible(false)}
            className={`hidden ml-4 p-2 rounded-lg ${textColor} ${hoverColors} transition-colors`}
            title="Ocultar navegación de secciones"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {isMobileMenuOpen && (
          <div className={`md:hidden border-t ${
            backgroundColor.includes('bg-white') || backgroundColor.includes('bg-neutral-50') 
              ? 'border-neutral-200' 
              : backgroundColor.includes('bg-neutral-900') || backgroundColor.includes('bg-black')
              ? 'border-neutral-700'
              : 'border-neutral-300'
          }`}>            <div className={`px-4 py-2 border-b ${
              backgroundColor.includes('bg-white') || backgroundColor.includes('bg-neutral-50') 
                ? 'border-neutral-200' 
                : backgroundColor.includes('bg-neutral-900') || backgroundColor.includes('bg-black')
                ? 'border-neutral-700'
                : 'border-neutral-300'
            }`}>
              <p className={`text-xs ${textColor} opacity-75`}>
                Toca una sección para saltar a ella.
              </p>
            </div>
            <div className="py-2  max-h-80 overflow-y-auto">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => scrollToCategory(category.id)}
                  className={`w-full text-left px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    activeCategory === category.id
                      ? `${category.color || 'bg-black -600'} text-white`
                      : `${textColor} ${hoverColors}`
                  }`}
                  title={category.description}
                >
                  <div className="flex items-center justify-between">
                    <span>{category.name}</span>
                    {activeCategory === category.id && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  {category.description && (
                    <p className="text-xs opacity-75 mt-1">{category.description}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
