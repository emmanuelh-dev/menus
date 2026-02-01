export const formater = {
  'motel': 'moteles',
  'restaurant': 'menus',
}
export interface Place {
  name: string;
  short_name?: string;
  rating: number;
  reviewCount: number;
  priceRange: string;
  address: string;
  formatted_address?: string;
  lat?: number;
  lng?: number;
  category?: string;
  hours: string;
  amenities: string[];
  image?: any;
  menu?: string;
  distance?: string;
  closed?: boolean;
  openingTime?: string;
  specialties?: string[];
  highlight?: boolean;
  phone?: string;
  featured: boolean;
  type: string;
  state_id?: number;
  state_slug?: string;
  states?: {
    id: number;
    name: string;
    slug: string;
  };
  content?: Content;
}

export interface SupabasePlace extends Place {
  id: number;
}

export interface Content {
  semantic_data?: SemanticData;
  blocks?: Block[];
  view_settings?: {
    layout: 'grid' | 'list';
    show_prices: boolean;
  };
}

export interface Block {
  id: string;
  type: 'section' | 'gallery' | 'image' | 'carrusel';
  data: SectionData | GalleryData | ImageData | CarruselData;
}

export interface SectionData {
  title: string;
  description?: string;
  image?: string;
  items: ItemData[];
}

export interface ItemData {
  id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;     
  features?: string[];
  gallery?: { src: string; alt?: string; title?: string }[];
}

export interface GalleryData {
  images: { src: string; alt?: string; title?: string }[];
}

export interface ImageData {
  src: string;
  alt?: string;
  caption?: string;
}

export interface CarruselItem {
  src: string;
  alt?: string;
  link?: string;
  caption?: string;
}

export interface CarruselData {
  items: CarruselItem[];
}

export interface SemanticData {
  description?: string;
  areas?: string[];
  address?: string;
  price_range?: string;
  ambiance?: string;
  hours?: string;
  website?: string;
  payment_options?: string[];
  dress_code?: string;
  phone?: string;
  whatsapp?: string;
  enable_cart?: boolean;
  enable_delivery?: boolean;
  reservation_url?: string;
  cuisine_type?: string;
  zone?: string;
  cross_street?: string;
  parking?: string;
  variety?: string;
  additional_features?: string[];
  clabe?: string;
}

export interface ShippingZone {
  id: number;
  place_id: number;
  name: string;
  price: number;
  area?: any;
  colonies?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: number;
  place_id: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_colony?: string;
  shipping_zone_id?: number;
  delivery_price: number;
  delivery_enabled: boolean;
  items: any;
  subtotal: number;
  total: number;
  notes?: string;
  payment_method?: 'cash' | 'card' | 'transfer';
  status: 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}
