/**
 * Sesión de cliente con token firmado (HMAC-SHA256): no se guarda en memoria, así que
 * sobrevive a los reinicios del servidor. Formato: <idCliente>.<expiraMs>.<firma>.
 * El secreto se lee de RTQ_SECRET o se crea una sola vez en data/secret.key.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TTL_MS = 30 * 24 * 60 * 60 * 1000;

function loadSecret(dataDir, envSecret) {
  if (envSecret && envSecret.length >= 32) return envSecret;
  const file = path.join(dataDir, 'secret.key');
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  const secret = crypto.randomBytes(32).toString('hex');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(file, secret, { encoding: 'utf8', flag: 'wx' });
  return secret;
}

// `secret` puede ser una función: así el archivo de secreto se crea recién al primer uso
function createCustomerAuth({ secret, now = Date.now }) {
  let key = null;
  const sign = data => {
    if (!key) key = typeof secret === 'function' ? secret() : secret;
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  };

  function issue(customerId) {
    const expiresAt = now() + TTL_MS;
    const data = `${customerId}.${expiresAt}`;
    return { token: `${data}.${sign(data)}`, expiresAt };
  }

  // Devuelve el id del cliente si el token es auténtico y vigente; si no, null
  function verify(token) {
    const parts = String(token || '').split('.');
    if (parts.length !== 3 || !/^cli_[a-f0-9]{16}$/.test(parts[0]) || !/^\d{13}$/.test(parts[1])) return null;
    const expected = Buffer.from(sign(`${parts[0]}.${parts[1]}`), 'hex');
    const given = Buffer.from(parts[2], 'hex');
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
    return Number(parts[1]) > now() ? parts[0] : null;
  }

  return { issue, verify };
}

function extractCustomerToken(req) {
  return String(req.headers['x-customer-token'] || '').trim() || null;
}

module.exports = { loadSecret, createCustomerAuth, extractCustomerToken, TTL_MS };
