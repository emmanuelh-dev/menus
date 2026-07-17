// Cliente contra el API público de Go (doc 11). Reemplaza src/lib/supabase.ts
// SOLO para las páginas de moteles (migración por secciones, doc 11: moteles
// → restaurantes → servicios → tienda). El resto del sitio sigue en Supabase.
const API_URL = import.meta.env.PUBLIC_GO_API_URL;

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.error(`Error fetching ${path}:`, err);
    return null;
  }
}

// Mismo enriquecimiento que hoy hace src/lib/supabase.ts client-side — el
// backend ya trae rating/reviewCount calculados, así que no hace falta una
// segunda consulta a reviews para el promedio (getAllPlaceRatings queda sin uso).
function enrichPlace(place: any): any {
  return {
    ...place,
    state_slug: place.states?.slug || 'nuevo-leon',
    rating: place.rating || 4.0, // mismo default que hoy usa supabase.ts para places sin reviews
    count: place.reviewCount ?? 0, // alias que espera MotelPageRenderer (place.count)
    priceRange: place.priceRange || '$$',
    address: place.address || '',
    hours: place.hours || '24 horas',
    // El backend expone las amenidades como "services" (string separado por
    // comas), no como arreglo — de ahí que las pills de amenidades salieran
    // vacías en toda la vertical de moteles (listados, ficha, schema.org).
    amenities: Array.isArray(place.amenities) && place.amenities.length > 0
      ? place.amenities
      : (typeof place.services === 'string'
          ? place.services.split(',').map((s: string) => s.trim()).filter(Boolean)
          : []),
    specialties: [
      ...(place.content?.semantic_data?.additional_features || []),
      ...(place.content?.semantic_data?.specialties || []),
      ...(place.specialties || [])
    ].filter((v: string, i: number, a: string[]) => a.indexOf(v) === i),
    destacado: place.featured
  };
}

export async function getRestaurants({ type, state_id }: { type: string | null; state_id?: number }) {
  const isVulkaMovil = type === 'vulka_movil';
  const dbType = isVulkaMovil ? 'vulcanizadora' : type;

  const params = new URLSearchParams();
  if (dbType) params.set('type', dbType);
  if (state_id) params.set('state_id', String(state_id));

  const data = await fetchJSON<any[]>(`/api/public/places?${params.toString()}`);
  if (!data) return [];

  let filtered = data;
  if (isVulkaMovil) {
    filtered = data.filter((p) => {
      const areas = p.content?.semantic_data?.areas || [];
      return Array.isArray(areas) && areas.length > 0;
    });
  }

  return filtered.map(enrichPlace);
}

// Paginado server-side con conteo total (doc11 + extensión: exclude_type,
// category, sort, X-Total-Count) — lo usa menus/index.astro (hub principal
// de restaurantes), a diferencia de getRestaurants() que trae todo sin límite.
export async function getPlacesPage(params: {
  type?: string | null;
  exclude_type?: string;
  state_id?: number;
  category?: string;
  sort?: string;
  limit: number;
  offset: number;
}): Promise<{ data: any[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.type) qs.set('type', params.type);
  if (params.exclude_type) qs.set('exclude_type', params.exclude_type);
  if (params.state_id) qs.set('state_id', String(params.state_id));
  if (params.category) qs.set('category', params.category);
  if (params.sort) qs.set('sort', params.sort);
  qs.set('limit', String(params.limit));
  qs.set('offset', String(params.offset));

  try {
    const res = await fetch(`${API_URL}/api/public/places?${qs.toString()}`);
    if (!res.ok) return { data: [], total: 0 };
    const data = (await res.json()) as any[];
    const total = Number(res.headers.get('X-Total-Count') || data.length);
    return { data: data.map(enrichPlace), total };
  } catch (err) {
    console.error('Error fetching places page:', err);
    return { data: [], total: 0 };
  }
}

export async function getRestaurantByName({ name }: { name: string }) {
  const place = await fetchJSON<any>(`/api/public/places/${encodeURIComponent(name)}`);
  if (!place) return [];
  return [enrichPlace(place)];
}

export async function getStates() {
  const data = await fetchJSON<any[]>('/api/public/states');
  if (!data) return [];
  return data.map((s) => ({ ...s, total_places: s.total_places || 0 }));
}

export async function getMunicipalities(stateId: number) {
  const data = await fetchJSON<any[]>(`/api/public/municipalities?state_id=${stateId}`);
  return data || [];
}

export async function getReviews(placeId: number, limit = 10) {
  const data = await fetchJSON<any[]>(`/api/public/reviews?place_id=${placeId}&limit=${limit}`);
  return data || [];
}
