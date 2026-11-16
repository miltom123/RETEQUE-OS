// ===================================================
// RETEQUEÑOS - SINCRONIZACIÓN CON EL CATÁLOGO DEL SERVIDOR
// La carta local trae fotos y textos; el servidor decide precios y stock.
// Si la API no responde, la tienda sigue con los precios locales y el servidor
// igual recalcula el total al crear el pedido.
// ===================================================

import { PRODUCTS, PROMOTIONS, CREMAS_EXTRAS, PIZZA_ADICIONALES } from '../data/catalog';
import { DRINKS, UPGRADES } from '../components/configurator/configuratorData';
import { SERVER_REFS, UPGRADE_REFS } from '../data/serverRefs';
import type { ProductCategory } from '../types/product';

// Categoría del panel (campo `cat`) -> sección de la web
const CATEGORY_BY_CAT: Record<string, ProductCategory> = {
  'Clásicos': 'tequenos', Especiales: 'tequenos', Combos: 'promociones', Pizzas: 'pizzas',
  Pastelitos: 'pastelitos', Bebidas: 'bebidas', Salsas: 'cremas', Cremas: 'cremas',
};

interface ServerOption {
  id: string;
  label: string;
  price?: number;
}

interface ServerProduct {
  id: string;
  price: number;
  promo: number | null;
  stock: boolean;
  options: { presentations?: ServerOption[]; extras?: ServerOption[]; drinks?: ServerOption[] } | null;
}

export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const soldOut = new Set<string>(); // IDs locales agotados según el servidor

export function isSoldOut(localId: string): boolean {
  return soldOut.has(localId);
}

const basePrice = (p: ServerProduct) => (p.promo != null ? p.promo : p.price);

// Sin precio propio, la presentación usa el precio del producto (el que se edita en el panel)
function presentationPrice(p: ServerProduct, id: string): number | undefined {
  const presentation = p.options?.presentations?.find((x) => x.id === id);
  if (!presentation) return undefined;
  return presentation.price != null ? presentation.price : basePrice(p);
}

function copyPrices<T extends { id: string }>(local: T[], remote: ServerOption[] | undefined, field: keyof T) {
  if (!remote) return;
  for (const item of local) {
    const match = remote.find((r) => r.id === item.id);
    if (match && match.price != null) (item[field] as unknown as number) = match.price;
  }
}

/** Actualiza en el lugar los precios y el stock de la carta. Devuelve true si se aplicó el catálogo del servidor. */
export async function syncCatalogWithServer(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/catalog`, { cache: 'no-cache' });
  if (!res.ok) return false;
  const data: unknown = await res.json();
  if (!Array.isArray(data) || data.length === 0) return false;
  const byId = new Map((data as ServerProduct[]).map((p) => [p.id, p]));

  for (const product of PRODUCTS) {
    const ref = SERVER_REFS[product.id];
    const remote = ref && byId.get(ref.productId);
    if (!remote) continue;
    if (product.presentations && product.presentations.length > 0) {
      for (const presentation of product.presentations) {
        const price = presentationPrice(remote, presentation.id);
        if (price != null) presentation.price = price;
      }
      product.basePrice = product.presentations[0].price;
    } else {
      const price = ref.presentationId ? presentationPrice(remote, ref.presentationId) : basePrice(remote);
      if (price != null) {
        product.basePrice = price;
        if (product.promoPrice != null) product.promoPrice = price;
      }
    }
    if (remote.stock === false) {
      soldOut.add(product.id);
      product.badge = 'Agotado';
    }
  }

  for (const promo of PROMOTIONS) {
    const remote = byId.get(SERVER_REFS[promo.id]?.productId || '');
    if (!remote) continue;
    promo.price = basePrice(remote);
    if (remote.stock === false) {
      soldOut.add(promo.id);
      promo.badge = 'Agotado';
    }
  }

  // RFI-15: lo que el panel borra deja de venderse y lo que crea aparece en la carta
  const referenced = new Set([...Object.values(SERVER_REFS), ...Object.values(UPGRADE_REFS)].map((r) => r.productId));
  for (const product of PRODUCTS) {
    const ref = SERVER_REFS[product.id];
    if (ref && !byId.has(ref.productId)) soldOut.add(product.id);
  }
  for (const remote of data as (ServerProduct & { name: string; cat: string; desc?: string; badge?: string })[]) {
    if (referenced.has(remote.id) || PRODUCTS.some((p) => p.id === remote.id)) continue;
    const category = CATEGORY_BY_CAT[remote.cat] || 'tequenos';
    PRODUCTS.push({
      id: remote.id,
      slug: remote.id,
      name: remote.name,
      category,
      description: remote.desc || undefined,
      // Sin foto propia: se usa la de otro producto de la misma categoría
      image: PRODUCTS.find((p) => p.category === category)?.image || '/assets/hero-banner.jpg',
      basePrice: basePrice(remote),
      badge: remote.stock === false ? 'Agotado' : remote.badge || undefined,
    });
    SERVER_REFS[remote.id] = { productId: remote.id };
    if (remote.stock === false) soldOut.add(remote.id);
  }

  // Opciones compartidas por varios productos: cremas de los tequeños, adicionales de pizza y bebidas de las promos
  copyPrices(CREMAS_EXTRAS, byId.get('clasicos')?.options?.extras, 'price');
  copyPrices(PIZZA_ADICIONALES, byId.get('pizza-americana')?.options?.extras, 'price');
  copyPrices(DRINKS, byId.get('promo-solo')?.options?.drinks, 'extraPrice');
  for (const upgrade of UPGRADES) {
    const ref = UPGRADE_REFS[upgrade.id];
    const remote = ref && byId.get(ref.productId);
    if (!remote) continue;
    const price = ref.presentationId ? presentationPrice(remote, ref.presentationId) : basePrice(remote);
    if (price != null) upgrade.price = price;
    if (remote.stock === false) soldOut.add(upgrade.id);
  }
  return true;
}
