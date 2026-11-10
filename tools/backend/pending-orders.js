// Pedidos web que nadie confirmó: pasado el plazo se anulan solos para que la lista
// "Por confirmar" de caja no se llene de pedidos abandonados. Quedan en el historial como anulados.
const DEFAULT_HOURS = 12;

function pendingHours(value) {
  const hours = Number(value);
  return Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_HOURS;
}

/**
 * Devuelve una función que anula los pedidos por confirmar vencidos. Se llama al listar pedidos
 * (el panel los consulta a cada rato), así que no hace falta un temporizador; como mucho revisa
 * una vez por minuto.
 */
function createPendingExpiry({ orders, logger = console, hours, everyMs = 60 * 1000, now = Date.now }) {
  const limitMs = pendingHours(hours) * 60 * 60 * 1000;
  let lastRun = -Infinity;

  return async function expirePendingOrders() {
    const current = now();
    if (current - lastRun < everyMs) return 0;
    lastRun = current;

    let expired = 0;
    for (const order of await orders.getAll()) {
      if (order.status !== 'pending_confirmation') continue;
      const createdAt = Date.parse(order.createdAt);
      if (!Number.isFinite(createdAt) || current - createdAt < limitMs) continue;
      await orders.updateStatus(order.id, 'cancelled');
      expired += 1;
    }
    if (expired) logger.log(`[PEDIDOS WEB] ${expired} sin confirmar vencieron y se anularon.`);
    return expired;
  };
}

module.exports = { createPendingExpiry, pendingHours, DEFAULT_HOURS };
