import { CartItem } from '../store/cartStore';
import { CheckoutStore } from '../store/checkoutStore';
import { siteConfig } from '../config/site';
import { formatMoney, roundMoney } from './money';
import { OrderRequest } from '../types/orderRequest';

export type CustomerData = Omit<CheckoutStore, 'setField' | 'reset'>;

/** Enlace universal de WhatsApp (funciona en celular y en escritorio). */
export function buildWhatsAppUrl(text: string): string {
  return `https://wa.me/${siteConfig.whatsappInternational}?text=${encodeURIComponent(text)}`;
}

export function openWhatsApp(text: string): void {
  window.open(buildWhatsAppUrl(text), '_blank', 'noopener,noreferrer');
}

/**
 * Genera el mensaje formateado estándar para Retequeños según la especificación del Plan.
 * No simula pagos ni asigna comanda KDS anticipada.
 */
export function formatOrderRequestMessage(request: OrderRequest, couponCode?: string): string {
  const lines: string[] = [
    '🥟 *PEDIDO RETEQUEÑOS*',
    '',
    '👤 *CLIENTE*',
    `Nombre: ${request.customer.name.trim() || 'No especificado'}`,
    `Celular: ${request.customer.phone.trim() || 'No especificado'}`,
    '',
    '🛒 *PEDIDO*',
    '',
  ];

  request.items.forEach((item) => {
    lines.push(`${item.quantity} × ${item.name}`);
    if (item.selectedPresentation) {
      lines.push(`• Presentación: ${item.selectedPresentation}`);
    }
    if (item.selectedOptions && item.selectedOptions.length > 0) {
      lines.push(`• Salsa: ${item.selectedOptions.join(', ')}`);
    }
    if (item.notes) {
      lines.push(`• Extra / Detalle: ${item.notes}`);
    }
    lines.push('');
  });

  if (request.fulfillment.type === 'delivery') {
    lines.push('🚚 *MODALIDAD*');
    lines.push('Delivery');
    lines.push('');
    lines.push('📍 Dirección:');
    lines.push(request.fulfillment.address || 'A coordinar');
    if (request.fulfillment.reference) {
      lines.push('');
      lines.push('📌 Referencia:');
      lines.push(request.fulfillment.reference);
    }
  } else {
    lines.push('🏪 *MODALIDAD*');
    lines.push('Recojo en tienda');
    lines.push(`📍 Local: ${siteConfig.address}`);
  }

  lines.push('');
  lines.push('💰 *RESUMEN*');
  lines.push(`Subtotal: ${formatMoney(request.subtotal)}`);

  if (couponCode && request.discount > 0) {
    lines.push(`Descuento (${couponCode}): -${formatMoney(request.discount)}`);
  }

  lines.push(`Total productos: ${formatMoney(request.totalProducts)}`);

  if (request.fulfillment.type === 'delivery') {
    lines.push('');
    lines.push('Delivery: A coordinar por WhatsApp');
  }

  if (request.notes && request.notes.trim()) {
    lines.push('');
    lines.push('📝 *OBSERVACIONES*');
    lines.push(request.notes.trim());
  }

  lines.push('');
  lines.push('Hola 👋 Quisiera solicitar este pedido.');
  lines.push('¿Podrían confirmarme disponibilidad, delivery y forma de pago?');

  return lines.join('\n');
}

/**
 * Función compatible con el checkout existente de la web y el nuevo frontend móvil.
 * NO sincroniza automáticamente con el KDS. Solo prepara y abre WhatsApp.
 */
export function generateWhatsAppMessage(
  items: CartItem[],
  customer: CustomerData,
  subtotal: number,
  _deliveryFee: number = 0,
  _zoneName?: string,
  _orderId?: string,
  discount: number = 0,
  couponCode?: string
): string {
  const totalProducts = roundMoney(Math.max(0, subtotal - discount));
  const request: OrderRequest = {
    customer: {
      name: customer.fullName || '',
      phone: customer.phone || '',
    },
    fulfillment: {
      type: customer.deliveryType === 'delivery' ? 'delivery' : 'pickup',
      address: customer.address,
      reference: customer.reference,
    },
    items,
    notes: customer.generalNotes,
    subtotal,
    discount,
    totalProducts,
  };

  return formatOrderRequestMessage(request, couponCode);
}

export function openWhatsAppCheckout(
  items: CartItem[],
  customer: CustomerData,
  subtotal: number,
  deliveryFee: number = 0,
  zoneName?: string,
  discount: number = 0,
  couponCode?: string
): void {
  // Directamente abrir WhatsApp sin sincronización previa con KDS
  const message = generateWhatsAppMessage(items, customer, subtotal, deliveryFee, zoneName, undefined, discount, couponCode);
  openWhatsApp(message);
}

export function openWhatsAppDirect(customText?: string): void {
  openWhatsApp(customText || '¡Hola Retequeños! Me gustaría hacer una consulta sobre su carta.');
}
