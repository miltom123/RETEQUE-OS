/**
 * Despacho al motorizado automatizado con n8n (RFI-14). n8n solo envía mensajes; el backend decide.
 *
 * Flujo:
 *  1. El pedido de delivery pasa a "delivery" (o el personal pulsa Despachar).
 *  2. Sin motorizado elegido -> evento `dispatch.offered` al webhook de n8n: n8n avisa al grupo de
 *     motorizados SIN datos del cliente (RNF-03), con un enlace para tomar el pedido, y si nadie lo
 *     toma en `alertAfterMinutes` (5 por defecto, RNF-06) avisa al operador.
 *  3. El motorizado que lo toma (o el que elige el personal) -> evento `dispatch.assigned` con la
 *     comanda completa, que n8n envía solo a ese motorizado por mensaje privado.
 *  4. Si n8n no responde, el pedido queda con dispatch.status = 'failed' y el panel ofrece la
 *     coordinación manual y el reintento (RNF-05). El estado del pedido nunca se pierde por esto.
 *
 * Variables de entorno: RTQ_N8N_WEBHOOK_URL (webhook de n8n), RTQ_N8N_TOKEN (secreto compartido
 * en ambos sentidos) y RTQ_PUBLIC_URL (dirección pública del backend para los enlaces).
 */
const crypto = require('crypto');
const { normalizePeruMobile, sanitizeString, cleanId } = require('./sanitize');

const DEFAULT_ALERT_MINUTES = 5;
const sha256 = value => crypto.createHash('sha256').update(String(value)).digest('hex');

function alertMinutes(config) {
  const n = Number(config && config.dispatchAlertMinutes);
  return Number.isFinite(n) && n >= 1 && n <= 60 ? Math.round(n) : DEFAULT_ALERT_MINUTES;
}

function activeDrivers(config) {
  return (Array.isArray(config && config.drivers) ? config.drivers : []).filter(d => d && d.active !== false);
}

// Lista de motorizados guardada en la configuración. Valida y limpia lo que envía el panel.
function normalizeDrivers(list) {
  if (!Array.isArray(list) || list.length > 30) throw new Error('Envía de 0 a 30 motorizados.');
  const seen = new Set();
  return list.map(raw => {
    const name = sanitizeString(String(raw && raw.name || '')).slice(0, 60);
    if (name.length < 3) throw new Error('Cada motorizado necesita un nombre de al menos 3 letras.');
    const phone = normalizePeruMobile(raw.phone);
    if (!phone) throw new Error(`El celular de ${name} debe tener 9 dígitos y empezar con 9.`);
    if (seen.has(phone)) throw new Error('Hay dos motorizados con el mismo celular.');
    seen.add(phone);
    return { id: cleanId(String(raw.id || '')) || 'mot_' + crypto.randomBytes(4).toString('hex'), name, phone, active: raw.active !== false };
  });
}

const money = n => `S/ ${(Number(n) || 0).toFixed(2)}`;
const isDigital = order => /yape|plin|transfer/i.test(order.payMethod || '');

// Lo que se cobra o no, sin datos del cliente: se puede publicar en el grupo
function paymentLine(order) {
  if (isDigital(order)) return order.payVerified ? `Pagado por ${order.payMethod}: no cobrar` : `${order.payMethod} pendiente de verificar`;
  return `Cobrar ${money(order.total)} (${order.payMethod || 'Efectivo'})`;
}

// Mensaje para el grupo: solo código, productos y cobro (RNF-03)
function offerPayload(order, { takeUrl, statusUrl, config }) {
  return {
    event: 'dispatch.offered',
    orderId: order.id,
    itemsCount: (order.items || []).reduce((sum, item) => sum + (Number(item.qty) || 1), 0),
    payment: paymentLine(order),
    scheduledFor: order.scheduledFor || null,
    takeUrl,
    statusUrl,
    alertAfterMinutes: alertMinutes(config),
    operatorPhone: String(config.operatorPhone || config.whatsappInternational || '').replace(/\D/g, ''),
    text: `🛵 Pedido ${order.id} listo para despacho (${paymentLine(order)}). ¿Quién lo toma? ${takeUrl}`,
  };
}

// Comanda completa: solo para el motorizado asignado (mensaje privado)
function assignedPayload(order, driver) {
  const lines = (order.items || []).map(i => `• ${i.qty}x ${i.name}${i.sauces ? ` (${i.sauces})` : ''}`).join('\n');
  return {
    event: 'dispatch.assigned',
    orderId: order.id,
    driver: { id: driver.id, name: driver.name, phone: '51' + driver.phone },
    customer: { name: order.customer, phone: order.phone },
    address: order.address,
    reference: order.reference || '',
    gps: order.gps || '',
    payment: paymentLine(order),
    total: order.total,
    text: [
      `🛵 RETEQUEÑOS — COMANDA ${order.id}`,
      lines,
      order.notes ? `Nota: ${order.notes}` : '',
      `Cliente: ${order.customer} · ${order.phone}`,
      `Dirección: ${order.address}${order.reference ? ` (${order.reference})` : ''}`,
      order.gps ? `Ubicación: ${order.gps}` : '',
      `Cobro: ${paymentLine(order)}`,
    ].filter(Boolean).join('\n'),
  };
}

