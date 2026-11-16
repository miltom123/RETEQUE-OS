// ===================================================
// RETEQUEÑOS - REPETIR UN PEDIDO (RFI-10)
// Vuelve a llenar el carrito con lo pedido. El servidor recalcula precios y stock al enviarlo.
// ===================================================

import { PRODUCTS } from '../data/catalog';
import { SERVER_REFS } from '../data/serverRefs';
import type { CartItem } from '../store/cartStore';
import type { LineSpec } from './cartSpec';

type NewItem = Omit<CartItem, 'lineId'>;

/** Producto local (foto, id) que corresponde a un producto del servidor. */
function localFor(spec: LineSpec) {
  return PRODUCTS.find((p) => {
    const ref = SERVER_REFS[p.id];
    return ref && ref.productId === spec.productId && (!ref.presentationId || ref.presentationId === spec.presentationId);
  });
}

/** Líneas de un pedido del servidor (historial de la cuenta) convertidas en productos del carrito. */
export function itemsFromServerLines(lines: { name: string; qty: number; price: number; sauces?: string; spec?: LineSpec }[]): NewItem[] {
  return lines
    .filter((line) => line.spec)
    .map((line) => {
      const local = localFor(line.spec!);
      return {
        productId: local?.id ?? line.spec!.productId,
        name: line.name,
        image: local?.image ?? '/assets/placeholder.jpg',
        quantity: line.qty,
        unitPrice: line.price,
        selectedOptions: line.sauces ? [line.sauces] : undefined,
        spec: line.spec,
      };
    });
}

/** Agrega al carrito; devuelve cuántas líneas entraron (lo agotado queda fuera). */
export function repeatInto(addItem: (item: NewItem) => boolean, items: NewItem[]): number {
  return items.reduce((count, item) => count + (addItem(item) ? 1 : 0), 0);
}
