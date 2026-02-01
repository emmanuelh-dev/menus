import { useState, useEffect } from 'react';
import { ManualUploader } from '../ManualUploader';
import { FaEye } from 'react-icons/fa';
import { getStates } from '../../lib/supabase';
import { formater } from '../../types/app';
import { Sparkles, CheckCircle2, Upload, ArrowRight, X, Search, Filter, Plus, Copy } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select as UISelect } from '../ui/Select';
import { Badge } from '../ui/Badge';
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete';

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
  formatted_address?: string;
  lat?: number;
  lng?: number;
  category?: string;
  rating: number;
  priceRange: string;
  hours: string;
  featured: boolean;
  image?: string;
  type: string;
  short_name?: string;
  content?: any;
  state_id?: number | null;
  municipality_id?: number | null;
  states?: {
    id: number;
    name: string;
    slug: string;
  };
}

export default function PlaceManager({ initialRestaurants, loading: externalLoading }: { initialRestaurants: Restaurant[], loading?: boolean }) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants || []);
  const [states, setStates] = useState<State[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const isLoading = externalLoading || loading;

  useEffect(() => {
    setRestaurants(initialRestaurants || []);
  }, [initialRestaurants]);

  const [step, setStep] = useState(1);
  const [createdPlaceId, setCreatedPlaceId] = useState<number | null>(null);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [menuImages, setMenuImages] = useState<string[]>([]);
  const [extractedPreview, setExtractedPreview] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    formatted_address: '',
    lat: undefined as number | undefined,
    lng: undefined as number | undefined,
    category: '',
    rating: 4.0,
    priceRange: '$$',
    hours: '',
    featured: false,
    type: 'restaurant',
    short_name: '',
    image: '',
    state_id: null as number | null,
    municipality_id: null as number | null,
    content: null as any,
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
        formatted_address: restaurant.formatted_address || '',
        lat: restaurant.lat,
        lng: restaurant.lng,
        category: restaurant.category || '',
        rating: restaurant.rating,
        priceRange: restaurant.priceRange,
        hours: restaurant.hours,
        featured: restaurant.featured,
        type: restaurant.type || 'restaurant',
        short_name: restaurant.short_name || '',
        image: restaurant.image || '',
        state_id: restaurant.state_id || null,
        municipality_id: (restaurant as any).municipality_id || null,
        content: restaurant.content || null,
      });
      setStep(1); // Always step 1 for editing
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        address: '',
        formatted_address: '',
        lat: undefined,
        lng: undefined,
        category: '',
        rating: 4.0,
        priceRange: '$$',
        hours: '',
        featured: false,
        type: 'restaurant',
        short_name: '',
        image: '',
        state_id: null,
        municipality_id: null,
        content: null,
      });
      setStep(1);
      setCreatedPlaceId(null);
      setMenuImages([]);
    }
    setIsModalOpen(true);
  };

  const handleClone = (restaurant: Restaurant) => {
    setEditingId(null);
    setFormData({
      name: `${restaurant.name} (Copia)`,
      address: restaurant.address,
      formatted_address: restaurant.formatted_address || '',
      lat: restaurant.lat,
      lng: restaurant.lng,
      category: restaurant.category || '',
      rating: restaurant.rating,
      priceRange: restaurant.priceRange,
      hours: restaurant.hours,
      featured: restaurant.featured,
      type: restaurant.type || 'restaurant',
      short_name: `${restaurant.short_name}-copia`,
      image: restaurant.image || '',
      state_id: restaurant.state_id || null,
      municipality_id: (restaurant as any).municipality_id || null,
      content: restaurant.content || null,
    });
    setStep(1);
    setCreatedPlaceId(null);
    setMenuImages([]);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const fetchMunicipalities = async () => {
      if (!formData.state_id) {
        setMunicipalities([]);
        return;
      }
      setLoadingMunicipalities(true);
      try {
        const response = await fetch(`/api/municipalities?state_id=${formData.state_id}`);
        const data = await response.json();
        setMunicipalities(data);
      } catch (err) {
        console.error('Error fetching municipalities:', err);
      } finally {
        setLoadingMunicipalities(false);
      }
    };
    fetchMunicipalities();
  }, [formData.state_id]);

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
        if (formData.content) {
          // Si estamos clonando (ya hay contenido), vamos directo a editar el menú
          window.location.href = `/admin/place/${result.data.id}`;
        } else {
          setCreatedPlaceId(result.data.id);
          setStep(2); // Go to step 2 for AI menu upload
        }
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

  // Use the prop as source of truth if state is empty but prop has items
  // This avoids a flicker/empty state on the first render after loading finishes
  const displayRestaurants = (restaurants.length === 0 && initialRestaurants && initialRestaurants.length > 0)
    ? initialRestaurants
    : restaurants;

  const filteredRestaurants = displayRestaurants
    .filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'oldest') return a.id - b.id;
      return b.id - a.id; // newest by default
    });

  return (
    <div className="p-6">
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2 tracking-tight">
              Todos{isLoading ? <span className="animate-pulse h-6 w-8 bg-gray-100 rounded"></span> : <Badge>({displayRestaurants.length})</Badge>}
            </h1>
          </div>

          <div>
            <Button onClick={() => openModal()}>
              <Plus size={16} className="mr-2" />
              Crear
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 bg-slate-50 p-1.5 rounded-xl">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 z-10">
              <Search size={16} />
            </div>
            <Input
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 shadow-none border-none"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative w-full md:w-40">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 z-10">
                <Filter size={14} />
              </div>
              <UISelect
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="pl-9 shadow-none border-none"
                options={[
                  { value: "newest", label: "Recientes" },
                  { value: "oldest", label: "Antiguos" },
                  { value: "name", label: "Nombre" }
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden border border-slate-100 animate-pulse">
              <div className="h-40 bg-gray-100" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-50 rounded w-1/2" />
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="h-8 bg-gray-50 rounded" />
                  <div className="h-8 bg-gray-50 rounded" />
                </div>
              </div>
            </div>
          ))
        ) : (
          filteredRestaurants.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-xl overflow-hidden border border-slate-100"
            >
              <div className="relative h-40 overflow-hidden bg-slate-50">
                <img
                  key={r.image}
                  src={r.image || '/placeholder.svg'}
                  alt={r.name}
                  className="w-full h-full object-cover"
                />

                {r.states && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 backdrop-blur rounded text-[10px] font-bold text-slate-600 uppercase tracking-tight shadow-sm">
                    {r.states.name}
                  </div>
                )}

                <div className="absolute bottom-2 right-2">
                  <a
                    href={r.type === 'motel' && r.states?.slug
                      ? `/moteles/estados/${r.states.slug}/${r.short_name}`
                      : `/${(r.type === 'cafe' || r.type === 'restaurant') ? 'menus' : (formater[r.type as keyof typeof formater] || r.type)}/${r.short_name}`}
                    target='_blank'
                    className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 shadow-sm"
                  >
                    <FaEye size={14} />
                  </a>
                </div>
              </div>

              <div className="p-4">
                <div className="mb-4">
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-1">
                    {r.name}
                  </h3>
                  <p className="text-slate-400 text-[11px] line-clamp-1 mt-0.5">
                    {r.address}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openModal(r)}
                    className="px-2"
                    title="Editar info básica"
                  >
                    Info
                  </Button>
                  <a href={`/admin/place/${r.id}/caja`} className="">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full px-2"
                      title="Ver pedidos"
                    >
                      Caja
                    </Button>
                  </a>
                  <a href={`/admin/place/${r.id}/shipping`} className="">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full px-2"
                      title="Zonas de envío"
                    >
                      Zonas
                    </Button>
                  </a>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleClone(r)}
                    className="px-2"
                    title="Clonar restaurante"
                  >
                    <Copy size={14} />
                  </Button>
                  <a href={`/admin/place/${r.id}`} className="col-span-2">
                    <Button size="sm" className="w-full">
                      Gestionar Menú
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {
        isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col">
              {/* Steps Header */}
              <div className="bg-white px-8 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
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

              <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                {step === 1 ? (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-slate-900 tracking-tight">{editingId ? 'Editar' : 'Nuevo'} Establecimiento</h3>
                      <p className="text-slate-400 text-xs">Completa los datos de tu negocio.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Nombre"
                        name="name"
                        placeholder="Ej: La Central"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                      <UISelect
                        label="Categoría"
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        options={[
                          { value: "restaurant", label: "Restaurante" },
                          { value: "motel", label: "Motel" },
                          { value: "cafe", label: "Cafetería" }
                        ]}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <UISelect
                        label="Estado"
                        name="state_id"
                        value={formData.state_id || ''}
                        onChange={handleInputChange}
                        required
                        options={[
                          { value: "", label: "Seleccionar..." },
                          ...states.map(s => ({ value: s.id, label: s.name }))
                        ]}
                      />
                      <UISelect
                        label="Municipio"
                        name="municipality_id"
                        value={formData.municipality_id || ''}
                        onChange={handleInputChange}
                        disabled={!formData.state_id || loadingMunicipalities}
                        options={[
                          { value: "", label: loadingMunicipalities ? "Cargando..." : "Seleccionar..." },
                          ...municipalities.map(m => ({ value: m.id, label: m.name }))
                        ]}
                      />
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Dirección *</label>
                        <GooglePlacesAutocomplete
                          value={formData.formatted_address || formData.address}
                          onChange={(address) => setFormData(prev => ({ ...prev, address }))}
                          onPlaceSelected={async (place) => {
                            const normalize = (str: string) =>
                              str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

                            const matchedState = states.find(s =>
                              normalize(s.name) === normalize(place.state || '')
                            );

                            let matchedMunicipalityId = null;
                            if (matchedState) {
                              try {
                                const response = await fetch(`/api/municipalities?state_id=${matchedState.id}`);
                                const munis = await response.json();
                                const matchedMuni = munis.find((m: any) =>
                                  normalize(m.name) === normalize(place.city || '')
                                );
                                if (matchedMuni) {
                                  matchedMunicipalityId = matchedMuni.id;
                                } else if (place.city) {
                                  // Si no existe en la DB pero Google nos dio el nombre, lo creamos
                                  const createRes = await fetch('/api/municipalities', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      name: place.city,
                                      state_id: matchedState.id,
                                      slug: slugify(place.city)
                                    })
                                  });
                                  if (createRes.ok) {
                                    const newMuni = await createRes.json();
                                    matchedMunicipalityId = newMuni.id;
                                    // Recargar lista local para que aparezca en el select
                                    setMunicipalities(prev => [...prev, newMuni].sort((a, b) => a.name.localeCompare(b.name)));
                                  }
                                }
                              } catch (err) {
                                console.error('Error auto-filling/creating municipality:', err);
                              }
                            }

                            setFormData(prev => ({
                              ...prev,
                              address: place.address,
                              formatted_address: place.formatted_address,
                              lat: place.lat,
                              lng: place.lng,
                              state_id: matchedState ? matchedState.id : prev.state_id,
                              municipality_id: matchedMunicipalityId || prev.municipality_id
                            }));
                          }}
                          placeholder="Buscar en Google Maps..."
                          className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition-all"
                        />
                      </div>

                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <Input
                        label="URL (Slug)"
                        name="short_name"
                        placeholder="la-central"
                        value={formData.short_name}
                        onChange={handleInputChange}
                      />
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


                    <div className="flex flex-col gap-2">
                      <a
                        href={`/admin/place/${createdPlaceId}`}
                        className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                      >
                        <Sparkles size={16} />
                        Comienza a editar tu menú
                      </a>
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
        )
      }
    </div >
  );
}