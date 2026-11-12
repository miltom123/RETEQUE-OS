/**
 * Rutas públicas de la tienda.
 * - POST /api/public/quote: cotiza el carrito con precios del servidor.
 * - POST /api/public/orders: crea el pedido web en `pending_confirmation` con un código RTQ-…;
 *   caja lo confirma cuando llega el WhatsApp con ese código. Exige `Idempotency-Key`.
 */
const crypto = require('crypto');
const { readJsonBody, sendJson } = require('../http');
const { quoteCart, QuoteError } = require('../pricing');
const { sanitizeString, isValidPersonName, normalizePeruMobile } = require('../sanitize');
const { IdempotencyConflict } = require('../idempotency');
const { newOrderId } = require('./orders.routes');
const { extractCustomerToken } = require('../customer-auth');

// Pedido programado (RFI-07): desde 30 minutos hasta 7 días adelante
const SCHEDULE_MIN_MS = 30 * 60 * 1000;
const SCHEDULE_MAX_MS = 7 * 24 * 60 * 60 * 1000;

const PAY_METHODS = ['Efectivo', 'Yape', 'Plin', 'Transferencia'];

class TooManyOrders extends Error {}

async function loadPricingData(repos) {
  const [products, config] = await Promise.all([repos.catalog.getAll(), repos.config.get()]);
  return { products, coupons: (config && config.coupons) || [], config: config || {} };
}

const normalizePhone = normalizePeruMobile;

function readCustomer(body) {
  const customer = body && typeof body.customer === 'object' && body.customer ? body.customer : {};
  const name = String(customer.name || '').trim();
  if (!isValidPersonName(name)) throw new QuoteError('Escribe tu nombre completo, solo con letras.');
  const phone = normalizePhone(customer.phone);
  if (!phone) throw new QuoteError('Escribe un celular válido de 9 dígitos que empiece en 9.');
  const address = sanitizeString(String(body.address || '')).slice(0, 300);
  if (body.mode === 'delivery' && address.length < 5) throw new QuoteError('Escribe la dirección para el delivery.');
  return {
    name,
    phone,
    address: body.mode === 'delivery' ? address : '',
    reference: sanitizeString(String(body.reference || '')).slice(0, 200),
    notes: sanitizeString(String(body.notes || '')).slice(0, 400),
    payMethod: readPayMethod(body.payMethod),
    scheduledFor: readSchedule(body.scheduledFor),
    gps: body.mode === 'delivery' ? readLocation(body.location) : '',
  };
}

// Sin método elegido queda "Por coordinar" (pedido directo de la web de escritorio); uno desconocido se rechaza
function readPayMethod(value) {
  if (value === undefined || value === null || value === '') return 'Por coordinar';
  if (!PAY_METHODS.includes(value)) throw new QuoteError('Elige el método de pago: efectivo, Yape, Plin o transferencia.');
  return value;
}

function readSchedule(value, now = Date.now()) {
  if (value === undefined || value === null || value === '') return null;
  const time = Date.parse(String(value));
  if (!Number.isFinite(time)) throw new QuoteError('La fecha y hora programada no es válida.');
  if (time < now + SCHEDULE_MIN_MS) throw new QuoteError('Programa tu pedido con al menos 30 minutos de anticipación.');
  if (time > now + SCHEDULE_MAX_MS) throw new QuoteError('Solo puedes programar pedidos hasta 7 días antes.');
  return new Date(time).toISOString();
}

