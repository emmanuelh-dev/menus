import React, { useState, useEffect } from 'react';
import { ManualUploader } from '../ManualUploader';
import { Sparkles, MapPin, Camera, Store, ArrowRight, ArrowLeft, Loader2, Check } from 'lucide-react';
import { getStates } from '../../lib/supabase';
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
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

export default function OnboardingFlow({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [states, setStates] = useState<State[]>([]);
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    formatted_address: '',
    lat: undefined as number | undefined,
    lng: undefined as number | undefined,
    category: 'restaurant',
    type: 'restaurant',
    template: 'default',
    image: '',
    state_id: null as number | null,
    municipality_id: null as number | null,
    short_name: '',
  });

  useEffect(() => {
    const fetchStates = async () => {
      const data = await getStates();
      setStates(data);
    };
    fetchStates();
  }, []);

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

  const handleNext = () => {
    if (step === 1 && !formData.name) return;
    if (step === 2 && !formData.type) return;
    if (step === 3 && !formData.address) return;
    if (step === 4 && !formData.state_id) return;
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const finishOnboarding = async () => {
    setLoading(true);
    try {
      // Exclude template from the main payload - it only goes in content.view_settings
      const { template, ...restFormData } = formData;

      // Create starter content based on business type
      const starterSections: Record<string, { title: string; items: { name: string; description: string; price: number }[] }> = {
        restaurant: {
          title: 'Platillos Principales',
          items: [
            { name: 'Platillo de Ejemplo', description: 'Edita este producto o agrégale una imagen', price: 99 },
          ]
        },
        cafe: {
          title: 'Bebidas',
          items: [
            { name: 'Café Americano', description: 'Café recién molido, servido caliente o frío', price: 45 },
          ]
        },
        tienda: {
          title: 'Categoría Principal',
          items: [
            { name: 'Producto de Ejemplo', description: 'Añade una descripción y foto atractiva', price: 199 },
          ]
        },
        catalogo: {
          title: 'Productos Destacados',
          items: [
            { name: 'Producto de Ejemplo', description: 'Describe las características de tu producto', price: 299 },
          ]
        },
        motel: {
          title: 'Habitaciones',
          items: [
            { name: 'Habitación Sencilla', description: 'Comodidad y privacidad garantizada', price: 350 },
          ]
        },
      };

      const starter = starterSections[formData.category] || starterSections.restaurant;

      const payload = {
        ...restFormData,
        short_name: formData.short_name || slugify(formData.name),
        rating: 4.5,
        priceRange: '$$',
        hours: 'Lun-Dom 9:00 - 22:00',
        featured: false,
        // Include the selected template in Content
        content: {
          blocks: [
            {
              id: `section-${Date.now()}`,
              type: 'section',
              data: {
                title: starter.title,
                description: '¡Bienvenido! Esta es tu primera sección. Puedes editarla o crear nuevas.',
                items: starter.items.map((item, idx) => ({
                  id: `item-${Date.now()}-${idx}`,
                  ...item,
                })),
              }
            }
          ],
          view_settings: {
            template: template,
            show_prices: true,
          },
          semantic_data: {
            category: formData.category,
          }
        }
      };

      const response = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Error al crear el lugar');
      const result = await response.json();

      // Redirect to the new place editor
      window.location.href = `/admin/place/${result.data.id}`;
    } catch (err) {
      console.error(err);
      alert('Hubo un error al guardar. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto">
      <div className="w-full max-w-xl space-y-12">
        {/* Progress bar */}
        <div className="flex gap-2 w-full max-w-xs mx-auto mb-12">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= s ? 'bg-black' : 'bg-slate-100'}`}
            />
          ))}
        </div>

        {/* Welcome & Name */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-3xl mx-auto flex items-center justify-center text-3xl">
                👋
              </div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900">¡Hola! Empecemos</h1>
              <p className="text-slate-500 text-lg">¿Cuál es el nombre de tu negocio?</p>
            </div>
            <input
              autoFocus
              type="text"
              placeholder="Ej: Tacos El Güero"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleNext()}
              className="w-full text-center text-3xl font-bold bg-transparent border-b-4 border-slate-100 focus:border-black outline-none pb-4 transition-all"
            />
            <button
              onClick={handleNext}
              disabled={!formData.name}
              className="w-full h-16 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-3"
            >
              Continuar
              <ArrowRight size={20} />
            </button>
          </div>
        )}

        {/* Type selection */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-4 text-center">
              <h2 className="text-3xl font-black tracking-tight text-slate-900">¿Qué tipo de lugar es?</h2>
              <p className="text-slate-500">Esto nos ayuda a personalizar tu configuración.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { id: 'restaurant', label: 'Restaurante', icon: '🍔', template: 'default' },
                { id: 'cafe', label: 'Cafetería', icon: '☕', template: 'default' },
                { id: 'tienda', label: 'Tienda', icon: '🏪', template: 'tienda', description: 'Categorías visuales' },
                { id: 'catalogo', label: 'Catálogo', icon: '📋', template: 'tienda', description: 'Listado de productos' },
                { id: 'motel', label: 'Motel', icon: '🌙', template: 'default' },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setFormData({
                      ...formData,
                      type: type.id === 'catalogo' || type.id === 'tienda' ? 'restaurant' : type.id,
                      category: type.id,
                      template: type.template
                    });
                    setTimeout(handleNext, 300);
                  }}
                  className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${formData.category === type.id ? 'border-black bg-black text-white shadow-xl' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                >
                  <span className="text-3xl">{type.icon}</span>
                  <span className="font-bold text-sm">{type.label}</span>
                  {type.description && (
                    <span className={`text-[9px] uppercase tracking-wider ${formData.category === type.id ? 'text-white/60' : 'text-slate-400'}`}>
                      {type.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button onClick={handleBack} className="w-full py-4 text-slate-400 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:text-black">
              <ArrowLeft size={14} /> Atrás
            </button>
          </div>
        )}

        {/* Location (Google Places) */}
        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl mx-auto flex items-center justify-center">
                <MapPin size={32} />
              </div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900">¿Dónde se ubica?</h2>
              <p className="text-slate-500 text-lg">Escribe tu dirección para que los clientes te encuentren.</p>
            </div>
            <div className="relative">
              <GooglePlacesAutocomplete
                value={formData.formatted_address || formData.address}
                onChange={(address) => setFormData(prev => ({ ...prev, address }))}
                onPlaceSelected={(place) => {
                  setFormData(prev => ({
                    ...prev,
                    address: place.address,
                    formatted_address: place.formatted_address,
                    lat: place.lat,
                    lng: place.lng,
                    // Try to guess state if possible later or in next step
                  }));
                }}
                placeholder="Busca tu dirección..."
                className="w-full h-16 px-6 text-xl bg-slate-50 border-2 border-transparent focus:border-black focus:bg-white rounded-2xl outline-none transition-all"
              />
            </div>
            <div className="space-y-4">
              <button
                onClick={handleNext}
                disabled={!formData.address}
                className="w-full h-16 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-3 shadow-xl shadow-slate-200"
              >
                Confirmar Ubicación
                <ArrowRight size={20} />
              </button>
              <button onClick={handleBack} className="w-full py-4 text-slate-400 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:text-black">
                <ArrowLeft size={14} /> Atrás
              </button>
            </div>
          </div>
        )}

        {/* State / Region */}
        {step === 4 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-4 text-center">
              <h2 className="text-3xl font-black tracking-tight text-slate-900">¿En qué estado estás?</h2>
              <p className="text-slate-500 text-lg">Selecciona tu estado para organizar tu menú por zona.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-2 border border-slate-100 rounded-3xl custom-scrollbar">
              {states.map((state) => (
                <button
                  key={state.id}
                  onClick={() => {
                    setFormData({ ...formData, state_id: state.id });
                  }}
                  className={`p-4 rounded-xl border-2 text-xs font-bold uppercase tracking-wider transition-all ${formData.state_id === state.id ? 'border-black bg-black text-white' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                >
                  {state.name}
                </button>
              ))}
            </div>
            <div className="space-y-4">
              <button
                onClick={handleNext}
                disabled={!formData.state_id}
                className="w-full h-16 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-3 shadow-xl"
              >
                Continuar
                <ArrowRight size={20} />
              </button>
              <button onClick={handleBack} className="w-full py-4 text-slate-400 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:text-black">
                <ArrowLeft size={14} /> Atrás
              </button>
            </div>
          </div>
        )}

        {/* Photo Upload */}
        {step === 5 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center">
                <Camera size={32} />
              </div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900">Sube tu mejor foto</h2>
              <p className="text-slate-500 text-lg">Esta será la portada de tu menú digital.</p>
            </div>

            <div className="bg-slate-50 p-8 rounded-[2.5rem] border-4 border-dashed border-slate-200 hover:border-black transition-all group">
              <ManualUploader
                currentImage={formData.image}
                onFilesUploaded={(urls) => setFormData({ ...formData, image: urls[0] })}
              />
            </div>

            <div className="space-y-4">
              <button
                onClick={finishOnboarding}
                disabled={loading}
                className="w-full h-16 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-emerald-100"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : <><Check size={20} /> ¡Todo listo!</>}
              </button>
              {!loading && (
                <button onClick={handleBack} className="w-full py-4 text-slate-400 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:text-black">
                  <ArrowLeft size={14} /> Atrás
                </button>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Footer support */}
      <div className="mt-12 text-slate-300 text-[10px] font-black uppercase tracking-[0.3em]">
        By BysMax • Sistema de Menú Digital
      </div>
    </div>
  );
}
