/**
 * Cotización de un carrito con datos del servidor: catálogo, opciones de cada producto y cupones.
 * Los precios que envíe el navegador se ignoran. Todo se calcula en céntimos enteros.
 *
 * Una línea del carrito llega así:
 *   { productId, presentationId?, qty, extras?: { [extraId]: cantidad }, drinkId?,
 *     addons?: [{ productId, presentationId?, qty }], details? }
 * `details` es texto libre para cocina (sabores, cremas incluidas, notas) y no cambia el precio.
 */
const { cleanId, sanitizeString } = require('./sanitize');

// Errores con un mensaje que se puede mostrar al cliente tal cual
class QuoteError extends Error {}

const LIMITS = { lines: 50, qty: 50, extraQty: 10, addons: 10, addonQty: 20, details: 300 };

const toCents = value => Math.round(Number(value) * 100);
const toSoles = cents => cents / 100;

// Solo números enteros de verdad, igual que caja: "2" o 1.5 no se aceptan como cantidad
function wholeNumber(value, min, max, message) {
  if (!Number.isInteger(value) || value < min || value > max) throw new QuoteError(message);
  return value;
}

function findAvailable(catalog, rawId) {
  const product = catalog.get(cleanId(rawId));
  if (!product) throw new QuoteError('Un producto ya no está en la carta. Actualiza la página e inténtalo de nuevo.');
  if (product.stock === false) throw new QuoteError(`"${product.name}" está agotado por ahora.`);
  return product;
}

// Con presentaciones, el nombre del producto trae el tamaño base entre paréntesis: se quita para no repetirlo
function displayName(product, presentation) {
  if (!presentation) return product.name;
  return `${product.name.replace(/\s*\([^)]*\)\s*$/, '')} — ${presentation.label}`;
}

function priceProduct(product, rawPresentationId) {
  const presentations = product.options && product.options.presentations;
  if (!presentations) return { cents: toCents(product.promo != null ? product.promo : product.price), presentation: null };
  const id = rawPresentationId == null ? presentations[0].id : cleanId(rawPresentationId);
  const presentation = presentations.find(p => p.id === id);
  if (!presentation) throw new QuoteError(`Elige un tamaño válido para "${product.name}".`);
  // Sin precio propio, la presentación usa el precio del producto (el que se edita en el panel)
  const price = presentation.price != null ? presentation.price : (product.promo != null ? product.promo : product.price);
  return { cents: toCents(price), presentation };
}

function quoteLine(raw, catalog) {
  if (!raw || typeof raw !== 'object') throw new QuoteError('El carrito tiene un producto inválido.');
  const product = findAvailable(catalog, raw.productId);
  const qty = wholeNumber(raw.qty, 1, LIMITS.qty, `La cantidad de "${product.name}" debe ser de 1 a ${LIMITS.qty}.`);
  const { cents: baseCents, presentation } = priceProduct(product, raw.presentationId);
  const notes = [];
  let unitCents = baseCents;

  const extras = [];
  const allowedExtras = (product.options && product.options.extras) || [];
  for (const [rawId, rawCount] of Object.entries(raw.extras && typeof raw.extras === 'object' ? raw.extras : {})) {
    const extra = allowedExtras.find(e => e.id === cleanId(rawId));
    if (!extra) throw new QuoteError(`Un agregado de "${product.name}" ya no está disponible.`);
    const count = wholeNumber(rawCount, 0, LIMITS.extraQty, `Puedes agregar hasta ${LIMITS.extraQty} de cada extra.`);
    if (!count) continue;
    unitCents += toCents(extra.price) * count;
    extras.push({ id: extra.id, label: extra.label, qty: count, price: extra.price });
    notes.push(`${count} x ${extra.label}`);
  }

  let drink = null;
  const drinks = product.options && product.options.drinks;
  if (drinks) {
    const id = raw.drinkId == null ? drinks[0].id : cleanId(raw.drinkId);
    drink = drinks.find(d => d.id === id);
    if (!drink) throw new QuoteError(`Elige una bebida válida para "${product.name}".`);
    unitCents += toCents(drink.price);
    notes.push(`Bebida: ${drink.label}`);
  }

  const addons = [];
  const rawAddons = Array.isArray(raw.addons) ? raw.addons : [];
  if (rawAddons.length > LIMITS.addons) throw new QuoteError(`Puedes sumar hasta ${LIMITS.addons} agregados por producto.`);
  for (const rawAddon of rawAddons) {
    const addonProduct = findAvailable(catalog, rawAddon && rawAddon.productId);
    const addonQty = wholeNumber(rawAddon.qty, 1, LIMITS.addonQty, `La cantidad de "${addonProduct.name}" debe ser de 1 a ${LIMITS.addonQty}.`);
    const priced = priceProduct(addonProduct, rawAddon.presentationId);
    unitCents += priced.cents * addonQty;
    const name = displayName(addonProduct, priced.presentation);
    addons.push({ productId: addonProduct.id, presentationId: priced.presentation ? priced.presentation.id : null, name, qty: addonQty, price: toSoles(priced.cents) });
    notes.push(`+ ${addonQty} x ${name}`);
  }

  const details = sanitizeString(String(raw.details || '')).slice(0, LIMITS.details);
  if (details) notes.push(details);

  return {
    productId: product.id,
    presentationId: presentation ? presentation.id : null,
    name: displayName(product, presentation),
    qty,
    extras,
    drink: drink ? { id: drink.id, label: drink.label, price: drink.price } : null,
    addons,
    details,
    // Texto para cocina y para el KDS: todo lo elegido en una sola línea
    summary: notes.join(' · '),
    unitPrice: toSoles(unitCents),
    lineTotal: toSoles(unitCents * qty),
    unitCents,
  };
}

