import React, { useState, useEffect } from 'react';
import { FaRobot } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import { getOpinionesCafeteria } from '../lib/supabase';

interface RecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (preferences: string) => void;
  isLoading: boolean;
  recommendation: string | null;
}

const RecommendationModal: React.FC<RecommendationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  recommendation
}) => {
  const [preferences, setPreferences] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(preferences);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold dark:text-white">Recomendación de Platillos Beta</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            ✕
          </button>
        </div>
        
        {!recommendation ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="preferences" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cuéntanos tus preferencias o lo que te apetece comer hoy:
              </label>
              <textarea
                id="preferences"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Ejemplo: Me gustaría algo picante, soy vegetariano, tengo antojo de algo dulce, platillos para niños..."
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-blue-400"
            >
              {isLoading ? 'Pensando...' : 'Obtener Recomendación'}
            </button>
          </form>
        ) : (
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nuestra recomendación:</h3>
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md dark:text-white prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{recommendation}</ReactMarkdown>
            </div>
            <button
              onClick={() => onSubmit('')}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
            >
              Nueva Recomendación
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface RecommendationButtonProps {
  menuItems: Array<{name: string; price?: number; category?: boolean; color?: string}> | null;
  menuText: string | null;
  restaurantName: string;
}

export default function RecommendationButton({ menuItems = null, menuText = null,  restaurantName }: RecommendationButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setRecommendation(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (preferences: string) => {
    if (!preferences && !recommendation) return;
    
    if (recommendation) {
      // Reset for a new recommendation
      setRecommendation(null);
      return;
    }

    setIsLoading(true);
    try {
    let menu;

      if (menuItems) {
        menu = menuItems
      .filter(item => !item.category)
      .map(item => ({
        name: item.name,
        price: item.price
      }));
      }


      const response = await fetch('/api/openai-recommendation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences,
          menuItems: menu ? menu : menuText,
          restaurantName
        }),
      });

      if (!response.ok) {
        throw new Error('Error al obtener recomendación');
      }

      const data = await response.json();
      setRecommendation(data.recommendation);
    } catch (error) {
      console.error('Error:', error);
      setRecommendation('Lo siento, hubo un error al procesar tu solicitud. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="rounded-full bg-blue-600 p-2 text-white transition-all hover:bg-blue-500 fixed bottom-[180px] right-7 z-[100]"
        aria-label="Obtener recomendación de platillos"
      >
        <FaRobot className="size-5" />
      </button>
      
      <RecommendationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        recommendation={recommendation}
      />
    </>
  );
}