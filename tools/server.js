/**
 * RETEQUEÑOS OS - Servidor de Producción Local & API REST Segura
 * Reemplaza de forma definitiva el antiguo backend en PowerShell (serve-app.ps1).
 *
 * Características:
 * - Cero dependencias externas (utiliza módulos nativos de Node.js).
 * - Persistencia transaccional ACID en disco (data/orders.db.json con escritura atómica).
 * - Autenticación por PIN para el Hub Operativo / Monitor KDS.
 * - Prevención de XSS y validación estricta de esquemas en endpoints REST.
 * - Protección contra Path Traversal y mitigación de CORS inseguro.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { UsersRepository, publicUser } = require('./users.repository');
const { buildReport, exportReport } = require('./reports');

// Configuración de rutas y puertos
const ROOT_DIR = path.resolve(__dirname, '..');
const APP_DIR = path.join(ROOT_DIR, 'app');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DB_FILE = path.join(DATA_DIR, 'orders.db.json');
const usersRepo = new UsersRepository(DATA_DIR);

// Parseo de argumentos de línea de comandos
const args = process.argv.slice(2);
let PORT = 3000;
let BIND_ALL = false;
let ADMIN_PIN = process.env.RTQ_ADMIN_PIN || '2026';
let legacyPinEnabled = Boolean(process.env.RTQ_ADMIN_PIN);

for (let i = 0; i < args.length; i++) {
  if (args[i] === '-p' || args[i] === '--port') {
    PORT = parseInt(args[++i], 10) || 3000;
  } else if (args[i] === '-Lan' || args[i] === '--lan') {
    BIND_ALL = true;
  } else if (args[i] === '--pin') {
    legacyPinEnabled = true;
    ADMIN_PIN = args[++i] || '2026';
  }
}

// MIME Types soportados
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=UTF-8'
};

// Sesiones activas de administrador (en memoria, expiración de 24 horas)
const activeSessions = new Map(); // token -> { createdAt, expiresAt }
const loginAttempts = new Map(); // ip -> { count, lockedUntil }
const orderRateLimits = new Map(); // ip -> { count, resetAt }

function checkRateLimit(ip) {
  const now = Date.now();
  const rec = loginAttempts.get(ip);
  if (!rec) return { allowed: true };
  if (rec.lockedUntil && now < rec.lockedUntil) {
    const remainingSecs = Math.ceil((rec.lockedUntil - now) / 1000);
    return { allowed: false, error: `Demasiados intentos fallidos. Bloqueado temporalmente (${remainingSecs}s restantes).` };
  }
  if (rec.lockedUntil && now >= rec.lockedUntil) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }
  return { allowed: true };
}

function checkOrderRateLimit(ip) {
  const now = Date.now();
  const rec = orderRateLimits.get(ip);
  if (!rec || now > rec.resetAt) {
    orderRateLimits.set(ip, { count: 1, resetAt: now + 60 * 1000 });
    return { allowed: true };
  }
  rec.count++;
  if (rec.count > 30) {
    return { allowed: false, error: 'Límite de creación de pedidos excedido (máx 30/min). Por favor espere un momento.' };
  }
  return { allowed: true };
}

function recordLoginAttempt(ip, success) {
  if (success) {
    loginAttempts.delete(ip);
    return;
  }
  const now = Date.now();
  const rec = loginAttempts.get(ip) || { count: 0, lockedUntil: null };
  rec.count++;
  if (rec.count >= 5) {
    rec.lockedUntil = now + 15 * 60 * 1000; // 15 minutos
  }
  loginAttempts.set(ip, rec);
}

function timingSafeEqualStrings(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function createAdminSession(user = { username: 'administrador', role: 'admin', name: 'Administrador' }) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + 24 * 60 * 60 * 1000; // 24 horas
  activeSessions.set(token, { createdAt: now, expiresAt, user });
  return { token, expiresAt };
}

function isValidAdminSession(token) {
  if (!token) return false;
  const session = activeSessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return false;
  }
  const user = usersRepo.find(session.user.username);
  if (!user || !user.active) { activeSessions.delete(token); return false; }
  session.user = publicUser(user);
  return true;
}

function peruDay(value = Date.now()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-');
}
function canAccessOrder(user, order) {
  return user.role === 'admin' || Boolean(order.createdAt && peruDay(order.createdAt) === peruDay());
}

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

// Capa de Persistencia Transaccional (Atomic File I/O)
class OrderRepository {
  constructor(filePath) {
    this.filePath = filePath;
    this.orders = [];
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.orders = parsed;
          console.log(`[DB] Base de datos cargada: ${this.orders.length} pedidos persistidos.`);
          return;
        }
      }
    } catch (err) {
      console.warn('[DB] Advertencia al leer base de datos existente, reinicializando:', err.message);
    }

    // Inicializar con seed data
    this.orders = [...SEED_ORDERS];
    this.saveSync();
    console.log(`[DB] Base de datos inicializada con ${this.orders.length} pedidos de demostración.`);
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

// --------------------------------------------------------------------------
// Fuente Única de Verdad: Repositorio de Configuración del Negocio
// --------------------------------------------------------------------------
const CONFIG_FILE = path.join(DATA_DIR, 'store.config.json');

class ConfigRepository {
  constructor(filePath) {
    this.filePath = filePath;
    this.config = {};
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(this.filePath)) {
        this.config = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      }
    } catch (e) {
      console.warn('[Config] Error al leer store.config.json:', e.message);
    }
  }

  get() {
    return { ...this.config };
  }

  update(patch) {
    this.config = { ...this.config, ...patch };
    const tmp = `${this.filePath}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.config, null, 2), 'utf8');
    fs.renameSync(tmp, this.filePath);
    return this.config;
  }
}

// --------------------------------------------------------------------------
// Fuente Única de Verdad: Repositorio de Catálogo Maestro de Productos
// --------------------------------------------------------------------------
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.db.json');

class CatalogRepository {
  constructor(filePath) {
    this.filePath = filePath;
    this.products = [];
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(this.filePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        if (Array.isArray(parsed)) {
          this.products = parsed;
          console.log(`[Catalog] Catálogo cargado: ${this.products.length} productos.`);
          return;
        }
      }
    } catch (e) {
      console.warn('[Catalog] Error al leer catalog.db.json:', e.message);
    }
  }

  saveSync() {
    const tmp = `${this.filePath}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.products, null, 2), 'utf8');
    fs.renameSync(tmp, this.filePath);
  }

  getAll() {
    return [...this.products];
  }

  getById(id) {
    return this.products.find(p => p.id === id);
  }

  save(product) {
    const sanitized = {
      id: sanitizeId(product.id || `prod_${Date.now()}`),
      name: sanitizeString(product.name || 'Producto'),
      icon: product.icon || '🥟',
      cat: sanitizeString(product.cat || 'Clásicos'),
      qty: sanitizeString(product.qty || 'Porción estándar'),
      price: Math.max(0, parseFloat(product.price) || 0),
      promo: product.promo ? Math.max(0, parseFloat(product.promo) || 0) : null,
      sauces: sanitizeString(product.sauces || '2 salsas gratis'),
      badge: sanitizeString(product.badge || ''),
      desc: sanitizeString(product.desc || ''),
      stock: product.stock !== undefined ? Boolean(product.stock) : true
    };

    const idx = this.products.findIndex(p => p.id === sanitized.id);
    if (idx >= 0) {
      this.products[idx] = sanitized;
    } else {
      this.products.unshift(sanitized);
    }
    this.saveSync();
    return sanitized;
  }

  toggleStock(id, stock) {
    const p = this.products.find(prod => prod.id === id);
    if (!p) return null;
    p.stock = Boolean(stock);
    this.saveSync();
    return p;
  }

  delete(id) {
    const idx = this.products.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.products.splice(idx, 1);
    this.saveSync();
    return true;
  }
}

const configRepo = new ConfigRepository(CONFIG_FILE);
const catalogRepo = new CatalogRepository(CATALOG_FILE);


// Funciones de Sanitización
function sanitizeId(id) {
  if (typeof id !== 'string') return `RTQ-${Math.floor(2000 + Math.random() * 8000)}`;
  const cleaned = id.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  return cleaned || `RTQ-${Math.floor(2000 + Math.random() * 8000)}`;
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/[<>]/g, '') // Elimina etiquetas potencialmente maliciosas
    .slice(0, 500); // Límite de longitud preventiva
}

function sanitizeUrl(url) {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('https://maps.google.com/') || trimmed.startsWith('https://www.google.com/maps/')) {
    return trimmed;
  }
  return '';
}

const repo = new OrderRepository(DB_FILE);

// Detección de IP local para conexión celular
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

// Extracción de Token de Autorización
function extractToken(req) {
  // 1. Cabecera Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  // 2. Cabecera personalizada x-admin-token
  if (req.headers['x-admin-token']) {
    return String(req.headers['x-admin-token']).trim();
  }
  // 3. Cookie rtq_admin_token
  const cookieHeader = req.headers['cookie'];
  if (cookieHeader) {
    const match = cookieHeader.match(/rtq_admin_token=([a-f0-9]+)/);
    if (match) return match[1];
  }
  return null;
}

// Validación de Origen CORS Seguro
function handleCors(req, res) {
  const origin = req.headers['origin'];
  if (!origin) {
    // Petición interna o de la misma máquina
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    // Permitir orígenes seguros de desarrollo y LAN
    const isAllowed = 
      /^http:\/\/localhost(:[0-9]+)?$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1(:[0-9]+)?$/.test(origin) ||
      /^http:\/\/192\.168\.[0-9]+\.[0-9]+(:[0-9]+)?$/.test(origin) ||
      /^http:\/\/10\.[0-9]+\.[0-9]+\.[0-9]+(:[0-9]+)?$/.test(origin);

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token');
}

// Lector seguro de body JSON con límite de tamaño (DoS protection)
function readJsonBody(req, limitBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    let data = '';

    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > limitBytes) {
        req.destroy();
        reject(new Error('Payload Too Large'));
        return;
      }
      data += chunk;
    });

    req.on('end', () => {
      if (!data) return resolve({});
      try {
        const json = JSON.parse(data);
        resolve(json);
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });

    req.on('error', err => reject(err));
  });
}

// Respuestas JSON estandarizadas
function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN'
  });
  res.end(body);
}

// Servidor HTTP Principal
const server = http.createServer(async (req, res) => {
  handleCors(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  const currentToken = extractToken(req);
  const currentUser = isValidAdminSession(currentToken) ? activeSessions.get(currentToken).user : null;
  const adminOnly = pathname.startsWith('/api/users') || pathname.startsWith('/api/reports') ||
    (pathname.startsWith('/api/catalog') && req.method !== 'GET') ||
    (pathname === '/api/config' && req.method !== 'GET');
  if (adminOnly && !currentUser) return sendJson(res, 401, { error: 'Inicia sesión.' });
  if (adminOnly && currentUser.role !== 'admin') return sendJson(res, 403, { error: 'Esta acción es exclusiva del administrador.' });

  if (pathname === '/api/reports' || pathname === '/api/reports/export') {
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'Método no permitido.' });
    try {
      const report = buildReport(repo.getAll(), catalogRepo.getAll(), parsedUrl.searchParams);
      if (pathname === '/api/reports') return sendJson(res, 200, report);
      const type = parsedUrl.searchParams.get('type') || 'details';
      const content = exportReport(report, type);
      res.writeHead(200, {
        'Content-Type': type === 'json' ? 'application/json; charset=utf-8' : 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="retequenos-${type}-${peruDay()}.${type === 'json' ? 'json' : 'csv'}"`,
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'
      });
      return res.end(content);
    } catch (error) { return sendJson(res, 400, { error: error.message }); }
  }
  if (pathname === '/api/users') {
    if (req.method === 'GET') return sendJson(res, 200, usersRepo.list());
    if (req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        if (body.role && body.role !== 'cashier') return sendJson(res, 400, { error: 'Solo puedes crear usuarios de caja.' });
        return sendJson(res, 201, { ok: true, user: usersRepo.add(body.username, body.name, body.password) });
      } catch (error) { return sendJson(res, 400, { error: error.message }); }
    }
    return sendJson(res, 405, { error: 'Método no permitido.' });
  }
  if (pathname.startsWith('/api/users/') && req.method === 'PATCH') {
    try {
      const username = pathname.slice('/api/users/'.length);
      const body = await readJsonBody(req);
      const user = usersRepo.setActive(username, body.active);
      if (!user.active) for (const [token, session] of activeSessions) { if (session.user.username === user.username) activeSessions.delete(token); }
      return sendJson(res, 200, { ok: true, user });
    } catch (error) { return sendJson(res, 400, { error: error.message }); }
  }
  if (pathname === '/api/caja/pedidos' && req.method === 'POST') {
    if (!currentUser) return sendJson(res, 401, { error: 'Inicia sesión para registrar pedidos.' });
    try {
      const body = await readJsonBody(req);
      if (typeof body.customer !== 'string' || !body.customer.trim() || body.customer.length > 100) throw new Error('Ingresa el nombre del cliente.');
      if (!['pickup', 'delivery'].includes(body.mode)) throw new Error('Modalidad inválida.');
      if (!['Efectivo', 'Yape', 'Plin', 'Transferencia'].includes(body.payMethod)) throw new Error('Selecciona el medio de pago.');
      if (!Array.isArray(body.items) || !body.items.length || body.items.length > 50) throw new Error('Agrega entre 1 y 50 productos.');
      const catalog = catalogRepo.getAll();
      const items = body.items.map(item => {
        const product = catalog.find(product => product.id === item.productId);
        if (!product || product.stock === false) throw new Error('Un producto ya no está disponible. Actualiza la carta.');
        if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99) throw new Error('La cantidad debe ser de 1 a 99.');
        return { productId: product.id, name: product.name, qty: item.qty, price: product.promo != null ? Number(product.promo) : Number(product.price), sauces: String(item.sauces || '').slice(0, 200) };
      });
      const fee = body.mode === 'pickup' ? 0 : Number(body.deliveryFee);
      if (!Number.isFinite(fee) || fee < 0 || fee > 100) throw new Error('El costo de delivery debe estar entre 0 y 100 soles.');
      if (body.mode === 'delivery' && (typeof body.address !== 'string' || !body.address.trim())) throw new Error('Ingresa la dirección del delivery.');
      const subtotal = items.reduce((sum, item) => sum + Math.round(item.price * 100) * item.qty, 0) / 100;
      const order = repo.insert({ id: 'RTQ-' + crypto.randomBytes(6).toString('hex').toUpperCase(), customer: body.customer,
        phone: String(body.phone || '').slice(0, 30), items, mode: body.mode, deliveryFee: fee, subtotal, total: subtotal + fee,
        discount: 0, status: 'new', payMethod: body.payMethod, payVerified: body.payVerified === true,
        address: String(body.address || '').slice(0, 300), notes: String(body.notes || '').slice(0, 500), createdAt: new Date().toISOString(),
        createdBy: currentUser.username, channel: 'caja' });
      return sendJson(res, 201, { ok: true, order });
    } catch (error) { return sendJson(res, 400, { error: error.message }); }
  }

  // --------------------------------------------------------------------------
  // API: Autenticación Admin
  // --------------------------------------------------------------------------
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    try {
      const clientIp = req.socket.remoteAddress || 'unknown';
      const limit = checkRateLimit(clientIp);
      if (!limit.allowed) {
        return sendJson(res, 429, { ok: false, error: limit.error });
      }

      const body = await readJsonBody(req);
      const inputPin = String(body.pin || '').trim();
      const user = usersRepo.authenticate(body.username, body.password);
      const validCredentials = Boolean(user);

      if (validCredentials || (legacyPinEnabled && !body.username && timingSafeEqualStrings(inputPin, ADMIN_PIN))) {
        recordLoginAttempt(clientIp, true);
        const session = createAdminSession(user || undefined);
        res.setHeader('Set-Cookie', `rtq_admin_token=${session.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
        return sendJson(res, 200, {
          ok: true,
          message: 'Autenticación exitosa',
          token: session.token,
          expiresAt: session.expiresAt,
          user: activeSessions.get(session.token).user
        });
      } else {
        recordLoginAttempt(clientIp, false);
        return sendJson(res, 401, { ok: false, error: 'Usuario o contraseña incorrectos' });
      }
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: e.message });
    }
  }

  if (pathname === '/api/auth/verify' && req.method === 'GET') {
    const token = extractToken(req);
    const isValid = isValidAdminSession(token);
    return sendJson(res, 200, { authenticated: isValid, user: isValid ? activeSessions.get(token).user : null });
  }

  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    const token = extractToken(req);
    if (token) activeSessions.delete(token);
    res.setHeader('Set-Cookie', 'rtq_admin_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    return sendJson(res, 200, { ok: true });
  }

  // --------------------------------------------------------------------------
  // API: Pedidos (RESTful)
  // --------------------------------------------------------------------------
  if (pathname === '/api/pedidos') {
    // GET: Obtener todos los pedidos (Exclusivo Administrador autenticado para evitar fuga de PII)
    if (req.method === 'GET') {
      const token = extractToken(req);
      const isAuth = isValidAdminSession(token);

      if (!isAuth) {
        return sendJson(res, 401, {
          ok: false,
          error: 'Requiere autenticación de administrador para acceder a las comandas'
        });
      }

      const user = activeSessions.get(token).user;
      if (user.role !== 'admin' && parsedUrl.searchParams.get('scope') === 'all') return sendJson(res, 403, { error: 'Solo el administrador puede consultar el historial completo.' });
      const orders = repo.getAll().filter(order => canAccessOrder(user, order));
      return sendJson(res, 200, orders);
    }

    // POST: Crear nuevo pedido (Público desde Web y App con validación y límite de tasa)
    if (req.method === 'POST') {
      try {
        const clientIp = req.socket.remoteAddress || 'unknown';
        const rate = checkOrderRateLimit(clientIp);
        if (!rate.allowed) {
          return sendJson(res, 429, { ok: false, error: rate.error });
        }

        const payload = await readJsonBody(req);
        if (!payload || typeof payload !== 'object') {
          return sendJson(res, 400, { ok: false, error: 'Cuerpo de pedido inválido' });
        }

        if (currentUser && currentUser.role === 'cashier') return sendJson(res, 403, { error: 'Registra pedidos de caja desde /api/caja/pedidos.' });
        if (repo.getById(sanitizeId(payload.id))) return sendJson(res, 409, { error: 'El pedido ya existe.' });
        payload.createdAt = new Date().toISOString();
        payload.createdBy = null;
        const newOrder = repo.insert(payload);
        console.log(`[PEDIDO CREADO] ${newOrder.id} - ${newOrder.customer} - Total: S/ ${newOrder.total.toFixed(2)} (${newOrder.channel})`);
        return sendJson(res, 201, { ok: true, order: newOrder });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }
  }

  // GET /api/pedidos/:id (Consulta pública y segura de estado individual sin exponer PII completa)
  if (pathname.startsWith('/api/pedidos/') && req.method === 'GET') {
    const orderId = sanitizeId(pathname.split('/')[3] || '');
    const ord = repo.getById(orderId);
    if (!ord) {
      return sendJson(res, 404, { ok: false, error: 'Pedido no encontrado' });
    }
    const token = extractToken(req);
    const isAuth = isValidAdminSession(token);
    if (!isAuth) {
      return sendJson(res, 200, {
        id: ord.id,
        status: ord.status,
        mode: ord.mode,
        time: ord.time,
        elapsedMinutes: ord.elapsedMinutes,
        channel: ord.channel,
        total: ord.total,
        payMethod: ord.payMethod,
        payVerified: ord.payVerified,
        createdAt: ord.createdAt
      });
    }
    if (!canAccessOrder(activeSessions.get(token).user, ord)) return sendJson(res, 403, { error: 'Caja solo puede consultar pedidos del día.' });
    return sendJson(res, 200, ord);
  }

  // PATCH /api/pedidos/:id (Actualizar estado o verificar pago - Requiere sesión de Administrador)
  if (pathname.startsWith('/api/pedidos/') && (req.method === 'PATCH' || req.method === 'POST')) {
    const token = extractToken(req);
    if (!isValidAdminSession(token)) {
      return sendJson(res, 401, { ok: false, error: 'Requiere autenticación de administrador' });
    }

    const orderId = sanitizeId(pathname.split('/')[3] || '');
    if (!orderId) {
      return sendJson(res, 400, { ok: false, error: 'ID de pedido no especificado' });
    }

    const order = repo.getById(orderId);
    if (order && !canAccessOrder(activeSessions.get(token).user, order)) return sendJson(res, 403, { error: 'Caja solo puede gestionar pedidos del día.' });
    try {
      const body = await readJsonBody(req);
      if (body.status) {
        if (order && body.status === 'kitchen' && /yape|plin|transfer/i.test(order.payMethod || '') && !order.payVerified) return sendJson(res, 400, { error: 'Verifica el pago antes de mandar a cocina.' });
        if (currentUser.role === 'cashier' && order) {
          const next = { new: ['kitchen'], kitchen: order.mode === 'pickup' ? ['delivered'] : ['delivery'], delivery: ['delivered'], delivered: [] };
          if (!next[order.status]?.includes(body.status)) return sendJson(res, 400, { error: 'Ese cambio de estado no está permitido para caja.' });
        }
        const updated = repo.updateStatus(orderId, body.status);
        if (updated) {
          return sendJson(res, 200, { ok: true, order: updated });
        }
        return sendJson(res, 404, { ok: false, error: 'Pedido no encontrado' });
      }

      if (body.verifyPayment) {
        const updated = repo.verifyPayment(orderId);
        if (updated) {
          return sendJson(res, 200, { ok: true, order: updated });
        }
        return sendJson(res, 404, { ok: false, error: 'Pedido no encontrado' });
      }

      return sendJson(res, 400, { ok: false, error: 'Acción no reconocida' });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // API: Configuración Oficial del Negocio (Fuente Única de Verdad)
  // --------------------------------------------------------------------------
  if (pathname === '/api/config') {
    if (req.method === 'GET') {
      return sendJson(res, 200, configRepo.get());
    }

    if (req.method === 'PATCH' || req.method === 'POST') {
      const token = extractToken(req);
      if (!isValidAdminSession(token)) {
        return sendJson(res, 401, { ok: false, error: 'Requiere autenticación de administrador' });
      }

      try {
        const patch = await readJsonBody(req);
        const updated = configRepo.update(patch);
        return sendJson(res, 200, { ok: true, config: updated });
      } catch (e) {
        return sendJson(res, 400, { ok: false, error: e.message });
      }
    }
  }

  // --------------------------------------------------------------------------
  // API: Catálogo Maestro de Productos (Fuente Única de Verdad)
  // --------------------------------------------------------------------------
  if (pathname === '/api/catalog') {
    if (req.method === 'GET') {
      return sendJson(res, 200, catalogRepo.getAll());
    }

    if (req.method === 'POST') {
      const token = extractToken(req);
      if (!isValidAdminSession(token)) {
        return sendJson(res, 401, { ok: false, error: 'Requiere autenticación de administrador' });
      }

      try {
        const product = await readJsonBody(req);
        const saved = catalogRepo.save(product);
        return sendJson(res, 200, { ok: true, product: saved });
      } catch (e) {
        return sendJson(res, 400, { ok: false, error: e.message });
      }
    }
  }

  if (pathname.startsWith('/api/catalog/') && pathname.endsWith('/stock') && req.method === 'PATCH') {
    const token = extractToken(req);
    if (!isValidAdminSession(token)) {
      return sendJson(res, 401, { ok: false, error: 'Requiere autenticación de administrador' });
    }

    const prodId = pathname.split('/')[3];
    try {
      const body = await readJsonBody(req);
      const updated = catalogRepo.toggleStock(prodId, body.stock);
      if (updated) {
        return sendJson(res, 200, { ok: true, product: updated });
      }
      return sendJson(res, 404, { ok: false, error: 'Producto no encontrado' });
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: e.message });
    }
  }

  if (pathname.startsWith('/api/catalog/') && req.method === 'DELETE') {
    const token = extractToken(req);
    if (!isValidAdminSession(token)) {
      return sendJson(res, 401, { ok: false, error: 'Requiere autenticación de administrador' });
    }

    const prodId = pathname.split('/')[3];
    const ok = catalogRepo.delete(prodId);
    return sendJson(res, ok ? 200 : 404, { ok });
  }

  // --------------------------------------------------------------------------
  // Servidor de Archivos Estáticos con soporte para Web SPA y Admin
  // --------------------------------------------------------------------------
  const webDist = path.join(__dirname, '..', 'web', 'dist');
  let filePath = null;
  let rootDir = APP_DIR;

  if (pathname === '/admin' || pathname === '/admin/') {
    pathname = '/admin.html';
  }

  const isWebRoute = pathname === '/' || pathname === '/index.html' ||
    pathname.startsWith('/app') || pathname.startsWith('/mobile') ||
    pathname.startsWith('/assets') || pathname === '/vite.svg' || pathname === '/manifest.json' || pathname === '/favicon.ico';

  if (isWebRoute && fs.existsSync(webDist)) {
    rootDir = webDist;
    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    const candidateFile = path.join(webDist, safePath);
    if (fs.existsSync(candidateFile) && !fs.statSync(candidateFile).isDirectory()) {
      filePath = candidateFile;
    } else {
      filePath = path.join(webDist, 'index.html');
    }
  } else {
    rootDir = APP_DIR;
    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    filePath = path.join(APP_DIR, safePath);
  }

  // Verificación estricta contra Path Traversal
  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('403 Acceso Denegado');
    return;
  }

  // Si es un directorio, buscar index.html
  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end(`404 No encontrado: ${pathname}`);
    return;
  }

  // Envío del archivo estático
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end(`404 No encontrado`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': content.length,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': ext === '.html' ? 'no-cache, must-revalidate' : 'public, max-age=3600'
    });
    res.end(content);
  });
});

// Inicio del servidor
const bindHost = BIND_ALL ? '0.0.0.0' : '127.0.0.1';
server.listen(PORT, bindHost, () => {
  const localIp = getLocalIp();
  console.log('======================================================');
  console.log('RETEQUEÑOS OS - SERVIDOR DE PRODUCCIÓN LOCAL');
  console.log('======================================================');
  console.log(`✓ Servidor activo en:    http://localhost:${PORT}`);
  console.log(`✓ Panel Administrador:   http://localhost:${PORT}/admin`);
  console.log(`✓ API REST Pedidos:      http://localhost:${PORT}/api/pedidos`);
  console.log('✓ Acceso del equipo:     administrador / caja');
  if (legacyPinEnabled) console.log('✓ Acceso PIN heredado:   habilitado expresamente');
  console.log(`✓ Persistencia en disco: ${DB_FILE}`);

  if (BIND_ALL && localIp) {
    console.log(`✓ Acceso desde celular:  http://${localIp}:${PORT} (WiFi local)`);
  } else if (!BIND_ALL) {
    console.log(`* Modo local estricto. Para abrir a la red WiFi usa: --lan`);
  }
  console.log('======================================================\n');
});
