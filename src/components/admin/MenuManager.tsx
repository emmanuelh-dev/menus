import { useState } from 'react';

interface Restaurant {
  id: number;
  name: string;
}

interface Menu {
  id: number;
  restaurant_id: number;
  name: string;
  menu: string | null;
  description: string | null;
  address: string | null;
  menu_type: string;
  image: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  availability_start: string | null;
  availability_end: string | null;
  display_order: number;
  availability_days: number[] | null;
  created_at: string;
  restaurants?: {
    id: number;
    name: string;
  };
}

interface MenuManagerProps {
  initialMenus: Menu[];
  restaurants: Restaurant[];
}

export default function MenuManager({ initialMenus, restaurants }: MenuManagerProps) {
  const [menus, setMenus] = useState<Menu[]>(initialMenus);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [availabilityDays, setAvailabilityDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restaurantFilter, setRestaurantFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const openCreateModal = () => {
    setEditingMenu(null);
    setImagePreview(null);
    setAvailabilityDays([]);
    setIsModalOpen(true);
  };

  const openEditModal = (menu: Menu) => {
    setEditingMenu(menu);
    setImagePreview(menu.image);
    setAvailabilityDays(menu.availability_days || []);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMenu(null);
    setImagePreview(null);
    setAvailabilityDays([]);
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
      setImagePreview(editingMenu?.image || null);
    }
  };

  const toggleDay = (day: number) => {
    setAvailabilityDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    try {
      let imageUrl = editingMenu?.image || null;
      
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

      const menuData = {
        restaurant_id: parseInt(formData.get("restaurant_id") as string),
        name: formData.get("name") as string,
        menu: formData.get("menu") as string || null,
        description: formData.get("description") as string || null,
        address: formData.get("address") as string || null,
        menu_type: formData.get("menu_type") as string,
        image: imageUrl,
        is_active: formData.get("is_active") === "on",
        start_date: formData.get("start_date") as string || null,
        end_date: formData.get("end_date") as string || null,
        availability_start: formData.get("availability_start") as string || null,
        availability_end: formData.get("availability_end") as string || null,
        display_order: parseInt(formData.get("display_order") as string) || 0,
        availability_days: availabilityDays.length > 0 ? availabilityDays : null,
      };

      if (editingMenu) {
        const response = await fetch(`/api/menus/${editingMenu.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(menuData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al actualizar el menú');
        }

        const updatedMenu = await response.json();
        setMenus(menus.map(menu => menu.id === editingMenu.id ? updatedMenu : menu));
      } else {
        const response = await fetch('/api/menus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(menuData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al crear el menú');
        }

        const newMenu = await response.json();
        setMenus([newMenu, ...menus]);
      }

      closeModal();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (menuId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este menú? Esta acción no se puede deshacer.')) return;

    try {
      const response = await fetch(`/api/menus/${menuId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar el menú');
      }

      setMenus(menus.filter(menu => menu.id !== menuId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredMenus = menus.filter(menu => {
    if (restaurantFilter && menu.restaurant_id.toString() !== restaurantFilter) return false;
    if (statusFilter === 'active' && !menu.is_active) return false;
    if (statusFilter === 'inactive' && menu.is_active) return false;
    return true;
  });

  const days = [
    { value: 0, label: 'Dom' },
    { value: 1, label: 'Lun' },
    { value: 2, label: 'Mar' },
    { value: 3, label: 'Mié' },
    { value: 4, label: 'Jue' },
    { value: 5, label: 'Vie' },
    { value: 6, label: 'Sáb' }
  ];

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Mis Menús</h2>
        <button
          onClick={openCreateModal}
          data-create-menu
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-black -600 hover:bg-black -700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black -500"
        >
          <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Crear Nuevo Menú
        </button>
      </div>

  

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredMenus.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Menú
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Restaurante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha de creación
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMenus.map((menu) => (
                  <tr key={menu.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {menu.name}
                        </div>
                        {menu.description && (
                          <div className="text-sm text-gray-500">
                            {menu.description.substring(0, 100)}...
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {menu.restaurants?.name || restaurants.find(r => r.id === menu.restaurant_id)?.name || 'Restaurante no encontrado'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {menu.menu_type || 'principal'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        menu.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {menu.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(menu.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                        <a
                          href={`/admin/menus/${menu.id}/categories`}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-black -600 bg-black -100 rounded hover:bg-black -200 transition-colors"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z"></path>
                          </svg>
                          Categorías
                        </a>
                        <button
                          onClick={() => openEditModal(menu)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded hover:bg-blue-200 transition-colors"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                          </svg>
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(menu.id)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 bg-red-100 rounded hover:bg-red-200 transition-colors"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">No hay menús creados</p>
            <button
              onClick={openCreateModal}
              className="bg-black -600 hover:bg-black -700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Crear Primer Menú
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                {editingMenu ? 'Editar Menú' : 'Nuevo Menú'}
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

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Restaurante *
                  </label>
                  <select
                    name="restaurant_id"
                    required
                    defaultValue={editingMenu?.restaurant_id || ''}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black -500"
                  >
                    <option value="">Seleccionar restaurante</option>
                    {restaurants.map((restaurant) => (
                      <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Menú
                  </label>
                  <select
                    name="menu_type"
                    defaultValue={editingMenu?.menu_type || 'main'}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black -500"
                  >
                    <option value="main">Principal</option>
                    <option value="kids">Infantil</option>
                    <option value="daily">Del Día</option>
                    <option value="drinks">Bebidas</option>
                    <option value="desserts">Postres</option>
                    <option value="breakfast">Desayuno</option>
                    <option value="lunch">Almuerzo</option>
                    <option value="dinner">Cena</option>
                    <option value="special">Especial</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Menú *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingMenu?.name || ''}
                  placeholder="Ej: Menú Principal, Menú Infantil, etc."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black -500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre corto
                </label>
                <input
                  type="text"
                  name="menu"
                  defaultValue={editingMenu?.menu || ''}
                  placeholder="Ej: Principal, Infantil, etc."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black -500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingMenu?.description || ''}
                  placeholder="Descripción del menú..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black -500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección
                </label>
                <input
                  type="text"
                  name="address"
                  defaultValue={editingMenu?.address || ''}
                  placeholder="Ej: Calle Principal 123, Colonia Centro"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black -500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imagen del Menú
                </label>
                
                {imagePreview && (
                  <div className="mb-4">
                    <img 
                      src={imagePreview} 
                      alt="Vista previa" 
                      className="w-32 h-32 object-cover rounded-lg shadow-sm"
                    />
                    <p className="text-sm text-gray-500 mt-1">Vista previa</p>
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

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración de Disponibilidad</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Inicio
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      defaultValue={editingMenu?.start_date || ''}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black -500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Fin
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      defaultValue={editingMenu?.end_date || ''}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black -500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hora de Inicio
                    </label>
                    <input
                      type="time"
                      name="availability_start"
                      defaultValue={editingMenu?.availability_start || ''}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black -500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hora de Fin
                    </label>
                    <input
                      type="time"
                      name="availability_end"
                      defaultValue={editingMenu?.availability_end || ''}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black -500"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Días de Disponibilidad
                  </label>
                  <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                    {days.map((day) => (
                      <label key={day.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={availabilityDays.includes(day.value)}
                          onChange={() => toggleDay(day.value)}
                          className="rounded border-gray-300 focus:ring-black -500"
                        />
                        <span className="text-sm text-gray-700">{day.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración Adicional</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Orden de Visualización
                    </label>
                    <input
                      type="number"
                      name="display_order"
                      min="0"
                      defaultValue={editingMenu?.display_order || 0}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black -500"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-8">
                    <input
                      type="checkbox"
                      name="is_active"
                      defaultChecked={editingMenu?.is_active ?? true}
                      className="rounded border-gray-300 focus:ring-black -500"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Menú activo
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-black -600 text-white rounded-md text-sm font-medium hover:bg-black -700 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : (editingMenu ? 'Actualizar' : 'Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
