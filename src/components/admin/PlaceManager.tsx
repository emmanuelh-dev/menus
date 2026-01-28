import { useState, useEffect } from 'react';
import { ManualUploader } from '../ManualUploader';
import { FaEye } from 'react-icons/fa';
import { getStates } from '../../lib/supabase';
import { formater } from '../../types/app';
import { Sparkles, CheckCircle2, Upload, ArrowRight, X } from 'lucide-react';

interface State {
  id: number;
  name: string;
}

const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w-]+/g, '')   // Remove all non-word chars
    .replace(/--+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')        // Trim - from start of text
    .replace(/-+$/, '');       // Trim - from end of text
};

interface Restaurant {
  id: number;
  name: string;
  address: string;
  rating: number;
  priceRange: string;
  hours: string;
  featured: boolean;
  image?: string;
  type: string;
  short_name?: string;
  content?: any;
  state_id?: number | null;
  states?: {
    id: number;
    name: string;
    slug: string;
  };
}

export default function PlaceManager({ initialRestaurants }: { initialRestaurants: Restaurant[] }) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants);
  const [states, setStates] = useState<State[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [createdPlaceId, setCreatedPlaceId] = useState<number | null>(null);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [menuImages, setMenuImages] = useState<string[]>([]);
  const [extractedPreview, setExtractedPreview] = useState<any>(null);

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
      setStep(1); // Always step 1 for editing
    } else {
      setEditingId(null);
      setFormData({ name: '', address: '', rating: 4.0, priceRange: '$$', hours: '', featured: false, type: 'restaurant', short_name: '', image: '', state_id: null });
      setStep(1);
      setCreatedPlaceId(null);
      setMenuImages([]);
    }
    setIsModalOpen(true);
  };

  const handleInputChange = (e: any) => {
    const { name, value, type, checked } = e.target;

    if (name === 'name' && !editingId) {
      setFormData(prev => ({
        ...prev,
        name: value,
        short_name: slugify(value)
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
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

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (editingId) {
        setRestaurants(prev => prev.map(r => r.id === editingId ? result.data : r));
        setIsModalOpen(false);
      } else {
        setRestaurants(prev => [result.data, ...prev]);
        setCreatedPlaceId(result.data.id);
        setStep(2); // Go to step 2 for AI menu upload
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAIMenuExtraction = async () => {
    if (menuImages.length === 0) return;

    setAiProcessing(true);
    try {
      const response = await fetch('/api/ai/update-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId: createdPlaceId || editingId,
          images: menuImages,
          instruction: 'Extrae todo el menú de estas imágenes y organízalo por categorías.',
          preview: true // I'll assume our API can return a preview if told so
        })
      });

      const result = await response.json();
      if (response.ok) {
        setExtractedPreview(result.data.content);
        setStep(3); // New step for preview
      }
    } catch (err) {
      console.error('Error al extraer menú:', err);
    } finally {
      setAiProcessing(false);
    }
  };

  const confirmExtractedMenu = async () => {
    if (createdPlaceId) {
      window.location.href = `/admin/place/${createdPlaceId}`;
    } else {
      setIsModalOpen(false);
      window.location.reload();
    }
  };

  return (
    <div className="p-6">

      <div className="flex justify-between items-center mb-8">
        <button onClick={() => openModal()} className="bg-black text-white px-6 py-2 rounded-full font-bold">
          + Añadir Lugar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {restaurants.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <img key={r.image} src={r.image || '/placeholder.svg'} alt={r.name} className="w-full h-44 object-cover" />
            <div className="p-5">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-bold text-xl">{r.name}</h3>
                {r.states && (
                  <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full font-bold uppercase text-gray-500">
                    {r.states.name}
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm mb-4">{r.address}</p>

              <div className="flex gap-2">
                <a
                  href={r.type === 'motel' && r.states?.slug ? `/moteles/estados/${r.states.slug}/${r.short_name}` : `/${formater[r.type] || r.type}/${r.short_name}`}
                  target='_blank'
                  className="flex-1 bg-black text-white hover:text-white hover:bg-neutral-700 text-center py-2 rounded-lg font-bold text-sm items-center justify-center"
                >
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Steps Header */}
            <div className="bg-white px-8 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className={`flex items-center gap-2 ${step === 1 ? 'text-black' : 'text-slate-400'}`}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${step === 1 ? 'bg-black text-white' : 'bg-slate-100'}`}>1</span>
                  <span className="font-bold uppercase tracking-tight text-[11px]">Información</span>
                </div>
                <div className="h-px w-6 bg-slate-100" />
                <div className={`flex items-center gap-2 ${step === 2 ? 'text-black' : 'text-slate-400'}`}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${step === 2 ? 'bg-black text-white' : 'bg-slate-100'}`}>2</span>
                  <span className="font-bold uppercase tracking-tight text-[11px]">Menú con IA</span>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-black transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8">
              {step === 1 ? (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">{editingId ? 'Editar' : 'Nuevo'} Establecimiento</h3>
                    <p className="text-slate-400 text-xs">Completa los datos de tu negocio.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Nombre</label>
                      <input name="name" placeholder="Ej: La Central" value={formData.name} onChange={handleInputChange} required className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Ubicación</label>
                      <input name="address" placeholder="Ej: San Pedro GG" value={formData.address} onChange={handleInputChange} required className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Estado</label>
                      <select name="state_id" value={formData.state_id || ''} onChange={handleInputChange} required className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl outline-none focus:border-black transition-all text-sm appearance-none">
                        <option value="" disabled>Seleccionar...</option>
                        {states.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Categoría</label>
                      <select name="type" value={formData.type} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl outline-none focus:border-black transition-all text-sm appearance-none">
                        <option value="restaurant">Restaurante</option>
                        <option value="motel">Motel</option>
                        <option value="cafe">Cafetería</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">URL (Slug)</label>
                      <input name="short_name" placeholder="la-central" value={formData.short_name} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl outline-none focus:border-black transition-all text-sm" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Imagen Principal</label>
                    <ManualUploader
                      onFilesUploaded={(urls) => handleImageUploaded(urls[0])}
                      onUploadError={handleUploadError}
                      currentImage={formData.image}
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <button type="submit" disabled={loading} className="w-full bg-black text-white py-3 rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                      {loading ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Siguiente'}
                      {!editingId && <ArrowRight size={16} />}
                    </button>
                  </div>
                </form>
              ) : step === 2 ? (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-2">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                      <Sparkles size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">¡Casi listo! Sube tu Menú</h3>
                    <p className="text-slate-500 text-xs">Sube fotos o capturas. La IA las convertirá en tu menú digital.</p>
                  </div>

                  <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
                    <ManualUploader
                      onFilesUploaded={(urls) => setMenuImages(prev => [...prev, ...urls])}
                      onUploadError={handleUploadError}
                      currentImage={menuImages[0]}
                    />
                    {menuImages.length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                        {menuImages.map((img, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 shadow-sm flex-shrink-0">
                            <img src={img} className="w-full h-full object-cover" />
                            <button onClick={() => setMenuImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5">
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleAIMenuExtraction}
                      disabled={aiProcessing || menuImages.length === 0}
                      className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                    >
                      {aiProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Analizar Menú con IA
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setIsModalOpen(false);
                        if (createdPlaceId) {
                          window.location.href = `/admin/place/${createdPlaceId}`;
                        }
                      }}
                      className="w-full py-2 text-slate-400 font-bold uppercase text-[10px] tracking-tight hover:text-slate-600"
                    >
                      Saltar por ahora
                    </button>
                  </div>
                </div>
              ) : step === 3 ? (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-2">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                      <CheckCircle2 size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">Menú Extraído</h3>
                    <p className="text-slate-500 text-xs">Esto es lo que nuestra IA encontró. Podrás editarlo a detalle ahora mismo.</p>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-2xl p-4 bg-slate-50 space-y-4">
                    {extractedPreview?.categories?.map((cat: any, i: number) => (
                      <div key={i} className="space-y-2">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{cat.name}</h4>
                        <div className="grid grid-cols-1 gap-2">
                          {cat.items?.map((item: any, j: number) => (
                            <div key={j} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                              <span className="text-sm font-bold text-slate-700">{item.name}</span>
                              <span className="text-xs font-black text-emerald-600">${item.price}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={confirmExtractedMenu}
                    className="w-full bg-black text-white py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    Confirmar y Editar Menú
                    <ArrowRight size={16} />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}