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
}