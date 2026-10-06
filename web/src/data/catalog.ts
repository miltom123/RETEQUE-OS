// ===================================================
// RETEQUEÑOS - CATALOGO MAESTRO UNIFICADO
// Arquitectura modular por dominios de categorías
// ===================================================

export * from './catalog/types';
export * from './catalog/cremas';
export * from './catalog/pizzas';
export * from './catalog/tequenos';
export * from './catalog/bebidas';
export * from './catalog/pastelitos';
export * from './promotions';

import { Product, ProductCategory } from './catalog/types';
import { TEQUENOS_PRODUCTS } from './catalog/tequenos';
import { PIZZAS_PRODUCTS } from './catalog/pizzas';
import { BEBIDAS_PRODUCTS } from './catalog/bebidas';
import { PASTELITOS_PRODUCTS } from './catalog/pastelitos';
import { CREMAS_PRODUCTS } from './catalog/cremas';
import { PROMOTIONS } from './promotions';

const PROMO_PRODUCTS: Product[] = PROMOTIONS.map((promo) => ({
  id: promo.id,
  slug: promo.slug,
  name: promo.name,
  category: 'promociones' as ProductCategory,
  description: promo.description,
  image: promo.image,
  basePrice: promo.price,
  promoPrice: promo.price,
  badge: promo.badge || 'Promo',
  featured: promo.featuredHome,
}));

export const PRODUCTS: Product[] = [
  ...TEQUENOS_PRODUCTS,
  ...PROMO_PRODUCTS,
  ...PIZZAS_PRODUCTS,
  ...BEBIDAS_PRODUCTS,
  ...PASTELITOS_PRODUCTS,
  ...CREMAS_PRODUCTS,
];
