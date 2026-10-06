// ===================================================
// RETEQUEÑOS - TIPOS UNIFICADOS DE PRODUCTOS
// ===================================================

export type ProductCategory =
  | 'tequenos'
  | 'pastelitos'
  | 'pizzas'
  | 'bebidas'
  | 'cremas'
  | 'promociones';

export interface ProductOption {
  id: string;
  label: string;
  price: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  subcategory?: 'clasicos' | 'especiales' | 'gaseosas' | 'artesanales' | 'calientes';
  description?: string;
  image: string;
  gallery?: string[];
  basePrice?: number;
  promoPrice?: number;
  presentations?: ProductOption[];
  extras?: ProductOption[];
  ingredients?: string[];
  featured?: boolean;
  badge?: string;
  stock?: boolean;
}

/**
 * Obtiene de forma autoritativa el precio base o inicial a mostrar para cualquier producto.
 * Resuelve de forma segura si el precio está en promoPrice, basePrice o en la primera presentación (10 unid.).
 */
export function getProductPrice(product?: Product | null): number {
  if (!product) return 0;
  if (typeof product.promoPrice === 'number' && product.promoPrice > 0) {
    return product.promoPrice;
  }
  if (typeof product.basePrice === 'number' && product.basePrice > 0) {
    return product.basePrice;
  }
  if (product.presentations && product.presentations.length > 0) {
    const firstPrice = product.presentations[0].price;
    if (typeof firstPrice === 'number' && firstPrice > 0) {
      return firstPrice;
    }
  }
  return 0;
}
