import { useState, useEffect } from 'react';
import { ManualUploader } from '../ManualUploader';
import { FaEye } from 'react-icons/fa';
import { getStates } from '../../lib/supabase';

interface State {
  id: number;
  name: string;
}

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
  short_name?: string;
  content?: any;
  state_id?: number | null;
}

export default function PlaceManager({ initialRestaurants }: { initialRestaurants: Restaurant[] }) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants);
  const [states, setStates] = useState<State[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    rating: 4.0,
    priceRange: '$$',
    hours: '',
    featured: false,
    type: 'restaurant',
    short_name: '',
    image: '',
    state_id: null as number | null,
  });

  useEffect(() => {
    const fetchStates = async () => {
      const data = await getStates();
      setStates(data);
    };
    fetchStates();
  }, []);

  const openModal = (restaurant?: Restaurant) => {
    if (restaurant) {
      setEditingId(restaurant.id);
      setFormData({
        name: restaurant.name,
        address: restaurant.address,
        rating: restaurant.rating,
        priceRange: restaurant.priceRange,
        hours: restaurant.hours,
        featured: restaurant.featured,
        type: restaurant.type || 'restaurant',
        short_name: restaurant.short_name || '',
        image: restaurant.image || '',
        state_id: restaurant.state_id || null,
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', address: '', rating: 4.0, priceRange: '$$', hours: '', featured: false, type: 'restaurant', short_name: '', image: '', state_id: null });
    }
    setIsModalOpen(true);
  };

  const handleInputChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleImageUploaded = (url: string) => {
    setFormData(prev => ({ ...prev, image: url }));
  };

  const handleUploadError = () => {
    console.error('Error al subir la imagen');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingId ? `/api/restaurants/${editingId}` : '/api/restaurants';
      const method = editingId ? 'PUT' : 'POST';

      console.log('Enviando datos:', formData);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      console.log('Respuesta del servidor:', result);

      if (editingId) {
        setRestaurants(prev => prev.map(r => r.id === editingId ? result.data : r));
      } else {
        setRestaurants(prev => [result.data, ...prev]);
      }
      setIsModalOpen(false);
      setFormData({
        name: '',
        address: '',
        rating: 4.0,
        priceRange: '$$',
        hours: '',
        featured: false,
        type: 'restaurant',
        short_name: '',
        image: '',
        state_id: null,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-black uppercase tracking-tighter">Panel de Control</h2>
        <button onClick={() => openModal()} className="bg-black text-white px-6 py-2 rounded-full font-bold">
          + Añadir Lugar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {restaurants.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <img key={r.image} src={r.image || '/placeholder.svg'} alt={r.name} className="w-full h-44 object-cover" />
            <div className="p-5">
              <h3 className="font-bold text-xl">{r.name}</h3>
              <p className="text-gray-400 text-sm mb-4">{r.address}</p>

              <div className="flex gap-2">
                <a href={`/${r.type === 'motel' ? 'moteles' : r.type === 'restaurant' ? 'restaurantes' : 'cafeterias'}/${r.short_name}`} target='_blank' className="flex-1 bg-black text-white hover:text-white hover:bg-neutral-700 text-center py-2 rounded-lg font-bold text-sm items-center justify-center">
                  <FaEye className="inline" />
                </a>
                <button onClick={() => openModal(r)} className="flex-1 bg-gray-100 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 transition-colors">
                  Editar Info
                </button>
                <a href={`/admin/place/${r.id}`} className="flex-1 bg-black text-white hover:text-white hover:bg-neutral-700 text-center py-2 rounded-lg font-bold text-sm">
                  Editar Menú
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <form
            key={editingId || 'new'}
            onSubmit={handleSubmit}
            className="bg-white w-full max-w-lg p-8 rounded-3xl shadow-2xl space-y-4"
          >
            <h3 className="text-xl font-black uppercase mb-6">{editingId ? 'Actualizar' : 'Crear'} Registro</h3>

            <input name="name" placeholder="Nombre" value={formData.name} onChange={handleInputChange} required className="w-full border-b-2 py-2 outline-none focus:border-black" />
            <input name="address" placeholder="Dirección" value={formData.address} onChange={handleInputChange} required className="w-full border-b-2 py-2 outline-none focus:border-black" />
            <select 
              name="state_id" 
              value={formData.state_id || ''} 
              onChange={handleInputChange} 
              className="border-b-2 py-2 outline-none focus:border-black w-full"
            >
              <option value="" disabled>Selecciona un estado</option>
              {states.map((state) => (
                <option key={state.id} value={state.id}>
                  {state.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-4">
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="border-b-2 py-2 outline-none focus:border-black"
              >
                <option value="restaurant">Restaurante</option>
                <option value="motel">Motel</option>
                <option value="cafe">Cafetería</option>
              </select>
              <input name="short_name" placeholder="Slug (URL)" value={formData.short_name} onChange={handleInputChange} className="border-b-2 py-2 outline-none focus:border-black" />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">Logo del Restaurante</label>
              <ManualUploader
                onFilesUploaded={(urls) => handleImageUploaded(urls[0])}
                onUploadError={handleUploadError}
                currentImage={formData.image}
              />
            </div>

            <div className="flex justify-end gap-4 mt-8">
              <button type="button" onClick={() => setIsModalOpen(false)} className="font-bold text-gray-400">Cerrar</button>
              <button type="submit" className="bg-black text-white px-8 py-2 rounded-full font-bold">
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}