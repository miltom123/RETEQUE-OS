// ===================================================
// RETEQUEÑOS - LÍNEA DEL CARRITO PARA EL SERVIDOR
// El servidor calcula el precio con esto; el precio que muestra la web es solo referencia.
// ===================================================

import { PRODUCTS } from '../data/catalog';
import { SERVER_REFS } from '../data/serverRefs';

export interface LineAddon {
  productId: string;
  presentationId?: string;
  qty: number;
}

export interface LineSpec {
  /** ID del producto en el catálogo del servidor. */
  productId: string;
  presentationId?: string;
  /** Extras que se cobran (id del extra -> cantidad). */
  extras?: Record<string, number>;
  /** Bebida elegida en una promo. */
  drinkId?: string;
  /** Agregados que se cobran como productos ("Agranda tu pedido"). */
  addons?: LineAddon[];
  /** Texto para cocina: sabores, cremas incluidas, notas. No cambia el precio. */
  details?: string;
}

interface SpecSource {
  productId: string;
  selectedPresentation?: string;
  selectedOptions?: string[];
  notes?: string;
}

/** Texto para cocina con lo elegido que no cambia el precio. */
export function kitchenDetails(options: (string | undefined)[]): string | undefined {
  const text = options.filter(Boolean).join(' · ').slice(0, 300);
  return text || undefined;
}

/**
 * Línea por defecto para lo que se agrega sin extras con precio: producto y tamaño.
 * Los configuradores que cobran extras, bebidas o agregados envían su propia línea.
 */
export function specFromItem(item: SpecSource): LineSpec | undefined {
  const ref = SERVER_REFS[item.productId];
  if (!ref) return undefined;
  const local = PRODUCTS.find((p) => p.id === item.productId);
  const presentationId =
    ref.presentationId ?? local?.presentations?.find((p) => p.label === item.selectedPresentation)?.id;
  return {
    productId: ref.productId,
    ...(presentationId ? { presentationId } : {}),
    details: kitchenDetails([...(item.selectedOptions || []), item.notes]),
  };
}
