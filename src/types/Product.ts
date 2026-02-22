export interface ProductVariant {
  size: string;
  stock: number;
  price?: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  mainImage: string;
  additionalImages: string[];
  featured?: boolean;
  brightness?: number; // 0-200%
  contrast?: number;   // 0-200%
  imageSettings?: Record<string, { brightness: number; contrast: number; crop?: { x: number; y: number; width: number; height: number } }>;
  inStock?: boolean;
  stock?: number;
  variants?: ProductVariant[];
  sortOrder?: number;
}

export interface ProductCode {
  category: string;
  name: string;
  price: number;
  images: string[];
}