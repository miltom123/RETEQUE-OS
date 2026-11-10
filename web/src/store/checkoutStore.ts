import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Mismos valores que el servidor; antes el escritorio guardaba "recojo" y el móvil "pickup". */
export type DeliveryType = 'delivery' | 'pickup';

export interface CheckoutStore {
  fullName: string;
  phone: string;
  deliveryType: DeliveryType;
  address: string;
  reference: string;
  generalNotes: string;
  /** Cupón aplicado en el carrito; el servidor lo vuelve a validar al crear el pedido. */
  couponCode: string;
  setField: (field: keyof Omit<CheckoutStore, 'setField' | 'reset'>, value: string) => void;
  reset: () => void;
}

const EMPTY = {
  fullName: '',
  phone: '',
  deliveryType: 'delivery' as DeliveryType,
  address: '',
  reference: '',
  generalNotes: '',
  couponCode: '',
};

export const useCheckoutStore = create<CheckoutStore>()(
  persist(
    (set) => ({
      ...EMPTY,

      setField: (field, value) => {
        set((state) => ({ ...state, [field]: value }));
      },

      reset: () => {
        set({ ...EMPTY });
      },
    }),
    {
      // Nombre nuevo: descarta los datos de prueba que quedaron guardados con la versión anterior.
      name: 'retequenos_checkout_v2',
      version: 1,
      migrate: (persisted, version) => {
        const state = (persisted || {}) as Omit<Partial<CheckoutStore>, 'deliveryType'> & { deliveryType?: string };
        if (version < 1 && state.deliveryType === 'recojo') state.deliveryType = 'pickup';
        return state as CheckoutStore;
      },
      partialize: (state) => ({
        fullName: state.fullName,
        phone: state.phone,
        deliveryType: state.deliveryType,
        address: state.address,
        reference: state.reference,
        generalNotes: state.generalNotes,
        couponCode: state.couponCode,
      }),
    }
  )
);
