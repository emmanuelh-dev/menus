import { useState } from 'react';
import RestaurantForm from './RestaurantForm';

interface Restaurant {
  id?: string;
  name: string;
  address: string;
  rating: number;
  priceRange: string;
  hours: string;
  featured: boolean;
  image?: string;
  type?: string;
  menu?: string;
}

interface RestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant?: Restaurant;
  onSuccess: () => void;
}

export default function RestaurantModal({ isOpen, onClose, restaurant, onSuccess }: RestaurantModalProps) {
  if (!isOpen) return null;

  const isEditing = !!restaurant?.id;

  const handleSuccess = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {isEditing ? 'Editar Restaurante' : 'Nuevo Restaurante'}
              </h3>
              <button
                type="button"
                className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={onClose}
              >
                <span className="sr-only">Cerrar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <RestaurantForm
              restaurant={restaurant}
              onSuccess={handleSuccess}
              onCancel={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
