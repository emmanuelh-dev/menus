import { useState } from 'react';

interface Restaurant {
  id: number;
  name: string;
  address: string;
  rating: number;
  priceRange: string;
  hours: string;
  featured: boolean;
  image?: string;
  type?: string;
  menu?: string;
  user_id?: string;
  created_at?: string;
}

interface RestaurantManagerProps {
  initialRestaurants: Restaurant[];
}

export default function RestaurantManager({ initialRestaurants }: RestaurantManagerProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    rating: 4.0,
    priceRange: '$$',
    hours: '',
    featured: false,
    type: '',
    menu: ''
  });

  const openCreateModal = () => {
    setFormData({
      name: '',
      address: '',
      rating: 4.0,
      priceRange: '$$',
      hours: '',
      featured: false,
      type: '',
      menu: ''
    });
    setImagePreview(null);
    setIsModalOpen(true);
    setError(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setImagePreview(null);
    setError(null);
    setLoading(false);
    setUploadingImage(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) : value
    }));
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
      setImagePreview(null);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    setUploadingImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al subir la imagen');
      }

      const result = await response.json();
      return result.url;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let imageUrl = '';
      
      const imageFile = (e.currentTarget.querySelector('input[name="image"]') as HTMLInputElement)?.files?.[0];
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const restaurantData = {
        ...formData,
        image: imageUrl,
        rating: parseFloat(formData.rating.toString())
      };

      const response = await fetch('/api/restaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(restaurantData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear el restaurante');
      }

      const result = await response.json();
      
      if (!result.data) {
        throw new Error('No se recibió el restaurante creado');
      }
      
      setRestaurants([result.data, ...restaurants]);
      closeModal();
      
      if (confirm('Restaurante creado exitosamente. ¿Deseas crear un menú para este restaurante ahora?')) {
        window.location.reload();
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error al crear el restaurante');
    } finally {
      setLoading(false);
    }
  };

  const deleteRestaurant = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este restaurante?')) return;

    try {
      const response = await fetch(`/api/restaurants/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Error al eliminar el restaurante');
      }

      setRestaurants(restaurants.filter(r => r.id !== id));
    } catch (err) {
      console.error('Error:', err);
      alert('Error al eliminar el restaurante');
    }
  };

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Mis Restaurantes</h2>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Restaurante
        </button>
      </div>

      {restaurants.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay restaurantes</h3>
          <p className="mt-1 text-sm text-gray-500">Comienza creando tu primer restaurante</p>
          <div className="mt-6">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear Restaurante
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((restaurant) => (
            <div key={restaurant.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              {restaurant.image && (
                <img 
                  src={restaurant.image} 
                  alt={restaurant.name}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{restaurant.name}</h3>
                    {restaurant.type && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{restaurant.type}</span>
                    )}
                  </div>
                  {restaurant.featured && (
                    <span className="text-yellow-500 text-xl">★</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2">{restaurant.address}</p>
                <div className="flex items-center mt-2">
                  <span className="text-sm font-medium text-gray-900">{restaurant.rating}</span>
                  <span className="text-yellow-400 ml-1">★</span>
                  <span className="text-sm text-gray-500 ml-2">{restaurant.priceRange}</span>
                </div>
                {restaurant.hours && (
                  <p className="text-xs text-gray-500 mt-2">{restaurant.hours}</p>
                )}
                <div className="mt-4 flex space-x-2">
                  <a
                    href={`/admin/restaurants/show/${restaurant.id}`}
                    className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Ver
                  </a>
                  <button
                    onClick={() => deleteRestaurant(restaurant.id)}
                    className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" onClick={closeModal}></div>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                    Nuevo Restaurante
                  </h3>
                  <button
                    type="button"
                    className="bg-white dark:bg-gray-800 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                    onClick={closeModal}
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-100 dark:bg-red-900 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-4" role="alert">
                      <p>{error}</p>
                    </div>
                  )}
                  
                  {uploadingImage && (
                    <div className="bg-blue-100 dark:bg-blue-900 border-l-4 border-blue-500 text-blue-700 dark:text-blue-200 p-4" role="alert">
                      <p className="flex items-center">
                        <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Subiendo imagen...
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Tipo
                      </label>
                      <input
                        type="text"
                        name="type"
                        id="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        placeholder="Ej: Mexicana, Italiana"
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Dirección *
                    </label>
                    <input
                      type="text"
                      name="address"
                      id="address"
                      required
                      value={formData.address}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="rating" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <div>
                      <label htmlFor="priceRange" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Precio
                      </label>
                      <select
                        name="priceRange"
                        id="priceRange"
                        value={formData.priceRange}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="$">$ - Económico</option>
                        <option value="$$">$$ - Moderado</option>
                        <option value="$$$">$$$ - Caro</option>
                        <option value="$$$$">$$$$ - Muy Caro</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="menu" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Slug del Menú
                      </label>
                      <input
                        type="text"
                        name="menu"
                        id="menu"
                        value={formData.menu}
                        onChange={handleInputChange}
                        placeholder="nombre-menu"
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="hours" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Horario
                    </label>
                    <input
                      type="text"
                      name="hours"
                      id="hours"
                      value={formData.hours}
                      onChange={handleInputChange}
                      placeholder="Ej: Lun-Dom 9:00 AM - 10:00 PM"
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label htmlFor="image" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Imagen
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
                      disabled={uploadingImage}
                      className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-800 disabled:opacity-50"
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">PNG, JPG o WEBP (máx. 2MB)</p>
                  </div>

                  <div>
                    <div className="flex items-center">
                      <input
                        id="featured"
                        name="featured"
                        type="checkbox"
                        checked={formData.featured}
                        onChange={handleInputChange}
                        disabled={uploadingImage}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
                      />
                      <label htmlFor="featured" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                        Marcar como destacado
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={loading || uploadingImage}
                      className="inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading || uploadingImage}
                      className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading && (
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      {loading ? 'Creando...' : uploadingImage ? 'Subiendo imagen...' : 'Crear Restaurante'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
