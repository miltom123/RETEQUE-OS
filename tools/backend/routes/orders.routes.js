/**
 * /api/pedidos y /api/pedidos/:id
 * Comportamiento conservado: POST /api/pedidos sigue siendo público y acepta precios,
 * status y payVerified enviados por el cliente. Se corregirá en la etapa de admisión y precios.
 */
const { extractToken, readJsonBody, sendJson } = require('../http');
const { sanitizeId } = require('../sanitize');
const { canAccessOrder } = require('../auth');

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
        if (repos.orders.getById(sanitizeId(payload.id))) return sendJson(res, 409, { error: 'El pedido ya existe.' });
        payload.createdAt = new Date().toISOString();
        payload.createdBy = null;
        const newOrder = repos.orders.insert(payload);
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