// Ubicación elegida en el mapa (RFI-06): se guarda como enlace de Google Maps para el motorizado
function readLocation(location) {
  if (!location || typeof location !== 'object') return '';
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new QuoteError('La ubicación del mapa no es válida.');
  return `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

// Lo elegido por línea, para poder repetir el pedido (RFI-10)
function lineSpec(line) {
  return {
    productId: line.productId,
    ...(line.presentationId ? { presentationId: line.presentationId } : {}),
    ...(line.extras.length ? { extras: Object.fromEntries(line.extras.map(e => [e.id, e.qty])) } : {}),
    ...(line.drink ? { drinkId: line.drink.id } : {}),
    ...(line.addons.length ? { addons: line.addons.map(a => ({ productId: a.productId, ...(a.presentationId ? { presentationId: a.presentationId } : {}), qty: a.qty })) } : {}),
    ...(line.details ? { details: line.details } : {}),
  };
}

async function createWebOrder(body, deps) {
  const { repos, logger } = deps;
  const pricing = await loadPricingData(repos);
  const quote = quoteCart(body, pricing);
  const customer = readCustomer({ ...body, mode: quote.mode });
  // Límite por celular además de por IP, para que nadie llene la lista de pedidos por confirmar.
  // Se cuenta aquí, ya validado: un reintento o un pedido rechazado no gasta el cupo del cliente.
  const byPhone = deps.checkPublicOrderPhoneLimit(customer.phone);
  // Se lanza como error para que la clave de idempotencia no guarde el rechazo y se pueda reintentar luego
  if (!byPhone.allowed) throw new TooManyOrders(byPhone.error);
  const id = await newOrderId(repos.orders);
  // Cliente con sesión: el pedido queda en su historial. Un token inválido no impide pedir como invitado.
  const customerId = deps.customerAuth.verify(deps.customerToken) || null;
  // Token para subir la constancia y seguir el pedido; solo se guarda su hash
  const accessToken = crypto.randomBytes(16).toString('hex');
  const notes = [quote.coupon && quote.coupon.applied ? `Cupón ${quote.coupon.code}` : '', customer.notes].filter(Boolean).join(' · ');

  const order = await repos.orders.insert({
    id,
    customer: customer.name,
    phone: customer.phone,
    channel: 'web',
    mode: quote.mode,
    status: 'pending_confirmation',
    payMethod: customer.payMethod,
    payVerified: false,
    address: customer.address,
    reference: customer.reference,
    gps: customer.gps,
    notes,
    createdAt: new Date().toISOString(),
    createdBy: null,
    customerId,
    scheduledFor: customer.scheduledFor,
    accessTokenHash: crypto.createHash('sha256').update(accessToken).digest('hex'),
    items: quote.items.map(line => ({ productId: line.productId, name: line.name, qty: line.qty, price: line.unitPrice, sauces: line.summary, spec: lineSpec(line) })),
    subtotal: quote.subtotal,
    discount: quote.discount,
    deliveryFee: 0,
    total: quote.total,
  });
  logger.log(`[PEDIDO WEB] ${order.id} - Total: S/ ${order.total.toFixed(2)} - por confirmar`);

  const when = order.scheduledFor
    ? ` para el ${new Date(order.scheduledFor).toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short' })}`
    : '';
  const whatsappText = `Hola, quiero confirmar mi pedido ${order.id}${when} (total S/ ${order.total.toFixed(2)}, pago: ${order.payMethod}).`;
  const number = String(pricing.config.whatsappInternational || '').replace(/\D/g, '');
  return {
    status: 201,
    body: {
      ok: true,
      code: order.id,
      accessToken,
      status: order.status,
      payMethod: order.payMethod,
      scheduledFor: order.scheduledFor,
      items: quote.items.map(({ name, qty, unitPrice, lineTotal, summary }) => ({ name, qty, unitPrice, lineTotal, summary })),
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      coupon: quote.coupon,
      deliveryNote: quote.deliveryNote,
      whatsappText,
      whatsappUrl: number ? `https://wa.me/${number}?text=${encodeURIComponent(whatsappText)}` : null,
    },
  };
}

async function handlePublic({ req, res, pathname }, deps) {
  if (pathname !== '/api/public/quote' && pathname !== '/api/public/orders') return false;
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Método no permitido.' });
  const ip = req.socket.remoteAddress || 'unknown';

  if (pathname === '/api/public/quote') {
    const rate = deps.checkQuoteRateLimit(ip);
    if (!rate.allowed) return sendJson(res, 429, { error: rate.error });
  } else {
    const rate = deps.checkPublicOrderRateLimit(ip);
    if (!rate.allowed) return sendJson(res, 429, { error: rate.error });
  }

  const key = String(req.headers['idempotency-key'] || '').trim();
  if (pathname === '/api/public/orders' && !/^[A-Za-z0-9-]{8,100}$/.test(key)) {
    return sendJson(res, 400, { error: 'No pudimos enviar tu pedido. Recarga la página e inténtalo de nuevo.' });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    return sendJson(res, 400, { error: 'No pudimos leer tu carrito.' });
  }

  try {
    if (pathname === '/api/public/quote') return sendJson(res, 200, quoteCart(body, await loadPricingData(deps.repos)));

    const customerToken = extractCustomerToken(req);
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify(body) + (customerToken || '')).digest('hex');
    const result = await deps.idempotency.run(key, fingerprint, () => createWebOrder(body, { ...deps, customerToken }));
    return sendJson(res, result.status, result.body);
  } catch (error) {
    if (error instanceof QuoteError) return sendJson(res, 400, { error: error.message });
    if (error instanceof IdempotencyConflict) return sendJson(res, 409, { error: error.message });
    if (error instanceof TooManyOrders) return sendJson(res, 429, { error: error.message });
    throw error;
  }
}

module.exports = { handlePublic, loadPricingData, normalizePhone, readSchedule };
