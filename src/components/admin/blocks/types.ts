/**
 * Tipos compartidos para los bloques del ContentEditor
 */

export type BlockType = 'section' | 'gallery' | 'image' | 'carrusel' | 'markdown' | 'text';

export interface Block {
  id: string;
  type: BlockType;
  data: any;
}

export interface MarkdownData {
  content: string;
}

export interface TextData {
  content: string;
}

export interface ItemOption {
  name: string;
  values: string[];
  prices?: { [key: string]: number };
  required?: boolean;
}

export interface ItemData {
  id: string;
  slug?: string;
  name: string;
  price: number;
  description: string;
  image: string;
  features?: string[];
  gallery?: { src: string; alt?: string; title?: string }[];
  options?: ItemOption[];
  available?: boolean;
}

export interface SectionData {
  title: string;
  category?: string;
  description?: string;
  image?: string;
  items: ItemData[];
  featured?: boolean;
}

export interface GalleryData {
  images: { src: string; alt?: string; title?: string; description?: string }[];
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
