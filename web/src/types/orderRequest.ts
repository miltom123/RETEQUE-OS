// ===================================================
// RETEQUEÑOS - MODELO OFICIAL DE SOLICITUD DE PEDIDO
// Flujo comercial sin pasarelas ni KDS automático
// ===================================================

import { CartItem } from './cart';

export type FulfillmentType = 'delivery' | 'pickup';

export interface OrderCustomer {
  name: string;
  phone: string;
}

export interface OrderFulfillment {
  type: FulfillmentType;
  address?: string;
  reference?: string;
}

export interface OrderRequest {
  customer: OrderCustomer;
  fulfillment: OrderFulfillment;
  items: CartItem[];
  notes?: string;
  subtotal: number;
  discount: number;
  totalProducts: number;
}
