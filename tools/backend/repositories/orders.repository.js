/**
 * Persistencia de pedidos en un archivo JSON con escritura por archivo temporal + rename.
 * Si el archivo no existe se crea con pedidos de demostración; si existe pero no se puede
 * leer, el arranque se detiene sin modificarlo.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { cleanId, sanitizeId, sanitizeString, sanitizeUrl } = require('../sanitize');
const { readJsonFile } = require('./json-file');
const { ORDER_STATUSES } = require('../order-status');

// Semilla inicial de pedidos si la base de datos no existe
const SEED_ORDERS = [
  {
    id: 'RTQ-2064',
    customer: 'Milton Flores',
    phone: '+51 952 000 111',
    channel: 'app',
    payMethod: 'Pago confirmado',
    payVerified: true,
    mode: 'pickup',
    status: 'new',
    priority: false,
    time: 'Recién recibido',
    elapsedMinutes: 0,
    address: 'Calle Alto Lima 1488',
    reference: 'Recojo en tienda',
    items: [
      { name: 'Tequeños de queso (Mayonesa de ajo)', qty: 1, price: 16.00, sauces: 'Mayonesa de ajo' },
      { name: 'Promo Duo (Queso + Mayopalta)', qty: 1, price: 35.90, sauces: 'Mayopalta' }
    ],
    subtotal: 51.90,
    deliveryFee: 0,
    discount: 0,
    total: 51.90,
    notes: 'Por favor servilletas adicionales.'
  },
  {
    id: 'RTQ-2181',
    customer: 'Paola Vizcarra',
    phone: '+51 952 223 344',
    channel: 'app',
    payMethod: 'Yape verificado',
    payVerified: true,
    mode: 'delivery',
    status: 'kitchen',
    priority: true,
    time: 'En cocina hace 6 min',
    elapsedMinutes: 6,
    address: 'Urb. Vigil Mz B Lte 12',
    reference: 'Frente al parque infantil',
    items: [
      { name: 'Pizza Familiar Americana', qty: 1, price: 34.90, sauces: 'Orégano extra' },
      { name: 'Inka Cola 1.5L', qty: 1, price: 8.50 }
    ],
    subtotal: 43.40,
    deliveryFee: 5.00,
    discount: 0,
    total: 48.40,
    notes: 'Tocar timbre blanco.'
  },
  {
    id: 'RTQ-2052',
    customer: 'Alejandro Vargas',
    phone: '+51 952 112 433',
    channel: 'whatsapp',
    payMethod: 'Por verificar',
    payVerified: false,
    mode: 'delivery',
    status: 'new',
    priority: false,
    time: 'Recién recibido',
    elapsedMinutes: 1,
    address: 'Av. Bolognesi 450 Dpto 302',
    reference: 'Edificio Los Pinos',
    items: [
      { name: 'Promo Tequepizza', qty: 1, price: 38.90, sauces: 'Tártara' }
    ],
    subtotal: 38.90,
    deliveryFee: 6.00,
    discount: 0,
    total: 44.90,
    notes: 'Enviar comprobante antes de mandar motorizado.'
  }
];

class OrderRepository {
  constructor(filePath, logger = console) {
    this.filePath = filePath;
    this.logger = logger;
    this.orders = [];
    this.init();
  }

  init() {
    const dataDir = path.dirname(this.filePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Si el archivo existe pero no se puede usar, readJsonFile detiene el arranque sin modificarlo
    if (fs.existsSync(this.filePath)) {
      this.orders = readJsonFile(this.filePath, { isValid: Array.isArray, expected: 'una lista de pedidos' });
      this.logger.log(`[DB] Base de datos cargada: ${this.orders.length} pedidos persistidos.`);
      return;
    }

    // Solo una instalación nueva, sin archivo de pedidos, se inicializa con datos de demostración
    this.orders = [...SEED_ORDERS];
    this.saveSync();
    this.logger.log(`[DB] Base de datos inicializada con ${this.orders.length} pedidos de demostración.`);
  }

  saveSync() {
    const tmpPath = `${this.filePath}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    const jsonStr = JSON.stringify(this.orders, null, 2);
    fs.writeFileSync(tmpPath, jsonStr, 'utf8');
    fs.renameSync(tmpPath, this.filePath); // Operación atómica en POSIX y Windows NTFS
  }

  getAll() {
    return [...this.orders];
  }

  getById(id) {
    return this.orders.find(o => o.id === id);
  }

  insert(order) {
    const sanitized = normalizeOrder(order);

    // Un pedido existente nunca se reemplaza al insertar; los cambios van por updateStatus/verifyPayment
    if (this.orders.some(o => o.id === sanitized.id)) {
      throw new Error('El pedido ya existe.');
    }
    this.orders.unshift(sanitized);

    this.saveSync();
    return sanitized;
  }

  updateStatus(id, newStatus) {
    const order = this.orders.find(o => o.id === id);
    if (!order) return null;

    if (ORDER_STATUSES.includes(newStatus)) {
      order.status = newStatus;
      // Hora de cada cambio: el KDS calcula el tiempo transcurrido y el cliente ve su avance
      order.statusAt = { ...(order.statusAt || {}), [newStatus]: new Date().toISOString() };
      if (newStatus === 'cancelled') {
        order.time = 'Cancelado';
      } else if (newStatus === 'kitchen') {
        order.time = 'En cocina hace 1 min';
        order.elapsedMinutes = 1;
      } else if (newStatus === 'delivery') {
        order.time = 'Salió hace 1 min';
        order.elapsedMinutes = 1;
      } else if (newStatus === 'delivered') {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        order.time = `Entregado a las ${hh}:${mm}`;
      }
      this.saveSync();
      return order;
    }
    return null;
  }

  verifyPayment(id) {
    const order = this.orders.find(o => o.id === id);
    if (!order) return null;
    order.payVerified = true;
    this.saveSync();
    return order;
  }

  // Cambios parciales que no son de estado: constancia de pago y despacho al motorizado
  patch(id, fields) {
    const order = this.orders.find(o => o.id === id);
    if (!order) return null;
    if ('receipt' in fields) order.receipt = normalizeReceipt(fields.receipt);
    if ('dispatch' in fields) order.dispatch = normalizeDispatch(fields.dispatch);
    this.saveSync();
    return order;
  }
}

const isoOrNull = value => (typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null);

function normalizeReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') return null;
  const type = ['image/jpeg', 'image/png', 'image/webp'].includes(receipt.type) ? receipt.type : null;
  return type ? { type, uploadedAt: isoOrNull(receipt.uploadedAt) || new Date().toISOString() } : null;
}

const DISPATCH_STATUSES = ['offered', 'assigned', 'failed', 'manual'];
function normalizeDispatch(dispatch) {
  if (!dispatch || typeof dispatch !== 'object' || !DISPATCH_STATUSES.includes(dispatch.status)) return null;
  return {
    status: dispatch.status,
    driverId: dispatch.driverId ? cleanId(String(dispatch.driverId)) || null : null,
    driverName: sanitizeString(dispatch.driverName || '').slice(0, 60) || null,
    takeTokenHash: /^[a-f0-9]{64}$/.test(dispatch.takeTokenHash || '') ? dispatch.takeTokenHash : null,
    offeredAt: isoOrNull(dispatch.offeredAt),
    assignedAt: isoOrNull(dispatch.assignedAt),
    attempts: Math.max(0, Math.min(99, parseInt(dispatch.attempts, 10) || 0)),
    lastError: sanitizeString(dispatch.lastError || '').slice(0, 200) || null,
  };
}

// Lo elegido en cada línea, tal como lo cotiza el servidor: sirve para repetir el pedido
function normalizeSpec(spec) {
  if (!spec || typeof spec !== 'object') return null;
  const id = cleanId(spec.productId);
  if (!id) return null;
  const result = { productId: id };
  if (spec.presentationId) result.presentationId = cleanId(String(spec.presentationId));
  if (spec.drinkId) result.drinkId = cleanId(String(spec.drinkId));
  if (spec.extras && typeof spec.extras === 'object') {
    const extras = {};
    for (const [key, count] of Object.entries(spec.extras).slice(0, 12)) {
      const qty = parseInt(count, 10);
      if (cleanId(key) && qty > 0 && qty <= 10) extras[cleanId(key)] = qty;
    }
    if (Object.keys(extras).length) result.extras = extras;
  }
  if (Array.isArray(spec.addons) && spec.addons.length) {
    result.addons = spec.addons.slice(0, 10)
      .map(a => ({ productId: cleanId(a && a.productId), ...(a && a.presentationId ? { presentationId: cleanId(String(a.presentationId)) } : {}), qty: Math.max(1, Math.min(20, parseInt(a && a.qty, 10) || 1)) }))
      .filter(a => a.productId);
  }
  const details = sanitizeString(spec.details || '').slice(0, 300);
  if (details) result.details = details;
  return result;
}

function normalizeOrder(order) {
    // Sanitización y parseo de ítems con precisión monetaria
    const items = Array.isArray(order.items)
      ? order.items.map(it => {
          const qty = Math.max(1, parseInt(it.qty, 10) || 1);
          const price = Math.round((Math.max(0, parseFloat(it.price) || 0) + Number.EPSILON) * 100) / 100;
          const spec = normalizeSpec(it.spec);
          return {
            productId: it.productId ? sanitizeId(it.productId) : null,
            name: sanitizeString(it.name || 'Ítem'),
            qty,
            price,
            sauces: sanitizeString(it.sauces || ''),
            ...(spec ? { spec } : {})
          };
        })
      : [];

    const money = value => Math.round((Math.max(0, parseFloat(value) || 0) + Number.EPSILON) * 100) / 100;
    const deliveryFee = money(order.deliveryFee);

    // El subtotal sale siempre de las líneas y el total se recalcula: nunca se acepta el que envía el cliente
    const subtotal = items.length > 0
      ? Math.round(items.reduce((sum, it) => sum + Math.round(it.price * 100) * it.qty, 0)) / 100
      : money(order.subtotal);
    const discount = Math.min(money(order.discount), subtotal);
    const total = Math.max(0, Math.round((subtotal + deliveryFee - discount) * 100) / 100);

    // Sanitización preventiva profunda de campos de texto
    return {
      id: sanitizeId(order.id),
      customer: sanitizeString(order.customer || 'Cliente'),
      phone: sanitizeString(order.phone || ''),
      channel: ['web', 'app', 'whatsapp', 'caja'].includes(order.channel) ? order.channel : 'app',
      mode: ['delivery', 'pickup'].includes(order.mode) ? order.mode : 'delivery',
      status: ORDER_STATUSES.includes(order.status) ? order.status : 'new',
      priority: Boolean(order.priority),
      payMethod: sanitizeString(order.payMethod || 'Por verificar'),
      payVerified: Boolean(order.payVerified),
      address: sanitizeString(order.address || ''),
      reference: sanitizeString(order.reference || ''),
      gps: sanitizeUrl(order.gps || ''),
      notes: sanitizeString(order.notes || ''),
      time: 'Recién recibido',
      elapsedMinutes: 0,
      createdAt: order.createdAt || new Date().toISOString(),
      createdBy: order.createdBy || null,
      customerId: order.customerId ? cleanId(String(order.customerId)) || null : null,
      scheduledFor: isoOrNull(order.scheduledFor),
      accessTokenHash: /^[a-f0-9]{64}$/.test(order.accessTokenHash || '') ? order.accessTokenHash : null,
      receipt: normalizeReceipt(order.receipt),
      dispatch: normalizeDispatch(order.dispatch),
      statusAt: { [ORDER_STATUSES.includes(order.status) ? order.status : 'new']: isoOrNull(order.createdAt) || new Date().toISOString() },
      items,
      subtotal,
      deliveryFee,
      discount,
      total
    };

}

module.exports = { OrderRepository, SEED_ORDERS, normalizeOrder, normalizeDispatch };
