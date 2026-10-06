import { Product, ProductOption } from './types';

export const CREMAS_EXTRAS: ProductOption[] = [
  { id: 'mayonesa-ajo', label: 'Mayonesa de ajo', price: 2.00 },
  { id: 'salsa-tocino', label: 'Salsa tocino', price: 2.00 },
  { id: 'mayopalta', label: 'Mayopalta', price: 2.00 },
  { id: 'aji-especial', label: 'Ají especial', price: 2.00 },
];

export const CREMAS_PRODUCTS: Product[] = [
  {
    id: 'cre-mayonesa-ajo',
    slug: 'crema-mayonesa-de-ajo',
    name: 'Mayonesa de ajo — 2 oz',
    category: 'cremas',
    description: 'Salsa artesanal emblemática de la casa',
    image: '/assets/products/cremas/mayonesa-ajo.jpg',
    basePrice: 2.00,
  },
  {
    id: 'cre-salsa-tocino',
    slug: 'crema-salsa-tocino',
    name: 'Salsa tocino — 2 oz',
    category: 'cremas',
    description: 'Cremosa salsa con auténtico toque ahumado de tocino',
    image: '/assets/products/cremas/salsa-tocino.jpg',
    basePrice: 2.00,
  },
  {
    id: 'cre-mayopalta',
    slug: 'crema-mayopalta',
    name: 'Mayopalta — 2 oz',
    category: 'cremas',
    description: 'Suave y cremosa salsa de palta fresca',
    image: '/assets/products/cremas/mayopalta.jpg',
    basePrice: 2.00,
  },
  {
    id: 'cre-aji-especial',
    slug: 'crema-aji-especial',
    name: 'Ají especial — 2 oz',
    category: 'cremas',
    description: 'El toque picante y aromático tradicional',
    image: '/assets/products/cremas/aji-especial.jpg',
    basePrice: 2.00,
  },
];
