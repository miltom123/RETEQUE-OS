// Limitador simple por clave (IP o teléfono) en una ventana de tiempo
function createRateLimiter({ max, windowMs = 60 * 1000, message }) {
  const hits = new Map(); // clave -> { count, resetAt }

  return function check(key) {
    const now = Date.now();
    const rec = hits.get(key);
    if (!rec || now > rec.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true };
    }
    rec.count++;
    if (rec.count > max) {
      return { allowed: false, error: message };
    }
    return { allowed: true };
  };
}

// Limitador por IP para la creación de pedidos (30 por minuto)
function createOrderRateLimiter() {
  return createRateLimiter({ max: 30, message: 'Límite de creación de pedidos excedido (máx 30/min). Por favor espere un momento.' });
}

module.exports = { createRateLimiter, createOrderRateLimiter };