function createDispatcher({ repos, logger = console, env = process.env, fetchImpl = globalThis.fetch, timeoutMs = 8000 }) {
  const webhook = env.RTQ_N8N_WEBHOOK_URL || '';
  const token = env.RTQ_N8N_TOKEN || '';
  const publicUrl = String(env.RTQ_PUBLIC_URL || '').replace(/\/$/, '');

  async function send(payload) {
    if (!webhook) throw new Error('n8n no está configurado (RTQ_N8N_WEBHOOK_URL).');
    let response;
    try {
      response = await fetchImpl(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-rtq-token': token },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new Error('n8n no respondió.');
    }
    if (!response.ok) throw new Error(`n8n respondió ${response.status}.`);
  }

  async function save(order, dispatch) {
    return (await repos.orders.patch(order.id, { dispatch })) || order;
  }

  // Asigna un motorizado y le manda la comanda completa. `manual`: el personal ya coordinó por su cuenta.
  async function assign(order, driver, { manual = false } = {}) {
    const base = { ...(order.dispatch || {}), driverId: driver.id, driverName: driver.name, assignedAt: new Date().toISOString(), takeTokenHash: null };
    if (manual) return save(order, { ...base, status: 'manual', lastError: null });
    try {
      await send(assignedPayload(order, driver));
      return save(order, { ...base, status: 'assigned', attempts: (base.attempts || 0) + 1, lastError: null });
    } catch (error) {
      logger.warn(`[DESPACHO] ${order.id}: ${error.message}`);
      return save(order, { ...base, status: 'failed', attempts: (base.attempts || 0) + 1, lastError: error.message });
    }
  }

  // Ofrece el pedido al grupo de motorizados; devuelve el pedido con el estado de despacho guardado
  async function offer(order) {
    const config = (await repos.config.get()) || {};
    const takeToken = crypto.randomBytes(16).toString('hex');
    const dispatch = { ...(order.dispatch || {}), takeTokenHash: sha256(takeToken), offeredAt: new Date().toISOString(), driverId: null, driverName: null, assignedAt: null };
    const takeUrl = `${publicUrl}/api/dispatch/take?o=${encodeURIComponent(order.id)}&t=${takeToken}`;
    const statusUrl = `${publicUrl}/api/internal/dispatch/${encodeURIComponent(order.id)}`;
    try {
      await send(offerPayload(order, { takeUrl, statusUrl, config }));
      return save(order, { ...dispatch, status: 'offered', attempts: (dispatch.attempts || 0) + 1, lastError: null });
    } catch (error) {
      logger.warn(`[DESPACHO] ${order.id}: ${error.message}`);
      return save(order, { ...dispatch, status: 'failed', attempts: (dispatch.attempts || 0) + 1, lastError: error.message });
    }
  }

  // Un motorizado toma el pedido desde el enlace del grupo, identificándose con su celular
  async function take(orderId, rawToken, rawPhone) {
    const order = await repos.orders.getById(orderId);
    if (!order || !order.dispatch || !order.dispatch.takeTokenHash) return { ok: false, error: 'Este enlace ya no es válido.' };
    const given = Buffer.from(sha256(rawToken || ''), 'hex');
    const expected = Buffer.from(order.dispatch.takeTokenHash, 'hex');
    if (!crypto.timingSafeEqual(given, expected)) return { ok: false, error: 'Este enlace ya no es válido.' };
    if (order.status !== 'delivery') return { ok: false, error: 'Este pedido ya no está en despacho.' };
    const phone = normalizePeruMobile(rawPhone);
    const driver = activeDrivers(await repos.config.get()).find(d => d.phone === phone);
    if (!driver) return { ok: false, error: 'Ese celular no está registrado como motorizado activo.' };
    // Se invalida el enlace antes de avisar a n8n: si dos motorizados lo toman a la vez, solo uno gana
    const claimed = await save(order, { ...order.dispatch, takeTokenHash: null });
    const updated = await assign(claimed, driver);
    return { ok: true, order: updated, driver };
  }

  function isServiceRequest(req) {
    const given = String(req.headers['x-rtq-token'] || '');
    return Boolean(token) && given.length === token.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(token));
  }

  return { offer, assign, take, isServiceRequest, configured: Boolean(webhook) };
}

module.exports = { createDispatcher, normalizeDrivers, activeDrivers, alertMinutes, offerPayload, assignedPayload, DEFAULT_ALERT_MINUTES };
