// ===================================================
// RETEQUEÑOS - EQUIVALENCIA CON EL CATÁLOGO DEL SERVIDOR
// La web conserva sus fotos, textos y slugs; precios y stock vienen del servidor.
// Los IDs oficiales son los del servidor (data/catalog.db.json).
// ===================================================

export interface ServerRef {
  productId: string;
  /** Presentación fija cuando la web muestra cada tamaño como un producto aparte (chicha ½ L / 1 L). */
  presentationId?: string;
}

export const SERVER_REFS: Record<string, ServerRef> = {
  // Tequeños (presentaciones 10 y 20 unid. con los mismos IDs que el servidor)
  'teq-queso': { productId: 'clasicos' },
  'teq-jamon-queso': { productId: 'jamon' },
  'teq-tocino-queso': { productId: 'tocino' },
  'teq-hotdog-queso': { productId: 'hotdog' },
  'teq-tres-quesos': { productId: 'tresquesos' },
  'teq-aji-gallina': { productId: 'ajigallina' },
  'teq-chocolate': { productId: 'dulces' },
  'teq-cheddar': { productId: 'cheddar' },
  'teq-jamon-cheddar': { productId: 'jamoncheddar' },

  // Promociones
  'promo-solo-para-mi': { productId: 'promo-solo' },
  'promo-extra': { productId: 'promo-extra' },
  'promo-familiar': { productId: 'promo-familiar' },
  'promo-antojo-criollo': { productId: 'promo-antojo' },
  'promo-sazon-antojo': { productId: 'promo-sazon' },
  'promo-duo': { productId: 'combo' },
  'promo-tequepizza': { productId: 'promo-tequepizza' },
  'promo-bocaditos-felicidad': { productId: 'promo-bocados' },
  'promo-fiesta-sabor': { productId: 'promo-fiesta' },
  'promo-mundo-sabores': { productId: 'promo-mundo' },
  'promo-sabor-sin-limites': { productId: 'promo-sinlimites' },
  'promo-doble-tentacion': { productId: 'promo-tentacion' },
  'promo-doble-placer': { productId: 'promo-placer' },

  // Pizzas familiares
  'piz-americana': { productId: 'pizza-americana' },
  'piz-italiana': { productId: 'pizza-italiana' },
  'piz-super-margarita': { productId: 'pizza-supermargarita' },
  'piz-hawaiana': { productId: 'pizza-hawaiana' },
  'piz-full-peperoni': { productId: 'pizza-peperoni' },
  'piz-la-especial': { productId: 'pizza-especial' },
  'piz-espanola': { productId: 'pizza-espanola' },
  'piz-vegetariana': { productId: 'pizza-vegetariana' },
  'piz-oriental': { productId: 'pizza-oriental' },
  'piz-primavera': { productId: 'pizza-primavera' },
  'piz-margarita': { productId: 'pizza-margarita' },

  // Pastelitos
  'pas-queso': { productId: 'pastel-queso' },
  'pas-jamon-queso': { productId: 'pastel-jamonqueso' },
  'pas-pizza': { productId: 'pastel-pizza' },
  'pas-pollo': { productId: 'pastel-pollo' },
  'pas-carne': { productId: 'pastel-carne' },

  // Bebidas
  'beb-coca-cola-600': { productId: 'cocacola' },
  'beb-inka-cola-600': { productId: 'inkakola' },
  'beb-pepsi-1l': { productId: 'pepsi1l' },
  'beb-pepsi-2l': { productId: 'pepsi2l' },
  'beb-chicha-medio': { productId: 'chicha', presentationId: 'medio' },
  'beb-chicha-1l': { productId: 'chicha', presentationId: '1l' },
  'beb-limonada-medio': { productId: 'limonada', presentationId: 'medio' },
  'beb-limonada-1l': { productId: 'limonada', presentationId: '1l' },
  'beb-agua': { productId: 'agua' },
  'beb-infusiones': { productId: 'infusiones' },

  // Cremas de 2 oz
  'cre-mayonesa-ajo': { productId: 'crema-ajo' },
  'cre-salsa-tocino': { productId: 'crema-tocino' },
  'cre-mayopalta': { productId: 'crema-mayopalta' },
  'cre-aji-especial': { productId: 'crema-aji' },
};

/** "Agranda tu pedido" del configurador: cada agregado es un producto del servidor. */
export const UPGRADE_REFS: Record<string, ServerRef> = {
  'extra-10-queso': { productId: 'clasicos', presentationId: '10' },
  'extra-pastelito-queso': { productId: 'pastel-queso' },
  'extra-pastelito-jamon': { productId: 'pastel-jamonqueso' },
  'extra-crema-mayo': { productId: 'crema-ajo' },
  'extra-crema-tocino': { productId: 'crema-tocino' },
  'extra-crema-palta': { productId: 'crema-mayopalta' },
  'extra-crema-aji': { productId: 'crema-aji' },
};

export function serverRefOf(localId: string): ServerRef | undefined {
  return SERVER_REFS[localId];
}