// Misma regla que tenía la web: monto fijo (sin pasar del subtotal) o porcentaje, con pedido mínimo
function applyCoupon(rawCode, subtotalCents, coupons) {
  const code = String(rawCode || '').trim().toUpperCase().slice(0, 30);
  if (!code) return null;
  const rule = (Array.isArray(coupons) ? coupons : []).find(c => c && c.active !== false && String(c.code).toUpperCase() === code);
  if (!rule) return { code, applied: false, discount: 0, message: `El cupón "${code}" no es válido o ha expirado.` };
  const minCents = toCents(rule.minOrder || 0);
  if (subtotalCents < minCents) {
    return { code, applied: false, discount: 0, message: `El cupón "${code}" requiere un pedido mínimo de S/ ${toSoles(minCents).toFixed(2)}.` };
  }
  const discountCents = rule.type === 'percent'
    ? Math.round(subtotalCents * Number(rule.value) / 100)
    : Math.min(toCents(rule.value), subtotalCents);
  return { code, applied: true, discount: toSoles(discountCents), discountCents, message: `Cupón "${code}" aplicado: -S/ ${toSoles(discountCents).toFixed(2)}.` };
}

/**
 * @param body { items, mode, couponCode }
 * @param data { products: lista del catálogo, coupons: cupones de la configuración }
 */
function quoteCart(body, { products, coupons }) {
  const items = body && Array.isArray(body.items) ? body.items : null;
  if (!items || !items.length) throw new QuoteError('Tu carrito está vacío.');
  if (items.length > LIMITS.lines) throw new QuoteError(`El pedido admite hasta ${LIMITS.lines} productos distintos.`);
  const mode = body.mode == null ? 'delivery' : body.mode;
  if (!['delivery', 'pickup'].includes(mode)) throw new QuoteError('Elige delivery o recojo en tienda.');

  const catalog = new Map(products.map(p => [p.id, p]));
  const lines = items.map(item => quoteLine(item, catalog));
  const subtotalCents = lines.reduce((sum, line) => sum + line.unitCents * line.qty, 0);
  const coupon = applyCoupon(body.couponCode, subtotalCents, coupons);
  const discountCents = coupon && coupon.applied ? coupon.discountCents : 0;
  if (coupon) delete coupon.discountCents;

  return {
    items: lines.map(({ unitCents, ...line }) => line),
    mode,
    subtotal: toSoles(subtotalCents),
    discount: toSoles(discountCents),
    // El delivery lo coordina y cobra el repartidor; aún no hay tarifas por zona
    deliveryFee: 0,
    deliveryNote: mode === 'delivery' ? 'El costo del delivery se coordina por WhatsApp.' : null,
    total: toSoles(subtotalCents - discountCents),
    coupon,
  };
}

module.exports = { quoteCart, QuoteError, LIMITS };
