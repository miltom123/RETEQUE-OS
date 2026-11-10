// ===================================================
// RETEQUEÑOS - COTIZACIÓN Y PEDIDO CON EL SERVIDOR
// El pedido se crea "por confirmar"; WhatsApp solo lleva el código para que caja lo confirme.
// ===================================================

import type { CartItem } from '../store/cartStore';
import { API_BASE } from '../services/catalog.api';
import { specFromItem, type LineSpec } from './cartSpec';

export type OrderMode = 'delivery' | 'pickup';

export interface QuoteLine {
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  summary: string;
}

export interface QuoteResult {
  items: QuoteLine[];
  subtotal: number;
  discount: number;
  total: number;
  coupon: { code: string; applied: boolean; discount: number; message: string } | null;
  deliveryNote: string | null;
}

export interface OrderResult extends QuoteResult {
  code: string;
  whatsappText: string;
  whatsappUrl: string | null;
}

export interface OrderDetails {
  customer: { name: string; phone: string };
  mode: OrderMode;
  address?: string;
  reference?: string;
  notes?: string;
  couponCode?: string;
}

const NETWORK_ERROR = 'No pudimos conectar con la tienda. Revisa tu conexión e inténtalo de nuevo.';

/** La tienda no respondió (sin red, servidor caído o demasiado lento). El pedido puede ir completo por WhatsApp. */
export class StoreUnavailableError extends Error {
  constructor() {
    super(NETWORK_ERROR);
    this.name = 'StoreUnavailableError';
  }
}

/** Líneas para el servidor: la que guardó el configurador o una deducida del producto. */
function serverLines(items: { spec?: LineSpec; quantity: number; productId: string; selectedPresentation?: string; selectedOptions?: string[]; notes?: string }[]) {
  return items.map((item) => {
    const spec = item.spec ?? specFromItem(item);
    if (!spec) throw new Error('Un producto de tu carrito ya no está en la carta. Quítalo e inténtalo de nuevo.');
    return { ...spec, qty: item.quantity };
  });
}

async function post<T>(path: string, body: unknown, headers: Record<string, string> = {}, timeoutMs = 20000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  let data: { error?: string } & T;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    data = await res.json();
  } catch {
    // Sin red, sin respuesta a tiempo o una respuesta que no es de la tienda (página de error del hosting)
    throw new StoreUnavailableError();
  } finally {
    clearTimeout(timer);
  }
  if (res.status >= 500) throw new StoreUnavailableError();
  if (!res.ok) throw new Error(data.error || NETWORK_ERROR);
  return data;
}

export function quoteCart(items: CartItem[], mode: OrderMode, couponCode?: string): Promise<QuoteResult> {
  return post<QuoteResult>('/api/public/quote', { items: serverLines(items), mode, couponCode });
}

function newKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

// Mientras el pedido no cambie se reutiliza la clave: un reintento devuelve el mismo pedido, no otro
let lastAttempt: { body: string; key: string } | null = null;

export function submitOrder(
  items: Parameters<typeof serverLines>[0],
  details: OrderDetails
): Promise<OrderResult> {
  const body = { ...details, items: serverLines(items) };
  const serialized = JSON.stringify(body);
  if (!lastAttempt || lastAttempt.body !== serialized) lastAttempt = { body: serialized, key: newKey() };
  // Plazo largo: el servidor puede estar despertando. Si se agota, un reintento con la misma clave no duplica.
  return post<OrderResult>('/api/public/orders', body, { 'Idempotency-Key': lastAttempt.key }, 45000);
}

/** Al cerrar un pedido ya registrado: el siguiente, aunque sea igual, es un pedido nuevo. */
export function resetOrderAttempt(): void {
  lastAttempt = null;
}
