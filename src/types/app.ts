export interface Place {
  id?: number;
  name: string;
  short_name?: string;
  rating: number;
  reviewCount: number;
  priceRange: string;
  address: string;
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
  content?: Content;
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
  type: 'section' | 'gallery' | 'image';
  data: SectionData | GalleryData | ImageData;
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
  reservation_url?: string;
  cuisine_type?: string;
  zone?: string;
  cross_street?: string;
  parking?: string;
  variety?: string;
  additional_features?: string[];
}
