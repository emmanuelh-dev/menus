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
  textColor = 'text-gray-700'
}: CategoryNavigationProps) {
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);

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
  };

  if (!isVisible || categories.length === 0) return null;

  return (
    <nav 
      className={`${sticky ? 'fixed top-0 left-0 right-0' : ''} z-40 ${backgroundColor} shadow-md transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          <h3 className={`font-semibold ${textColor} hidden md:block`}>
            Categorías del Menú
          </h3>
          
          {/* Navegación horizontal scrolleable */}
          <div className="flex-1 md:flex-initial">
            <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => scrollToCategory(category.id)}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeCategory === category.id
                      ? `${category.color || 'bg-indigo-600'} text-white shadow-md transform scale-105`
                      : `${textColor} hover:bg-gray-100 hover:shadow-sm`
                  }`}
                  title={category.description}
                >
                  <span className="whitespace-nowrap">
                    {category.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Botón para cerrar/minimizar */}
          <button
            onClick={() => setIsVisible(false)}
            className={`ml-4 p-2 rounded-lg ${textColor} hover:bg-gray-100 transition-colors`}
            title="Ocultar navegación"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
