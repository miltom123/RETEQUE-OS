// Limitador por IP para la creación pública de pedidos (30 por minuto)
function createOrderRateLimiter() {
  const orderRateLimits = new Map(); // ip -> { count, resetAt }

  return function checkOrderRateLimit(ip) {
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
  };
}

module.exports = { createOrderRateLimiter };
