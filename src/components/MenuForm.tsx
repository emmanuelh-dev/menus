import { useState } from 'react';
import ImageUploader from './ImageUploader';

interface MenuFormProps {
  onSubmit: (data: MenuFormData) => void;
  initialData?: MenuFormData;
}

interface MenuFormData {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
}

export default function MenuForm({ onSubmit, initialData }: MenuFormProps) {
  const [formData, setFormData] = useState<MenuFormData>(initialData || {
    name: '',
    description: '',
    price: 0,
    imageUrl: '',
    category: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? parseFloat(value) || 0 : value
    }));
  };

  const handleImageUploaded = (url: string) => {
    setFormData(prev => ({
      ...prev,
      imageUrl: url
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Nombre del Platillo
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="price" className="block text-sm font-medium text-gray-700">
          Precio
        </label>
        <input
          type="number"
          id="price"
          name="price"
          value={formData.price}
          onChange={handleChange}
          step="0.01"
          min="0"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          Categoría
        </label>
        <select
          id="category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="">Selecciona una categoría</option>
          <option value="entradas">Entradas</option>
          <option value="platos_principales">Platos Principales</option>
          <option value="postres">Postres</option>
          <option value="bebidas">Bebidas</option>
        </select>
      </div>

      <ImageUploader
        onImageUploaded={handleImageUploaded}
        className="mt-4"
        label="Imagen del Platillo"
      />

      {formData.imageUrl && (
        <div className="mt-4">
          <img
            src={formData.imageUrl}
            alt="Vista previa"
            className="h-32 w-32 object-cover rounded-md"
          />
        </div>
      )}

      <div className="mt-6">
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Guardar
        </button>
      </div>
    </form>
  );
}