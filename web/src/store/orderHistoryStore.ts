import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from './cartStore';
import type { OrderMode } from '../lib/orderApi';

/**
 * Pedidos hechos desde este celular (RFI-09 y RFI-10). Sirve también a los invitados:
 * guarda el código para seguir el pedido, el token para subir la constancia y lo que se
 * pidió para repetirlo. Con cuenta, el historial además viene del servidor.
 */
export interface LocalOrder {
  code: string;
  accessToken: string;
  createdAt: string;
  total: number;
  mode: OrderMode;
  payMethod: string;
  scheduledFor: string | null;
  items: CartItem[];
}

interface OrderHistoryStore {
  orders: LocalOrder[];
  add: (order: LocalOrder) => void;
  find: (code: string) => LocalOrder | undefined;
}

const MAX_ORDERS = 30;

export const useOrderHistoryStore = create<OrderHistoryStore>()(
  persist(
    (set, get) => ({
      orders: [],
      add: (order) =>
        set({ orders: [order, ...get().orders.filter((o) => o.code !== order.code)].slice(0, MAX_ORDERS) }),
      find: (code) => get().orders.find((o) => o.code === code),
    }),
    { name: 'retequenos_order_history', version: 1 }
  )
);
