import { useState } from 'react';

interface Category {
  id: string;
  name: string;
  color?: string;
  description?: string;
}

interface FloatingCategoryMenuProps {
  categories: Category[];
  backgroundColor?: string;
  textColor?: string;
}

export default function FloatingCategoryMenu({ 
  categories, 
  backgroundColor = 'bg-white',
  textColor = 'text-gray-700'
}: FloatingCategoryMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const scrollToCategory = (categoryId: string) => {
    const element = document.getElementById(categoryId);
    if (element) {
      const offset = 100;
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 left-4 z-50 bg-black -600 text-white p-3 rounded-full shadow-lg hover:bg-black -700 transition-all duration-200 hover:scale-105"
        title="Navegación rápida"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Menú flotante */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menú */}
          <div className={`fixed bottom-20 left-4 right-4 md:left-4 md:right-auto md:w-80 ${backgroundColor} rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto`}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-semibold ${textColor}`}>
                  Ir a categoría
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className={`${textColor} hover:bg-gray-100 p-2 rounded-lg transition-colors`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-2">
                {categories.map((category, index) => (
                  <button
                    key={category.id}
                    onClick={() => scrollToCategory(category.id)}
                    className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-200 hover:bg-gray-50 hover:shadow-sm border border-gray-100 ${textColor}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className={`w-3 h-3 rounded-full ${category.color || 'bg-black -500'}`}
                        style={category.color?.startsWith('text-') ? { 
                          backgroundColor: category.color.replace('text-', '').replace('-400', '').replace('-500', '') 
                        } : {}}
                      />
                      <div>
                        <div className="font-medium">{category.name}</div>
                        {category.description && (
                          <div className="text-sm text-gray-500 truncate">
                            {category.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
