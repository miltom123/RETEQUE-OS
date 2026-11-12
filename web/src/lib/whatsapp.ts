import { siteConfig } from '../config/site';
import { formatMoney, roundMoney } from './money';
import type { OrderDetails } from './orderApi';

/** Enlace universal de WhatsApp (funciona en celular y en escritorio). */
export function buildWhatsAppUrl(text: string): string {
  return `https://wa.me/${siteConfig.whatsappInternational}?text=${encodeURIComponent(text)}`;
}

export function openWhatsApp(text: string): void {
  window.open(buildWhatsAppUrl(text), '_blank', 'noopener,noreferrer');
}

export function openWhatsAppDirect(customText?: string): void {
  openWhatsApp(customText || '¡Hola Retequeños! Me gustaría hacer una consulta sobre su carta.');
}

/**
 * Abre una pestaña vacía en el mismo clic del cliente. Si se abriera después de esperar al servidor,
 * el navegador la bloquearía como ventana emergente.
 */
export function prepareWhatsAppWindow(): Window | null {
  return window.open('', '_blank');
}

/**
 * Lleva a WhatsApp con el mensaje del pedido (solo el código RTQ-…). Usa la pestaña preparada
 * si existe; si el navegador la bloqueó, devuelve false y la pantalla muestra un enlace para abrirlo a mano.
 */
export function openWhatsAppOrder(target: Window | null, url: string): boolean {
  if (target && !target.closed) {
    target.opener = null;
    target.location.href = url;
    return true;
  }
  return Boolean(window.open(url, '_blank', 'noopener,noreferrer'));
}

export interface FallbackLine {
  name: string;
  quantity: number;
  unitPrice: number;
  selectedPresentation?: string;
  selectedOptions?: string[];
  notes?: string;
}

/**
 * Respaldo para cuando la tienda no responde: el pedido viaja completo en el mensaje, sin código,
 * y caja lo registra a mano. Los precios son de referencia; caja confirma el total y el cupón.
 */
export function buildFallbackOrderUrl(lines: FallbackLine[], details: OrderDetails): string {
  const text: string[] = ['Hola, quiero hacer este pedido. La web no pudo registrarlo, así que va completo:', ''];
  for (const line of lines) {
    const size = line.selectedPresentation ? ` (${line.selectedPresentation})` : '';
    text.push(`- ${line.quantity} x ${line.name}${size}: ${formatMoney(line.unitPrice * line.quantity)}`);
    const extra = [...(line.selectedOptions || []), line.notes].filter(Boolean).join(' · ');
    if (extra) text.push(`  ${extra}`);
  }
  const total = roundMoney(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
  text.push('', `Total de referencia: ${formatMoney(total)}`);
  if (details.couponCode) text.push(`Cupón por aplicar: ${details.couponCode}`);
  text.push('', `Nombre: ${details.customer.name}`, `Celular: ${details.customer.phone}`);
  text.push(`Entrega: ${details.mode === 'delivery' ? 'Delivery' : 'Recojo en tienda'}`);
  if (details.address) text.push(`Dirección: ${details.address}`);
  if (details.reference) text.push(`Referencia: ${details.reference}`);
  if (details.notes) text.push(`Indicaciones: ${details.notes}`);
  // Si la tienda respondió tarde, el pedido pudo quedar guardado igual: caja no debe tomarlo como otro
  text.push('', 'Si en el panel aparece un pedido por confirmar con mi celular, es este mismo.');
  return buildWhatsAppUrl(text.join('\n'));
}

/** Cierra la pestaña preparada si el pedido no se pudo crear. */
export function discardWhatsAppWindow(target: Window | null): void {
  if (target && !target.closed) target.close();
}
