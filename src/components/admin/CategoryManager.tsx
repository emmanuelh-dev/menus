import { useState } from 'react';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingCategory(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setImagePreview(category.image || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setImagePreview(null);
    setError(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(editingCategory?.image || null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    try {
      let imageUrl = editingCategory?.image || null;
      
      const imageFile = formData.get('image') as File;
      if (imageFile && imageFile.size > 0) {
        const uploadFormData = new FormData();
        uploadFormData.append('image', imageFile);
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          imageUrl = uploadResult.url;
        } else {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'Error al subir la imagen');
        }
      }

      const categoryData = {
        restaurant_id: restaurantId,
        name: formData.get("name") as string,
        description: formData.get("description") as string || null,
        image: imageUrl,
        parent_id: formData.get("parent_id") ? parseInt(formData.get("parent_id") as string) : null,
        display_order: parseInt(formData.get("display_order") as string) || 0,
        is_active: formData.get("is_active") === "on",
      };

      if (editingCategory) {
        const response = await fetch(`/api/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(categoryData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al actualizar la categoría');
        }

        const updatedCategory = await response.json();
        setCategories(categories.map(cat => cat.id === editingCategory.id ? updatedCategory : cat));
      } else {
        const response = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(categoryData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al crear la categoría');
        }

        const newCategory = await response.json();
        setCategories([...categories, newCategory]);
      }

      closeModal();
    } catch (err: any) {
      setError(err.message);
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

      if (!response.ok) {
        throw new Error('Error al eliminar la categoría');
      }

      setCategories(categories.filter(cat => cat.id !== categoryId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const parentCategories = categories.filter(cat => !cat.parent_id);

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900">Categorías del Menú</h2>
        <button
          onClick={openCreateModal}
          className="bg-black -600 hover:bg-black -700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          + Nueva Categoría
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
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
                      className="text-green-600 hover:text-green-900 text-sm font-medium"
                    >
                      Ver Platillos
                    </a>
                    <button
                      onClick={() => openEditModal(category)}
                      className="text-black -600 hover:text-black -900 text-sm font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
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
            <p className="text-gray-400 text-sm">Usa el botón de arriba para crear la primera categoría</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingCategory?.name || ''}
                  placeholder="Ej: Entradas, Platos Principales..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black -500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingCategory?.description || ''}
                  placeholder="Descripción de la categoría..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black -500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imagen de la Categoría
                </label>
                
                {imagePreview && (
                  <div className="mb-3">
                    <img
                      src={imagePreview}
                      alt="Vista previa"
                      className="w-24 h-24 object-cover rounded-lg border"
                    />
                  </div>
                )}
                
                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-black -50 file:text-black -700 hover:file:bg-black -100"
                />
                <p className="mt-1 text-sm text-gray-500">PNG, JPG o WEBP (máx. 2MB)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría Padre (Subcategoría)
                </label>
                <select
                  name="parent_id"
                  defaultValue={editingCategory?.parent_id || ''}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black -500 text-sm"
                >
                  <option value="">Sin categoría padre</option>
                  {parentCategories.filter(c => c.id !== editingCategory?.id).map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Orden
                  </label>
                  <input
                    type="number"
                    name="display_order"
                    min="0"
                    defaultValue={editingCategory?.display_order || 0}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black -500 text-sm"
                  />
                </div>

                <div className="flex items-center pt-8">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={editingCategory?.is_active ?? true}
                    className="rounded border-gray-300 focus:ring-black -500"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Activa
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-black -600 rounded-md hover:bg-black -700 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : (editingCategory ? 'Actualizar' : 'Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
