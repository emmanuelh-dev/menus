import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const placeId = url.searchParams.get('place_id');
  const lat = url.searchParams.get('lat');
  const lng = url.searchParams.get('lng');
  const colony = url.searchParams.get('colony') || '';

  if (!placeId || !lat || !lng) {
    return new Response(JSON.stringify({ error: 'place_id, lat, and lng are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { data, error } = await supabase.rpc('is_point_in_shipping_zone', {
    p_place_id: parseInt(placeId),
    p_lat: parseFloat(lat),
    p_lng: parseFloat(lng),
    p_colony: colony || null
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const zone = data && data.length > 0 ? {
    id: data[0].zone_id,
    name: data[0].zone_name,
    price: parseFloat(data[0].delivery_price)
  } : null;

  return new Response(JSON.stringify({ zone }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
