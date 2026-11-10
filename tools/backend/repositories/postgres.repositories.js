const crypto = require('crypto');
const { SupabaseRpc } = require('./supabase-rpc');
const { normalizeOrder } = require('./orders.repository');
const { normalizeProduct } = require('./catalog.repository');
const { cleanId } = require('../sanitize');
const { ORDER_STATUSES } = require('../order-status');
const { publicUser } = require('../../users.repository');

// Mismos métodos públicos de los repositorios JSON; en PostgreSQL devuelven promesas.
class OrderRepository {
  constructor(db) { this.db = db; }
  getAll() { return this.db.operation('orders.list'); }
  getById(id) { return this.db.operation('orders.find', { id }); }
  insert(order) { return this.db.operation('orders.insert', { order: normalizeOrder(order) }); }
  updateStatus(id, status) {
    if (!ORDER_STATUSES.includes(status)) return Promise.resolve(null);
    const patch = { status };
    if (status === 'cancelled') patch.time = 'Cancelado';
    if (status === 'kitchen') Object.assign(patch, { time: 'En cocina hace 1 min', elapsedMinutes: 1 });
    if (status === 'delivery') Object.assign(patch, { time: 'Salió hace 1 min', elapsedMinutes: 1 });
    if (status === 'delivered') {
      const now = new Date();
      patch.time = `Entregado a las ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
    return this.db.operation('orders.patch', { id, patch });
  }
  verifyPayment(id) { return this.db.operation('orders.patch', { id, patch: { payVerified: true } }); }
}

class CatalogRepository {
  constructor(db) { this.db = db; }
  getAll() { return this.db.operation('products.list'); }
  getById(id) { return this.db.operation('products.find', { id }); }
  async save(product) {
    // Igual que en JSON: sin `options` en el cuerpo se conservan las del producto guardado
    const existing = product.options === undefined && product.id ? await this.getById(cleanId(product.id)) : null;
    return this.db.operation('products.save', { product: normalizeProduct(product, existing && existing.options) });
  }
  toggleStock(id, stock) { return this.db.operation('products.stock', { id, stock: Boolean(stock) }); }
  delete(id) { return this.db.operation('products.delete', { id }); }
}

class ConfigRepository {
  constructor(db) { this.db = db; }
  get() { return this.db.operation('config.get'); }
  update(patch) { return this.db.operation('config.update', { patch }); }
}

class UsersRepository {
  constructor(db) { this.db = db; }
  find(username) { return this.db.operation('users.find', { username: String(username || '').trim().toLowerCase() }); }
  async list() { return (await this.db.operation('users.list')).map(publicUser); }
  async authenticate(username, password) {
    const user = await this.find(username);
    if (!user || !user.active || typeof password !== 'string') return null;
    const candidate = crypto.scryptSync(password, user.salt, 64);
    const stored = Buffer.from(user.passwordHash, 'hex');
    return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored) ? publicUser(user) : null;
  }
  async add(username, name, password, role = 'cashier') {
    username = String(username || '').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username) || ['atencion', 'atención'].includes(username)) throw new Error('Usa un usuario de 3 a 32 caracteres: letras, números, punto, guion o guion bajo.');
    if (await this.find(username)) throw new Error('Ese usuario ya existe.');
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 60) throw new Error('Ingresa un nombre de hasta 60 caracteres.');
    if (typeof password !== 'string' || password.length < 4 || password.length > 128) throw new Error('La contraseña debe tener entre 4 y 128 caracteres.');
    const salt = crypto.randomBytes(16).toString('hex');
    const user = { username, name: name.trim(), role, active: true, salt,
      passwordHash: crypto.scryptSync(password, salt, 64).toString('hex'), createdAt: new Date().toISOString() };
    return publicUser(await this.db.operation('users.add', { user }));
  }
  async setActive(username, active) {
    if (typeof active !== 'boolean') throw new Error('Estado inválido.');
    const user = await this.db.operation('users.active', { username: String(username || '').trim().toLowerCase(), active });
    if (!user) throw new Error('Solo puedes activar o desactivar usuarios de caja.');
    return publicUser(user);
  }
}

function createPostgresRepositories(options) {
  const db = new SupabaseRpc(options);
  return { orders: new OrderRepository(db), catalog: new CatalogRepository(db),
    config: new ConfigRepository(db), users: new UsersRepository(db) };
}
module.exports = { OrderRepository, CatalogRepository, ConfigRepository, UsersRepository, createPostgresRepositories };
