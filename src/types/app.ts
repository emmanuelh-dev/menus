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
  destacado?: boolean;

  content?: SemanticData;
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
  cuisine_type?: string;
  zone?: string;
  cross_street?: string;
  parking?: string;
  variety?: string;
  additional_features?: string[];
}
