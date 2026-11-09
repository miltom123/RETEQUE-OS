// Fuente Única de Verdad: Repositorio de Catálogo Maestro de Productos (data/catalog.db.json)
const fs = require('fs');
const crypto = require('crypto');
const { sanitizeId, sanitizeString } = require('../sanitize');

class CatalogRepository {
  constructor(filePath, logger = console) {
    this.filePath = filePath;
    this.logger = logger;
    this.products = [];
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(this.filePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        if (Array.isArray(parsed)) {
          this.products = parsed;
          this.logger.log(`[Catalog] Catálogo cargado: ${this.products.length} productos.`);
          return;
        }
      }
    } catch (e) {
      this.logger.warn('[Catalog] Error al leer catalog.db.json:', e.message);
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

module.exports = { CatalogRepository };
