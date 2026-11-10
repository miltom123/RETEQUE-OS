import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { roundMoney } from '../lib/money';
import { isSoldOut } from '../services/catalog.api';
import { specFromItem, type LineSpec } from '../lib/cartSpec';
import { useUiStore } from './uiStore';

export interface CartItem {
  lineId: string;
  productId: string;
  name: string;
  image: string;
  quantity: number;
  /** Precio de referencia para mostrar; el total real lo calcula el servidor con `spec`. */
  unitPrice: number;
  selectedPresentation?: string;
  selectedOptions?: string[];
  notes?: string;
  /** Lo elegido, en el formato que cotiza el servidor. */
  spec?: LineSpec;
}

interface CartStore {
  items: CartItem[];
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  setIsCartOpen: (open: boolean) => void;
  /** Devuelve false si no se agregó (producto agotado), para no mostrar un aviso de éxito falso. */
  addItem: (item: Omit<CartItem, 'lineId'>) => boolean;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, delta: number) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotalCount: () => number;
}

const MAX_QTY = 50;

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isCartOpen: false,

      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),
      setIsCartOpen: (open: boolean) => set({ isCartOpen: open }),

      addItem: (newItem) => {
        // Un solo control para todas las formas de agregar: lo agotado en el panel no entra al carrito
        if (isSoldOut(newItem.productId)) {
          useUiStore.getState().showToast({ message: `${newItem.name} está agotado por ahora.` });
          return false;
        }
        const items = get().items;
        const optionsKey = [...(newItem.selectedOptions || [])].sort().join(',');
        const existingIndex = items.findIndex(
          (i) =>
            i.productId === newItem.productId &&
            i.selectedPresentation === newItem.selectedPresentation &&
            [...(i.selectedOptions || [])].sort().join(',') === optionsKey &&
            (i.notes || '') === (newItem.notes || '')
        );

        if (existingIndex > -1) {
          set({
            items: items.map((i, idx) =>
              idx === existingIndex
                ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + newItem.quantity) }
                : i
            ),
          });
        } else {
          const lineId = `${newItem.productId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          set({ items: [...items, { ...newItem, spec: newItem.spec ?? specFromItem(newItem), lineId }] });
        }
        return true;
      },

      removeItem: (lineId) => {
        set({ items: get().items.filter((i) => i.lineId !== lineId) });
      },

      updateQuantity: (lineId, delta) => {
        const updated = get()
          .items.map((i) => {
            if (i.lineId === lineId) {
              const newQty = Math.min(MAX_QTY, i.quantity + delta);
              return newQty > 0 ? { ...i, quantity: newQty } : null;
            }
            return i;
          })
          .filter((i): i is CartItem => i !== null);
        set({ items: updated });
      },

      setQuantity: (lineId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(lineId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.lineId === lineId ? { ...i, quantity: Math.min(MAX_QTY, quantity) } : i
          ),
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      getSubtotal: () => {
        return roundMoney(get().items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));
      },

      getTotalCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'retequenos_cart_storage',
      version: 3,
      // Solo se guardan los productos; el estado "abierto/cerrado" no sobrevive a la recarga.
      partialize: (state) => ({ items: state.items }),
      // Los carritos anteriores no guardaban lo elegido en formato del servidor: se vacían una vez
      migrate: (persisted, version) => (version < 3 ? { items: [] } : persisted) as CartStore,
    }
  )
);
