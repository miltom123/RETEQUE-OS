/**
 * Persistencia de pedidos en un archivo JSON con escritura por archivo temporal + rename.
 * Comportamiento conservado de tools/server.js: si el archivo no existe o no es legible,
 * se reinicializa con pedidos de demostración (ver riesgos en documentacion/ARQUITECTURA_BACKEND_MODULAR.md).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { sanitizeId, sanitizeString, sanitizeUrl } = require('../sanitize');

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
    try {
      const dataDir = path.dirname(this.filePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.orders = parsed;
          this.logger.log(`[DB] Base de datos cargada: ${this.orders.length} pedidos persistidos.`);
          return;
        }
      }
    } catch (err) {
      this.logger.warn('[DB] Advertencia al leer base de datos existente, reinicializando:', err.message);
    }

    // Inicializar con seed data
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
    // Sanitización y parseo de ítems con precisión monetaria
    const items = Array.isArray(order.items)
      ? order.items.map(it => {
          const qty = Math.max(1, parseInt(it.qty, 10) || 1);
          const price = Math.round((Math.max(0, parseFloat(it.price) || 0) + Number.EPSILON) * 100) / 100;
          return {
            productId: it.productId ? sanitizeId(it.productId) : null,
            name: sanitizeString(it.name || 'Ítem'),
            qty,
            price,
            sauces: sanitizeString(it.sauces || '')
          };
        })
      : [];

    const deliveryFee = Math.round((Math.max(0, parseFloat(order.deliveryFee) || 0) + Number.EPSILON) * 100) / 100;
    const discount = Math.round((Math.max(0, parseFloat(order.discount) || 0) + Number.EPSILON) * 100) / 100;

    // Recalcular subtotal a partir de ítems si existen
    let subtotal = Math.round((Math.max(0, parseFloat(order.subtotal) || 0) + Number.EPSILON) * 100) / 100;
    if (items.length > 0) {
      const computedSubtotal = Math.round((items.reduce((sum, it) => sum + (it.price * it.qty), 0) + Number.EPSILON) * 100) / 100;
      if (Math.abs(computedSubtotal - subtotal) > 0.05 || subtotal === 0) {
        subtotal = computedSubtotal;
      }
    }

    // Recalcular total con integridad financiera
    const computedTotal = Math.max(0, Math.round((subtotal + deliveryFee - discount + Number.EPSILON) * 100) / 100);
    let total = Math.round((Math.max(0, parseFloat(order.total) || 0) + Number.EPSILON) * 100) / 100;
    if (Math.abs(computedTotal - total) > 0.05 || total === 0) {
      total = computedTotal;
    }

    // Sanitización preventiva profunda de campos de texto
    const sanitized = {
      id: sanitizeId(order.id),
      customer: sanitizeString(order.customer || 'Cliente'),
      phone: sanitizeString(order.phone || ''),
      channel: ['web', 'app', 'whatsapp', 'caja'].includes(order.channel) ? order.channel : 'app',
      mode: ['delivery', 'pickup'].includes(order.mode) ? order.mode : 'delivery',
      status: ['new', 'kitchen', 'delivery', 'delivered'].includes(order.status) ? order.status : 'new',
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
      items,
      subtotal,
      deliveryFee,
      discount,
      total
    };

    // Si ya existe por ID, se ignora o actualiza para evitar duplicados
    const existingIdx = this.orders.findIndex(o => o.id === sanitized.id);
    if (existingIdx >= 0) {
      this.orders[existingIdx] = sanitized;
    } else {
      this.orders.unshift(sanitized);
    }

    this.saveSync();
    return sanitized;
  }

  updateStatus(id, newStatus) {
    const order = this.orders.find(o => o.id === id);
    if (!order) return null;

    if (['new', 'kitchen', 'delivery', 'delivered'].includes(newStatus)) {
      order.status = newStatus;
      if (newStatus === 'kitchen') {
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
}

module.exports = { OrderRepository, SEED_ORDERS };
