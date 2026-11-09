/**
 * /api/pedidos y /api/pedidos/:id
 * POST /api/pedidos es exclusivo del administrador (regla en app.js). El servidor fija estado,
 * verificación de pago, autoría y fecha; el pago se verifica después con PATCH.
 * Caja registra pedidos en /api/caja/pedidos con precios del catálogo.
 */
const crypto = require('crypto');
const { extractToken, readJsonBody, sendJson } = require('../http');
const { cleanId, sanitizeId } = require('../sanitize');
const { canAccessOrder } = require('../auth');

function newOrderId(ordersRepo) {
  let id;
  do { id = 'RTQ-' + crypto.randomBytes(6).toString('hex').toUpperCase(); } while (ordersRepo.getById(id));
  return id;
}

async function handleOrders({ req, res, pathname, parsedUrl, currentUser }, { repos, auth, checkOrderRateLimit, logger }) {
  if (pathname === '/api/pedidos') {
    // GET: Obtener todos los pedidos (Exclusivo Administrador autenticado para evitar fuga de PII)
    if (req.method === 'GET') {
      const token = extractToken(req);
      const isAuth = auth.isValidSession(token);

      if (!isAuth) {
        return sendJson(res, 401, {
          ok: false,
          error: 'Requiere autenticación de administrador para acceder a las comandas'
        });
      }

      const user = auth.sessionUser(token);
      if (user.role !== 'admin' && parsedUrl.searchParams.get('scope') === 'all') return sendJson(res, 403, { error: 'Solo el administrador puede consultar el historial completo.' });
      const orders = repos.orders.getAll().filter(order => canAccessOrder(user, order));
      return sendJson(res, 200, orders);
    }

    // POST: Registrar pedido desde el panel del administrador (sesión validada en app.js)
    if (req.method === 'POST') {
      try {
        const clientIp = req.socket.remoteAddress || 'unknown';
        const rate = checkOrderRateLimit(clientIp);
        if (!rate.allowed) {
          return sendJson(res, 429, { ok: false, error: rate.error });
        }

        const payload = await readJsonBody(req);
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
          return sendJson(res, 400, { ok: false, error: 'Cuerpo de pedido inválido' });
        }

        // El id se decide una sola vez: el del cliente si es válido, si no uno generado por el servidor
        const requestedId = cleanId(payload.id);
        if (requestedId && repos.orders.getById(requestedId)) return sendJson(res, 409, { error: 'El pedido ya existe.' });
        const id = requestedId || newOrderId(repos.orders);

        const newOrder = repos.orders.insert({
          ...payload,
          id,
          channel: ['web', 'app', 'whatsapp'].includes(payload.channel) ? payload.channel : 'app',
          status: 'new',
          payVerified: false,
          createdAt: new Date().toISOString(),
          createdBy: currentUser.username
        });
        logger.log(`[PEDIDO CREADO] ${newOrder.id} - ${newOrder.customer} - Total: S/ ${newOrder.total.toFixed(2)} (${newOrder.channel})`);
        return sendJson(res, 201, { ok: true, order: newOrder });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }
    // Otros métodos continúan hacia las rutas siguientes, igual que antes
  }

  // GET /api/pedidos/:id (Consulta pública y segura de estado individual sin exponer PII completa)
  if (pathname.startsWith('/api/pedidos/') && req.method === 'GET') {
    const orderId = sanitizeId(pathname.split('/')[3] || '');
    const ord = repos.orders.getById(orderId);
    if (!ord) {
      return sendJson(res, 404, { ok: false, error: 'Pedido no encontrado' });
    }
    const token = extractToken(req);
    const isAuth = auth.isValidSession(token);
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
    if (!canAccessOrder(auth.sessionUser(token), ord)) return sendJson(res, 403, { error: 'Caja solo puede consultar pedidos del día.' });
    return sendJson(res, 200, ord);
  }

  // PATCH /api/pedidos/:id (Actualizar estado o verificar pago - Requiere sesión de personal)
  if (pathname.startsWith('/api/pedidos/') && (req.method === 'PATCH' || req.method === 'POST')) {
    const token = extractToken(req);
    if (!auth.isValidSession(token)) {
      return sendJson(res, 401, { ok: false, error: 'Requiere autenticación de administrador' });
    }

    const orderId = sanitizeId(pathname.split('/')[3] || '');
    if (!orderId) {
      return sendJson(res, 400, { ok: false, error: 'ID de pedido no especificado' });
    }

    const order = repos.orders.getById(orderId);
    if (order && !canAccessOrder(auth.sessionUser(token), order)) return sendJson(res, 403, { error: 'Caja solo puede gestionar pedidos del día.' });
    try {
      const body = await readJsonBody(req);
      if (body.status) {
        if (order && body.status === 'kitchen' && /yape|plin|transfer/i.test(order.payMethod || '') && !order.payVerified) return sendJson(res, 400, { error: 'Verifica el pago antes de mandar a cocina.' });
        if (currentUser.role === 'cashier' && order) {
          const next = { new: ['kitchen'], kitchen: order.mode === 'pickup' ? ['delivered'] : ['delivery'], delivery: ['delivered'], delivered: [] };
          if (!next[order.status]?.includes(body.status)) return sendJson(res, 400, { error: 'Ese cambio de estado no está permitido para caja.' });
        }
        const updated = repos.orders.updateStatus(orderId, body.status);
        if (updated) {
          return sendJson(res, 200, { ok: true, order: updated });
        }
        return sendJson(res, 404, { ok: false, error: 'Pedido no encontrado' });
      }

      if (body.verifyPayment) {
        const updated = repos.orders.verifyPayment(orderId);
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

  return false;
}

module.exports = { handleOrders };
