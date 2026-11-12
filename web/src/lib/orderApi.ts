// ===================================================
// RETEQUEÑOS - COTIZACIÓN Y PEDIDO CON EL SERVIDOR
// El pedido se crea "por confirmar"; WhatsApp solo lleva el código para que caja lo confirme.
// ===================================================

import type { CartItem } from '../store/cartStore';
import { API_BASE } from '../services/catalog.api';
import { specFromItem, type LineSpec } from './cartSpec';
import { authService } from '../services/auth.service';

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

export type PayMethod = 'Efectivo' | 'Yape' | 'Plin' | 'Transferencia';
export const PAY_METHODS: PayMethod[] = ['Efectivo', 'Yape', 'Plin', 'Transferencia'];
export const isDigitalPay = (method?: string) => /yape|plin|transfer/i.test(method || '');

export interface OrderResult extends QuoteResult {
  code: string;
  /** Permite subir la constancia de pago de este pedido. */
  accessToken: string;
  payMethod: string;
  scheduledFor: string | null;
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
  payMethod?: PayMethod;
  /** ISO; vacío = lo antes posible (RFI-07). */
  scheduledFor?: string;
  /** Punto elegido en el mapa para el delivery (RFI-06). */
  location?: { lat: number; lng: number };
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
  // Con sesión, el pedido queda en el historial de la cuenta (RFI-10)
  const token = authService.getToken();
  // Plazo largo: el servidor puede estar despertando. Si se agota, un reintento con la misma clave no duplica.
  return post<OrderResult>('/api/public/orders', body, { 'Idempotency-Key': lastAttempt.key, ...(token ? { 'x-customer-token': token } : {}) }, 45000);
}

/** Achica la foto de la constancia a JPEG de hasta 1600 px para que pese menos de 2 MB. */
export async function compressImage(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Adjunta una foto JPG, PNG o WEBP.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('No pudimos leer la imagen. Prueba con otra foto.'));
      el.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Sube la constancia de Yape / Plin / transferencia (RFI-08). */
export function uploadReceipt(code: string, accessToken: string, image: string): Promise<{ message: string }> {
  return post<{ message: string }>(`/api/public/orders/${encodeURIComponent(code)}/receipt`, { image }, { 'x-order-token': accessToken }, 45000);
}

export interface OrderStatus {
  id: string;
  status: 'pending_confirmation' | 'new' | 'kitchen' | 'delivery' | 'delivered' | 'cancelled';
  mode: OrderMode;
  total: number;
  subtotal: number;
  discount: number;
  payMethod: string;
  payVerified: boolean;
  createdAt: string;
  scheduledFor: string | null;
  statusAt: Partial<Record<string, string>>;
  hasReceipt: boolean;
  driverAssigned: boolean;
  items: { name: string; qty: number; price: number; sauces?: string; spec?: LineSpec }[];
}

/** Estado del pedido sin datos personales (RFI-09). */
export async function fetchOrderStatus(code: string): Promise<OrderStatus> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/pedidos/${encodeURIComponent(code)}`, { cache: 'no-store' });
  } catch {
    throw new StoreUnavailableError();
  }
  if (res.status === 404) throw new Error('No encontramos ese pedido.');
  if (!res.ok) throw new StoreUnavailableError();
  return res.json();
}

/** Al cerrar un pedido ya registrado: el siguiente, aunque sea igual, es un pedido nuevo. */
export function resetOrderAttempt(): void {
  lastAttempt = null;
}
