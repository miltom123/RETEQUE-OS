import { siteConfig } from '../config/site';

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

/** Cierra la pestaña preparada si el pedido no se pudo crear. */
export function discardWhatsAppWindow(target: Window | null): void {
  if (target && !target.closed) target.close();
}
