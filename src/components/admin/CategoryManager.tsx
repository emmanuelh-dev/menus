import { useState, useEffect } from 'react';

interface Category {
  id: number;
  name: string;
  description?: string;
  image?: string;
  parent_id?: number;
  display_order: number;
  is_active: boolean;
  restaurant_id: number;
  parent?: {
    id: number;
    name: string;
  };
}

interface CategoryManagerProps {
  restaurantId: number;
  menuId: string;
  initialCategories: Category[];
}

export default function CategoryManager({ restaurantId, menuId, initialCategories }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    parent_id: '',
    display_order: 0,
    is_active: true,
  });

  const showMessage = (message: string, isError: boolean = false) => {
    if (isError) {
      setError(message);
      setSuccess(false);
    } else {
      setSuccess(true);
      setError(null);
    }
    setTimeout(() => {
      setError(null);
      setSuccess(false);
    }, 3000);
  };

  const loadCategories = async () => {
    try {
      const response = await fetch(`/api/categories?restaurant_id=${restaurantId}`);
      const data = await response.json();
      
      if (response.ok) {
        setCategories(data.categories);
      } else {
        showMessage(data.error || 'Error al cargar categorías', true);
      }
    } catch (err) {
      showMessage('Error de red al cargar categorías', true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const categoryData = {
        restaurant_id: restaurantId,
        name: formData.name,
        description: formData.description || null,
        image: formData.image || null,
        parent_id: formData.parent_id ? parseInt(formData.parent_id) : null,
        display_order: formData.display_order,
        is_active: formData.is_active,
      };

      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('¡Categoría creada exitosamente!');
        setFormData({
          name: '',
          description: '',
          image: '',
          parent_id: '',
          display_order: 0,
          is_active: true,
        });
        // Recargar categorías
        await loadCategories();
      } else {
        showMessage(data.error || 'Error al crear categoría', true);
      }
    } catch (err) {
      showMessage('Error de red al crear categoría', true);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (categoryId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta categoría? Todos los platillos de esta categoría también se eliminarán.')) {
      return;
    }

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('Categoría eliminada exitosamente');
        await loadCategories();
      } else {
        showMessage(data.error || 'Error al eliminar categoría', true);
      }
    } catch (err) {
      showMessage('Error de red al eliminar categoría', true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const parentCategories = categories?.filter(cat => !cat.parent_id) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Formulario para crear nueva categoría */}
      <div className="lg:col-span-1">
        <div className="bg-white shadow rounded-lg p-6 sticky top-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Nueva Categoría</h2>
          
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              ¡Categoría creada exitosamente!
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              Error: {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Ej: Entradas, Platos Principales..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                placeholder="Descripción de la categoría..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
                URL de Imagen
              </label>
              <input
                type="url"
                id="image"
                name="image"
                value={formData.image}
                onChange={handleInputChange}
                placeholder="https://ejemplo.com/imagen.jpg"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label htmlFor="parent_id" className="block text-sm font-medium text-gray-700 mb-2">
                Categoría Padre (Subcategoría)
              </label>
              <select
                id="parent_id"
                name="parent_id"
                value={formData.parent_id}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">Sin categoría padre</option>
                {parentCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="display_order" className="block text-sm font-medium text-gray-700 mb-2">
                  Orden
                </label>
                <input
                  type="number"
                  id="display_order"
                  name="display_order"
                  value={formData.display_order}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div className="flex items-center pt-8">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 focus:ring-indigo-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Activa
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Categoría'}
            </button>
          </form>
        </div>
      </div>

      {/* Lista de categorías existentes */}
      <div className="lg:col-span-2">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Categorías Existentes</h2>
          </div>

          {categories && categories.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {categories.map((category) => (
                <div key={category.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        {category.image && (
                          <img
                            src={category.image}
                            alt={category.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {category.name}
                            {category.parent && (
                              <span className="text-sm text-gray-500 ml-2">
                                (subcategoría de {category.parent.name})
                              </span>
                            )}
                          </h3>
                          {category.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {category.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 mt-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              category.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {category.is_active ? 'Activa' : 'Inactiva'}
                            </span>
                            <span className="text-xs text-gray-500">
                              Orden: {category.display_order}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <a
                        href={`/admin/menus/${menuId}/categories/${category.id}/items`}
                        className="text-green-600 hover:text-green-900 text-sm"
                      >
                        Ver Platillos
                      </a>
                      <a
                        href={`/admin/menus/categories/edit/${category.id}`}
                        className="text-indigo-600 hover:text-indigo-900 text-sm"
                      >
                        Editar
                      </a>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-4">No hay categorías creadas</p>
              <p className="text-gray-400 text-sm">Usa el formulario de la izquierda para crear la primera categoría</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
