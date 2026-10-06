// ===================================================
// RETEQUEÑOS - CLIENTE DE API DEL CATALOGO
// Consume /api/catalog con fallback seguro a catálogo local
// ===================================================

import { Product } from '../types/product';
import { PRODUCTS } from '../data/catalog';

let cachedCatalog: Product[] | null = null;

export async function fetchCatalog(): Promise<Product[]> {
  if (cachedCatalog && cachedCatalog.length > 0) {
    return cachedCatalog;
  }

  try {
    const endpoints = ['/api/catalog', 'http://localhost:3000/api/catalog'];
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // Unificamos el catálogo remoto con la información de imágenes y slugs local si hiciera falta
            cachedCatalog = PRODUCTS.map((local) => {
              const remote = data.find((r: { id: string }) => r.id === local.id);
              if (remote) {
                return {
                  ...local,
                  basePrice: Number(remote.price) || local.basePrice,
                  promoPrice: remote.promo ? Number(remote.promo) : local.promoPrice,
                  stock: remote.stock !== false,
                  badge: remote.badge || local.badge,
                };
              }
              return local;
            });
            return cachedCatalog;
          }
        }
      } catch {
        // Siguiente endpoint
      }
    }
  } catch {
    // Modo offline o servidor no alcanzable
  }

  cachedCatalog = PRODUCTS;
  return PRODUCTS;
}

export function getLocalCatalog(): Product[] {
  return cachedCatalog || PRODUCTS;
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const catalog = await fetchCatalog();
  return catalog.find((p) => p.slug === slug || p.id === slug);
}
