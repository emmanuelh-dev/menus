import type { SupabasePlace } from '../types/app';

const apiBaseUrl = import.meta.env.PUBLIC_GO_API_URL || 'http://localhost:8080';

export interface Restaurant {
  short_name: string;
  id: number;
  name: string;
  rating: number;
  reviewCount: number;
  priceRange: string;
  address: string;
  hours: string;
  services: string[];
  image: string;
  menu?: string;
  distance?: string;
  closed?: boolean;
  openingTime?: string;
  featured?: boolean;
  type?: string;
}

export async function getRestaurants({type, state_id}: {type: string | null, state_id?: number}) {
  const isVulkaMovil = type === 'vulka_movil';
  const dbType = isVulkaMovil ? 'vulcanizadora' : type;

  let url = `${apiBaseUrl}/api/public/places?limit=200`;
  if (dbType) {
    url += `&type=${encodeURIComponent(dbType)}`;
  }
  if (state_id) {
    url += `&state_id=${state_id}`;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Error fetching restaurants from Go API: status ${res.status}`);
      return [];
    }
    const data = await res.json();
    if (!data || data.length === 0) return [];

    let filteredData = data;
    if (isVulkaMovil) {
      filteredData = data.filter((p: any) => {
        const areas = p.content?.semantic_data?.areas || [];
        return Array.isArray(areas) && areas.length > 0;
      });
    }

    return (filteredData as any[]).map(place => {
      return {
        ...place,
        state_slug: place.states?.slug || 'nuevo-leon',
        rating: place.rating || 4.0,
        reviewCount: place.reviewCount || 0,
        priceRange: place.priceRange || "$$",
        address: place.address || "",
        hours: place.hours || "24 horas",
        amenities: place.amenities || [],
        specialties: [
          ...(place.content?.semantic_data?.additional_features || []),
          ...(place.content?.semantic_data?.specialties || []),
          ...(place.specialties || [])
        ].filter((v, i, a) => a.indexOf(v) === i),
        destacado: place.featured
      } as SupabasePlace;
    });
  } catch (error) {
    console.error(`Error fetching restaurants from Go API:`, error);
    return [];
  }
}

export async function getStates() {
  try {
    const res = await fetch(`${apiBaseUrl}/api/public/states`);
    if (!res.ok) {
      console.error(`Error fetching states from Go API: status ${res.status}`);
      return [];
    }
    const data = await res.json();
    return (data || []).map((state: any) => ({
      ...state,
      total_places: state.total_places || 0
    }));
  } catch (error) {
    console.error('Error fetching states from Go API:', error);
    return [];
  }
}

export async function getMunicipalities(stateId: number) {
  try {
    const res = await fetch(`${apiBaseUrl}/api/public/municipalities?state_id=${stateId}`);
    if (!res.ok) {
      console.error(`Error fetching municipalities from Go API: status ${res.status}`);
      return [];
    }
    return await res.json();
  } catch (error) {
    console.error('Error fetching municipalities from Go API:', error);
    return [];
  }
}

export async function getRestaurantByName({ name }: { name: string }) {
  try {
    const res = await fetch(`${apiBaseUrl}/api/public/places/${encodeURIComponent(name)}`);
    if (!res.ok) {
      if (res.status !== 404) {
        console.error(`Error fetching restaurant by name from Go API: status ${res.status}`);
      }
      return [];
    }
    const place = await res.json();
    if (!place) return [];

    return [{
      ...place,
      state_slug: place.states?.slug || 'nuevo-leon',
      rating: place.rating || 4.0,
      reviewCount: place.reviewCount || 0,
      priceRange: place.priceRange || "$$",
      address: place.address || "",
      hours: place.hours || "24 horas",
      amenities: place.amenities || [],
      specialties: [
        ...(place.content?.semantic_data?.additional_features || []),
        ...(place.content?.semantic_data?.specialties || []),
        ...(place.specialties || [])
      ].filter((v, i, a) => a.indexOf(v) === i),
      destacado: place.featured
    }] as SupabasePlace[];
  } catch (error) {
    console.error('Error fetching restaurant by name from Go API:', error);
    return [];
  }
}

export async function getReviews(placeId: number, limit: number = 10) {
  try {
    const res = await fetch(`${apiBaseUrl}/api/public/reviews?place_id=${placeId}&limit=${limit}`);
    if (!res.ok) {
      console.error(`Error fetching reviews from Go API: status ${res.status}`);
      return [];
    }
    return await res.json();
  } catch (error) {
    console.error('Error fetching reviews from Go API:', error);
    return [];
  }
}
