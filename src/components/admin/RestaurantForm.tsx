import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

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

interface RestaurantFormProps {
  restaurant?: Restaurant;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function RestaurantForm({ restaurant, onSuccess, onCancel }: RestaurantFormProps) {
  const [formData, setFormData] = useState<Restaurant>({
    name: '',
    address: '',
    rating: 4.0,
    priceRange: '$$',
    hours: '',
    featured: false,
    type: '',
    menu: '',
    ...restaurant
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  const isEditing = !!restaurant?.id;

  useEffect(() => {
    if (restaurant) {
      setFormData({ ...restaurant });
      if (restaurant.image) {
        setImagePreview(restaurant.image);
      }
    }
  }, [restaurant]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al subir la imagen');
    }

    const result = await response.json();
    return result.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      let imageUrl = formData.image;

      // Subir nueva imagen si se seleccionó una
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const restaurantData = {
        ...formData,
        rating: parseFloat(formData.rating.toString()),
        image: imageUrl
      };

      if (isEditing) {
        // Actualizar restaurante existente - directamente con Supabase
        const { error } = await supabase
          .from('restaurants')
          .update(restaurantData)
          .eq('id', restaurant!.id);

        if (error) throw error;
      } else {
        // Crear nuevo restaurante - usando la API para mantener autenticación
        const response = await fetch('/api/restaurants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...restaurantData,
            created_at: new Date().toISOString()
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al crear el restaurante');
        }
      }

      onSuccess();
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error al procesar el formulario');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nombre *
            </label>
            <input
              type="text"
              name="name"
              id="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
              Tipo de Restaurante
            </label>
            <input
              type="text"
              name="type"
              id="type"
              value={formData.type || ''}
              onChange={handleInputChange}
              placeholder="Ej: Mexicana, Italiana, Comida Rápida"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700">
            Dirección *
          </label>
          <input
            type="text"
            name="address"
            id="address"
            required
            value={formData.address}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="rating" className="block text-sm font-medium text-gray-700">
              Calificación *
            </label>
            <input
              type="number"
              name="rating"
              id="rating"
              min="1"
              max="5"
              step="0.1"
              required
              value={formData.rating}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="priceRange" className="block text-sm font-medium text-gray-700">
              Rango de Precio
            </label>
            <select
              name="priceRange"
              id="priceRange"
              value={formData.priceRange}
              onChange={handleInputChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="$">$ - Económico</option>
              <option value="$$">$$ - Moderado</option>
              <option value="$$$">$$$ - Caro</option>
              <option value="$$$$">$$$$ - Muy Caro</option>
            </select>
          </div>

          <div>
            <label htmlFor="menu" className="block text-sm font-medium text-gray-700">
              Slug del Menú
            </label>
            <input
              type="text"
              name="menu"
              id="menu"
              value={formData.menu || ''}
              onChange={handleInputChange}
              placeholder="nombre-del-menu"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="hours" className="block text-sm font-medium text-gray-700">
            Horario
          </label>
          <input
            type="text"
            name="hours"
            id="hours"
            value={formData.hours}
            onChange={handleInputChange}
            placeholder="Ej: Lunes a Domingo 9:00 AM - 10:00 PM"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="image" className="block text-sm font-medium text-gray-700">
            Imagen del Restaurante
          </label>
          
          {imagePreview && (
            <div className="mt-2 mb-4">
              <img 
                src={imagePreview} 
                alt="Vista previa" 
                className="w-32 h-32 object-cover rounded-lg shadow-sm"
              />
            </div>
          )}
          
          <input
            type="file"
            name="image"
            id="image"
            accept="image/*"
            onChange={handleImageChange}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          <p className="mt-1 text-sm text-gray-500">PNG, JPG o WEBP (máx. 2MB)</p>
        </div>

        <div>
          <div className="flex items-center">
            <input
              id="featured"
              name="featured"
              type="checkbox"
              checked={formData.featured}
              onChange={handleInputChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="featured" className="ml-2 block text-sm text-gray-900">
              Marcar como destacado
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Procesando...' : (isEditing ? 'Actualizar' : 'Crear')} Restaurante
          </button>
        </div>
      </form>
    </div>
  );
}
