import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, MapPin, Check, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

declare const google: any;

interface ShippingZone {
  id?: number;
  place_id: number;
  name: string;
  price: number;
  colonies: string[];
  is_active: boolean;
}

interface Props {
  placeId: number;
}

export default function ShippingZonesManager({ placeId }: Props) {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [newZone, setNewZone] = useState<Partial<ShippingZone>>({
    name: '',
    price: 0,
    colonies: [],
    is_active: true
  });
  const [currentColony, setCurrentColony] = useState('');
  const [selectedColonies, setSelectedColonies] = useState<string[]>([]);
  const colonyInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    fetchZones();
  }, [placeId]);

  useEffect(() => {
    if (!colonyInputRef.current || typeof google === 'undefined') return;

    const autocomplete = new google.maps.places.Autocomplete(colonyInputRef.current, {
      componentRestrictions: { country: 'mx' },
      types: ['(regions)'],
      fields: ['address_components', 'name']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();

      if (!place.address_components) return;

      let colonyName = place.name || '';

      for (const component of place.address_components) {
        if (component.types.includes('sublocality') ||
          component.types.includes('neighborhood') ||
          component.types.includes('sublocality_level_1')) {
          colonyName = component.long_name;
          break;
        }
      }

      if (colonyName && !selectedColonies.includes(colonyName)) {
        setSelectedColonies(prev => [...prev, colonyName]);
        setCurrentColony('');
        if (colonyInputRef.current) {
          colonyInputRef.current.value = '';
        }
      }
    });

    autocompleteRef.current = autocomplete;
  }, [placeId]); // Autocomplete depends on placeId, not selectedColonies

  const fetchZones = async () => {
    if (!placeId || isNaN(placeId)) return;
    try {
      const response = await fetch(`/api/shipping-zones?place_id=${placeId}`);
      const data = await response.json();
      setZones(data.zones || []);
    } catch (error) {
      console.error('Error fetching zones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveColony = (colony: string) => {
    setSelectedColonies(prev => prev.filter(c => c !== colony));
  };

  const handleSaveZone = async () => {
    if (!placeId || isNaN(placeId)) {
      alert('Error: ID de establecimiento no válido');
      return;
    }

    if (!newZone.name || newZone.price === undefined || selectedColonies.length === 0) {
      alert('Por favor completa todos los campos y agrega al menos una colonia');
      return;
    }

    try {
      const response = await fetch('/api/shipping-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newZone,
          place_id: placeId,
          colonies: selectedColonies
        })
      });

      if (response.ok) {
        await fetchZones();
        setNewZone({ name: '', price: 0, colonies: [], is_active: true });
        setSelectedColonies([]);
        setCurrentColony('');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.details || errorData.error || 'No se pudo guardar la zona'}`);
      }
    } catch (error) {
      console.error('Error saving zone:', error);
      alert('Error de conexión al guardar la zona');
    }
  };

  const handleDeleteZone = async (zoneId: number) => {
    if (!confirm('¿Eliminar esta zona de envío?')) return;

    try {
      await fetch(`/api/shipping-zones/${zoneId}`, {
        method: 'DELETE'
      });
      await fetchZones();
    } catch (error) {
      console.error('Error deleting zone:', error);
    }
  };

  const toggleZoneActive = async (zone: ShippingZone) => {
    try {
      await fetch(`/api/shipping-zones/${zone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...zone,
          is_active: !zone.is_active
        })
      });
      await fetchZones();
    } catch (error) {
      console.error('Error toggling zone:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Zonas de Envío
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre de Zona"
              placeholder="Ej: Centro"
              value={newZone.name || ''}
              onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
            />
            <Input
              label="Precio de Envío"
              type="number"
              placeholder="Ej: 50"
              value={newZone.price || ''}
              onChange={(e) => setNewZone({ ...newZone, price: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500 ml-1 block mb-2">
              <MapPin className="w-3 h-3 inline mr-1" />
              Agregar Colonias
            </label>
            <input
              ref={colonyInputRef}
              type="text"
              name="colony_search"
              placeholder="Buscar colonia en Google Maps..."
              value={currentColony}
              onChange={(e) => setCurrentColony(e.target.value)}
              autoComplete="off"
              className="w-full px-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition-all"
            />

            {selectedColonies.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedColonies.map((colony, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium"
                  >
                    {colony}
                    <button
                      onClick={() => handleRemoveColony(colony)}
                      className="hover:bg-blue-100 rounded-full p-0.5"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <Button onClick={handleSaveZone} className="w-full">
            <Plus size={16} className="mr-2" />
            Agregar Zona
          </Button>
        </div>
      </div>

      {zones.length > 0 && (
        <div className="space-y-3">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className={`bg-white rounded-xl border p-4 transition-all ${zone.is_active ? 'border-slate-200' : 'border-slate-100 opacity-60'
                }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-bold text-slate-900">{zone.name}</h4>
                    <span className="text-sm font-bold text-green-600">
                      ${zone.price}
                    </span>
                    {!zone.is_active && (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                        Inactiva
                      </span>
                    )}
                  </div>
                  {zone.colonies && zone.colonies.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {zone.colonies.map((colony, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-slate-50 text-slate-600 px-2 py-1 rounded"
                        >
                          {colony}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleZoneActive(zone)}
                    className={`p-2 rounded-lg transition-colors ${zone.is_active
                      ? 'bg-green-50 text-green-600 hover:bg-green-100'
                      : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                      }`}
                  >
                    {zone.is_active ? <Check size={16} /> : <X size={16} />}
                  </button>
                  <button
                    onClick={() => zone.id && handleDeleteZone(zone.id)}
                    className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {zones.length === 0 && !loading && (
        <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl">
          No hay zonas de envío configuradas
        </div>
      )}
    </div>
  );
}
