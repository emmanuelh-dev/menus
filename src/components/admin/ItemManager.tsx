import { useState, useEffect } from 'react';

interface MenuItem {
  id: number;
  category_id: number;
  restaurant_id: number;
  name: string;
  description: string | null;
  base_price: number;
  image: string | null;
  ingredients: string[] | null;
  allergens: string[] | null;
  calories: number | null;
  preparation_time: number | null;
  display_order: number;
  is_active: boolean;
  is_featured: boolean;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  is_spicy: boolean;
  spicy_level: number;
  stock_quantity: number | null;
}

interface ItemManagerProps {
  menuId: string;
  categoryId: string;
  restaurantId: number;
  initialItems: MenuItem[];
}

export default function ItemManager({ menuId, categoryId, restaurantId, initialItems }: ItemManagerProps) {
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [spicyLevel, setSpicyLevel] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingItem(null);
    setImagePreview(null);
    setSpicyLevel(0);
    setIsModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setImagePreview(item.image);
    setSpicyLevel(item.spicy_level);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setImagePreview(null);
    setSpicyLevel(0);
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
      setImagePreview(editingItem?.image || null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    try {
      let imageUrl = editingItem?.image || null;
      
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

      const ingredientsText = formData.get("ingredients") as string;
      const allergensText = formData.get("allergens") as string;
      
      const ingredients = ingredientsText ? ingredientsText.split(',').map(i => i.trim()).filter(i => i) : [];
      const allergens = allergensText ? allergensText.split(',').map(a => a.trim()).filter(a => a) : [];

      const itemData = {
        category_id: parseInt(categoryId),
        restaurant_id: restaurantId,
        name: formData.get("name") as string,
        description: formData.get("description") as string || null,
        base_price: parseFloat(formData.get("base_price") as string),
        image: imageUrl,
        ingredients: ingredients.length > 0 ? ingredients : null,
        allergens: allergens.length > 0 ? allergens : null,
        calories: formData.get("calories") ? parseInt(formData.get("calories") as string) : null,
        preparation_time: formData.get("preparation_time") ? parseInt(formData.get("preparation_time") as string) : null,
        display_order: parseInt(formData.get("display_order") as string) || 0,
        is_active: formData.get("is_active") === "on",
        is_featured: formData.get("is_featured") === "on",
        is_vegetarian: formData.get("is_vegetarian") === "on",
        is_vegan: formData.get("is_vegan") === "on",
        is_gluten_free: formData.get("is_gluten_free") === "on",
        is_spicy: formData.get("is_spicy") === "on",
        spicy_level: spicyLevel,
        stock_quantity: formData.get("stock_quantity") ? parseInt(formData.get("stock_quantity") as string) : null,
      };

      if (editingItem) {
        const response = await fetch(`/api/menu-items/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al actualizar el platillo');
        }

        const updatedItem = await response.json();
        setItems(items.map(item => item.id === editingItem.id ? updatedItem : item));
      } else {
        const response = await fetch('/api/menu-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al crear el platillo');
        }

        const newItem = await response.json();
        setItems([...items, newItem]);
      }

      closeModal();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este platillo?')) return;

    try {
      const response = await fetch(`/api/menu-items/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar el platillo');
      }

      setItems(items.filter(item => item.id !== itemId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Platillos Existentes</h2>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-black -600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-black -700"
          >
            + Nuevo Platillo
          </button>
        </div>

        {items && items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-48 object-cover"
                  />
                )}
                
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                    <span className="text-lg font-bold text-green-600">${item.base_price}</span>
                  </div>
                  
                  {item.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.is_featured && (
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                        Destacado
                      </span>
                    )}
                    {item.is_vegetarian && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        Vegetariano
                      </span>
                    )}
                    {item.is_vegan && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        Vegano
                      </span>
                    )}
                    {item.is_gluten_free && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        Sin gluten
                      </span>
                    )}
                    {item.is_spicy && (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                        Picante {item.spicy_level > 0 ? `(${item.spicy_level})` : ''}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 space-y-1 mb-3">
                    {item.calories && (
                      <div>Calorías: {item.calories}</div>
                    )}
                    {item.preparation_time && (
                      <div>Tiempo de preparación: {item.preparation_time} min</div>
                    )}
                    {item.stock_quantity && (
                      <div>Stock: {item.stock_quantity}</div>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      item.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="text-black -600 hover:text-black -900 text-xs"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-900 text-xs"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-500 text-lg mb-4">No hay platillos en esta categoría</p>
            <p className="text-gray-400 text-sm">Usa el botón de arriba para crear el primer platillo</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                {editingItem ? 'Editar Platillo' : 'Nuevo Platillo'}
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

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingItem?.name || ''}
                    placeholder="Nombre del platillo"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black -500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio Base *
                  </label>
                  <input
                    type="number"
                    name="base_price"
                    step="0.01"
                    min="0"
                    required
                    defaultValue={editingItem?.base_price || ''}
                    placeholder="0.00"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black -500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingItem?.description || ''}
                  placeholder="Descripción del platillo..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black -500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imagen del Platillo
                </label>
                
                {imagePreview && (
                  <div className="mb-3">
                    <img src={imagePreview} alt="Vista previa" className="w-32 h-32 object-cover rounded-lg" />
                    <p className="text-sm text-gray-500 mt-1">Vista previa de la imagen</p>
                  </div>
                )}
                
                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-black -50 file:text-black -700 hover:file:bg-black -100"
                />
                <p className="text-xs text-gray-500 mt-1">PNG, JPG o WEBP (máx. 2MB)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ingredientes
                </label>
                <textarea
                  name="ingredients"
                  rows={2}
                  defaultValue={editingItem?.ingredients?.join(', ') || ''}
                  placeholder="Ingrediente 1, Ingrediente 2, ..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black -500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Separar con comas</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alérgenos
                </label>
                <input
                  type="text"
                  name="allergens"
                  defaultValue={editingItem?.allergens?.join(', ') || ''}
                  placeholder="Gluten, Lácteos, Frutos secos..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black -500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Separar con comas</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Calorías
                  </label>
                  <input
                    type="number"
                    name="calories"
                    min="0"
                    defaultValue={editingItem?.calories || ''}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black -500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tiempo (min)
                  </label>
                  <input
                    type="number"
                    name="preparation_time"
                    min="0"
                    defaultValue={editingItem?.preparation_time || ''}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black -500 text-sm"
                  />
                </div>
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
                    defaultValue={editingItem?.display_order || 0}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black -500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock
                  </label>
                  <input
                    type="number"
                    name="stock_quantity"
                    min="0"
                    defaultValue={editingItem?.stock_quantity || ''}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black -500 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    name="is_active" 
                    defaultChecked={editingItem?.is_active ?? true} 
                    className="rounded border-gray-300 focus:ring-black -500 mr-2" 
                  />
                  <span className="text-sm">Activo</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    name="is_featured" 
                    defaultChecked={editingItem?.is_featured || false} 
                    className="rounded border-gray-300 focus:ring-black -500 mr-2" 
                  />
                  <span className="text-sm">Destacado</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    name="is_vegetarian" 
                    defaultChecked={editingItem?.is_vegetarian || false} 
                    className="rounded border-gray-300 focus:ring-black -500 mr-2" 
                  />
                  <span className="text-sm">Vegetariano</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    name="is_vegan" 
                    defaultChecked={editingItem?.is_vegan || false} 
                    className="rounded border-gray-300 focus:ring-black -500 mr-2" 
                  />
                  <span className="text-sm">Vegano</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    name="is_gluten_free" 
                    defaultChecked={editingItem?.is_gluten_free || false} 
                    className="rounded border-gray-300 focus:ring-black -500 mr-2" 
                  />
                  <span className="text-sm">Sin gluten</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    name="is_spicy" 
                    defaultChecked={editingItem?.is_spicy || false} 
                    className="rounded border-gray-300 focus:ring-black -500 mr-2" 
                  />
                  <span className="text-sm">Picante</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nivel de Picante (0-5)
                </label>
                <input
                  type="range"
                  name="spicy_level"
                  min="0"
                  max="5"
                  value={spicyLevel}
                  onChange={(e) => setSpicyLevel(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-center text-sm text-gray-600">
                  Nivel: {spicyLevel}
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
                  {loading ? 'Guardando...' : (editingItem ? 'Actualizar' : 'Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
