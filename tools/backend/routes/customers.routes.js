/**
 * Cuentas de cliente de la app móvil (RFI-01), direcciones (RFI-06) e historial (RFI-10).
 *   POST  /api/customers/register   { email, password, name, phone }
 *   POST  /api/customers/login      { email, password }
 *   GET   /api/customers/me
 *   PATCH /api/customers/me         { name?, phone?, addresses? }
 *   GET   /api/customers/me/orders
 * La sesión viaja en la cabecera x-customer-token (separada de la del personal).
 */
const { readJsonBody, sendJson } = require('../http');
const { CustomerError } = require('../repositories/customers.repository');
const { extractCustomerToken } = require('../customer-auth');
const { publicOrderView } = require('../order-view');

async function handleCustomers({ req, res, pathname }, deps) {
  if (!pathname.startsWith('/api/customers/')) return false;
  const { repos, customerAuth, checkCustomerLoginLimit } = deps;
  const ip = req.socket.remoteAddress || 'unknown';

  try {
    if ((pathname === '/api/customers/register' || pathname === '/api/customers/login') && req.method === 'POST') {
      const limit = checkCustomerLoginLimit(ip);
      if (!limit.allowed) return sendJson(res, 429, { error: limit.error });
      const body = await readJsonBody(req, 8 * 1024);
      const customer = pathname.endsWith('register')
        ? await repos.customers.register(body)
        : await repos.customers.authenticate(body.email, body.password);
      if (!customer) return sendJson(res, 401, { error: 'Correo o contraseña incorrectos.' });
      return sendJson(res, pathname.endsWith('register') ? 201 : 200, { ok: true, ...customerAuth.issue(customer.id), customer });
    }

    const customerId = customerAuth.verify(extractCustomerToken(req));
    const customer = customerId ? await repos.customers.find(customerId) : null;
    if (!customer) return sendJson(res, 401, { error: 'Tu sesión venció. Inicia sesión otra vez.' });

    if (pathname === '/api/customers/me') {
      if (req.method === 'GET') return sendJson(res, 200, { customer });
      if (req.method === 'PATCH') {
        const body = await readJsonBody(req, 16 * 1024);
        const fields = {};
        for (const key of ['name', 'phone', 'addresses']) if (key in body) fields[key] = body[key];
        return sendJson(res, 200, { ok: true, customer: await repos.customers.update(customerId, fields) });
      }
    }

    if (pathname === '/api/customers/me/orders' && req.method === 'GET') {
      const orders = (await repos.orders.getAll())
        .filter(order => order.customerId === customerId)
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
        .slice(0, 50)
        .map(publicOrderView);
      return sendJson(res, 200, orders);
    }
    return sendJson(res, 405, { error: 'Método no permitido.' });
  } catch (error) {
    if (error instanceof CustomerError) return sendJson(res, 400, { error: error.message });
    if (/Invalid JSON|Payload Too Large/.test(error.message)) return sendJson(res, 400, { error: 'Datos inválidos.' });
    throw error;
  }
}

module.exports = { handleCustomers };
