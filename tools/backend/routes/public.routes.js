/**
 * Rutas públicas de la tienda.
 * - POST /api/public/quote: cotiza el carrito con precios del servidor.
 * - POST /api/public/orders: crea el pedido web en `pending_confirmation` con un código RTQ-…;
 *   caja lo confirma cuando llega el WhatsApp con ese código. Exige `Idempotency-Key`.
 */
const crypto = require('crypto');
const { readJsonBody, sendJson } = require('../http');
const { quoteCart, QuoteError } = require('../pricing');
const { sanitizeString } = require('../sanitize');
const { IdempotencyConflict } = require('../idempotency');
const { newOrderId } = require('./orders.routes');

const PAY_METHODS = ['Efectivo', 'Yape', 'Plin', 'Transferencia'];

class TooManyOrders extends Error {}

async function loadPricingData(repos) {
  const [products, config] = await Promise.all([repos.catalog.getAll(), repos.config.get()]);
  return { products, coupons: (config && config.coupons) || [], config: config || {} };
}

// Celular peruano: 9 dígitos que empiezan en 9, con o sin el 51 delante
function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  const local = digits.length === 11 && digits.startsWith('51') ? digits.slice(2) : digits;
  return /^9\d{8}$/.test(local) ? local : null;
}

function readCustomer(body) {
  const customer = body && typeof body.customer === 'object' && body.customer ? body.customer : {};
  const name = sanitizeString(String(customer.name || '')).slice(0, 60);
  if (name.length < 2) throw new QuoteError('Escribe tu nombre.');
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
    payMethod: PAY_METHODS.includes(body.payMethod) ? body.payMethod : 'Por coordinar',
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
    notes,
    createdAt: new Date().toISOString(),
    createdBy: null,
    items: quote.items.map(line => ({ productId: line.productId, name: line.name, qty: line.qty, price: line.unitPrice, sauces: line.summary })),
    subtotal: quote.subtotal,
    discount: quote.discount,
    deliveryFee: 0,
    total: quote.total,
  });
  logger.log(`[PEDIDO WEB] ${order.id} - Total: S/ ${order.total.toFixed(2)} - por confirmar`);

  const whatsappText = `Hola, quiero confirmar mi pedido ${order.id} (total S/ ${order.total.toFixed(2)}).`;
  const number = String(pricing.config.whatsappInternational || '').replace(/\D/g, '');
  return {
    status: 201,
    body: {
      ok: true,
      code: order.id,
      status: order.status,
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

    const fingerprint = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
    const result = await deps.idempotency.run(key, fingerprint, () => createWebOrder(body, deps));
    return sendJson(res, result.status, result.body);
  } catch (error) {
    if (error instanceof QuoteError) return sendJson(res, 400, { error: error.message });
    if (error instanceof IdempotencyConflict) return sendJson(res, 409, { error: error.message });
    if (error instanceof TooManyOrders) return sendJson(res, 429, { error: error.message });
    throw error;
  }
}

module.exports = { handlePublic, loadPricingData, normalizePhone };
