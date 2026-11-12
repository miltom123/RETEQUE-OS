/**
 * Cuentas de cliente de la app (RFI-01) y sus direcciones de entrega (RFI-06).
 * Archivo JSON con escritura atómica, igual que el resto de data/. Contraseñas con scrypt.
 * Con RTQ_STORAGE=postgres también se usa este archivo: todavía no hay tabla de clientes.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { readJsonFile } = require('./json-file');
const { isValidPersonName, normalizePeruMobile, sanitizeString } = require('../sanitize');

const MAX_ADDRESSES = 5;
const EMAIL_RE = /^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[a-z]{2,}$/i;

class CustomerError extends Error {}

const hashPassword = (password, salt) => crypto.scryptSync(password, salt, 64).toString('hex');

function publicCustomer(c) {
  return { id: c.id, email: c.email, name: c.name, phone: c.phone, addresses: c.addresses || [], createdAt: c.createdAt };
}

function validateProfile({ name, phone }) {
  const cleanName = String(name || '').trim();
  if (!isValidPersonName(cleanName)) throw new CustomerError('Escribe tu nombre completo, solo con letras.');
  const cleanPhone = normalizePeruMobile(phone);
  if (!cleanPhone) throw new CustomerError('Escribe un celular válido de 9 dígitos que empiece en 9.');
  return { name: cleanName, phone: cleanPhone };
}

// Coordenadas dentro de un rango razonable de Tacna y alrededores; fuera de eso se descartan
function coordinate(value, min, max) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 1e6) / 1e6 : null;
}

function normalizeAddresses(list) {
  if (!Array.isArray(list)) throw new CustomerError('Lista de direcciones inválida.');
  if (list.length > MAX_ADDRESSES) throw new CustomerError(`Puedes guardar hasta ${MAX_ADDRESSES} direcciones.`);
  return list.map((raw, index) => {
    const address = sanitizeString(String(raw && raw.address || '')).slice(0, 200);
    if (address.length < 5) throw new CustomerError('Cada dirección debe tener al menos 5 caracteres.');
    const lat = coordinate(raw.lat, -90, 90);
    const lng = coordinate(raw.lng, -180, 180);
    return {
      id: /^[a-z0-9-]{4,40}$/i.test(raw.id || '') ? raw.id : crypto.randomBytes(6).toString('hex'),
      label: sanitizeString(String(raw.label || `Dirección ${index + 1}`)).slice(0, 30),
      address,
      reference: sanitizeString(String(raw.reference || '')).slice(0, 200),
      ...(lat !== null && lng !== null ? { lat, lng } : {}),
    };
  });
}

class CustomersRepository {
  constructor(dataDir) {
    this.file = path.join(dataDir, 'customers.db.json');
    fs.mkdirSync(dataDir, { recursive: true });
    this.customers = fs.existsSync(this.file)
      ? readJsonFile(this.file, { isValid: Array.isArray, expected: 'una lista de clientes' })
      : [];
  }

  save() {
    const tmp = `${this.file}.${crypto.randomBytes(6).toString('hex')}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.customers, null, 2), 'utf8');
    fs.renameSync(tmp, this.file);
  }

  find(id) {
    const c = this.customers.find(x => x.id === id);
    return c ? publicCustomer(c) : null;
  }

  register({ email, password, name, phone }) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(cleanEmail) || cleanEmail.length > 120) throw new CustomerError('Escribe un correo electrónico válido.');
    if (typeof password !== 'string' || password.length < 6 || password.length > 128) throw new CustomerError('La contraseña debe tener entre 6 y 128 caracteres.');
    const profile = validateProfile({ name, phone });
    if (this.customers.some(c => c.email === cleanEmail)) throw new CustomerError('Ya existe una cuenta con ese correo. Inicia sesión.');
    const salt = crypto.randomBytes(16).toString('hex');
    const customer = {
      id: 'cli_' + crypto.randomBytes(8).toString('hex'),
      email: cleanEmail, ...profile, addresses: [],
      salt, passwordHash: hashPassword(password, salt), createdAt: new Date().toISOString(),
    };
    this.customers.push(customer);
    try { this.save(); } catch (e) { this.customers.pop(); throw e; }
    return publicCustomer(customer);
  }

  authenticate(email, password) {
    const c = this.customers.find(x => x.email === String(email || '').trim().toLowerCase());
    // Se calcula el hash aunque no exista la cuenta para no revelar qué correos están registrados
    const salt = c ? c.salt : '00000000000000000000000000000000';
    const candidate = Buffer.from(hashPassword(typeof password === 'string' ? password : '', salt), 'hex');
    if (!c) return null;
    const stored = Buffer.from(c.passwordHash, 'hex');
    return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored) ? publicCustomer(c) : null;
  }

  update(id, fields) {
    const c = this.customers.find(x => x.id === id);
    if (!c) throw new CustomerError('La cuenta ya no existe.');
    const previous = JSON.stringify(c);
    if ('name' in fields || 'phone' in fields) Object.assign(c, validateProfile({ name: fields.name ?? c.name, phone: fields.phone ?? c.phone }));
    if ('addresses' in fields) c.addresses = normalizeAddresses(fields.addresses);
    try { this.save(); } catch (e) { Object.assign(c, JSON.parse(previous)); throw e; }
    return publicCustomer(c);
  }
}

module.exports = { CustomersRepository, CustomerError, normalizeAddresses, MAX_ADDRESSES };
