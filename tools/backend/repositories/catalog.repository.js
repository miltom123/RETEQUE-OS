// Fuente Única de Verdad: Repositorio de Catálogo Maestro de Productos (data/catalog.db.json)
const fs = require('fs');
const crypto = require('crypto');
const { cleanId, sanitizeId, sanitizeString } = require('../sanitize');
const { readJsonFile } = require('./json-file');

class CatalogRepository {
  constructor(filePath, logger = console) {
    this.filePath = filePath;
    this.logger = logger;
    this.products = [];
    this.init();
  }

  // Un catálogo ilegible detiene el arranque: antes quedaba vacío y el siguiente guardado lo sobrescribía
  init() {
    if (fs.existsSync(this.filePath)) {
      this.products = readJsonFile(this.filePath, { isValid: Array.isArray, expected: 'una lista de productos' });
      this.logger.log(`[Catalog] Catálogo cargado: ${this.products.length} productos.`);
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
    const existing = this.products.find(p => p.id === sanitizeId(product.id || ''));
    const sanitized = normalizeProduct(product, existing && existing.options);

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

// Si el producto llega sin `options` (por ejemplo, desde el formulario del panel), se conservan las que tenía
function normalizeProduct(product, existingOptions = null) {
    return {
      id: sanitizeId(product.id || `prod_${Date.now()}`),
      name: sanitizeString(product.name || 'Producto'),
      // El ícono se pinta en el panel: solo un emoji o texto corto, sin etiquetas
      icon: sanitizeString(String(product.icon || '')).replace(/[&"'`]/g, '').slice(0, 8) || '🥟',
      cat: sanitizeString(product.cat || 'Clásicos'),
      qty: sanitizeString(product.qty || 'Porción estándar'),
      price: Math.max(0, parseFloat(product.price) || 0),
      promo: product.promo ? Math.max(0, parseFloat(product.promo) || 0) : null,
      sauces: sanitizeString(product.sauces || '2 salsas gratis'),
      badge: sanitizeString(product.badge || ''),
      desc: sanitizeString(product.desc || ''),
      stock: product.stock !== undefined ? Boolean(product.stock) : true,
      options: product.options !== undefined ? normalizeOptions(product.options) : normalizeOptions(existingOptions)
    };

}

/**
 * Opciones con precio de un producto:
 * - presentations: tamaños (10/20 unid., ½ L/1 L). Sin `price` usa el precio del producto (lo que edita el panel).
 * - extras: agregados que se cobran por unidad (cremas, adicionales de pizza).
 * - drinks: bebida a elegir en una promo, con su recargo (0 si va incluida).
 */
const OPTION_GROUPS = { presentations: 6, extras: 12, drinks: 8 };

function normalizeOptions(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) return null;
  const result = {};
  for (const [group, max] of Object.entries(OPTION_GROUPS)) {
    if (!Array.isArray(options[group])) continue;
    const seen = new Set();
    const list = [];
    for (const raw of options[group].slice(0, max)) {
      const id = cleanId(raw && raw.id);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const option = { id, label: sanitizeString(raw.label || id).slice(0, 60) };
      const price = parseFloat(raw.price);
      if (Number.isFinite(price) && price >= 0) option.price = Math.round(price * 100) / 100;
      else if (group !== 'presentations') option.price = 0;
      list.push(option);
    }
    if (list.length) result[group] = list;
  }
  return Object.keys(result).length ? result : null;
}

module.exports = { CatalogRepository, normalizeProduct, normalizeOptions };
