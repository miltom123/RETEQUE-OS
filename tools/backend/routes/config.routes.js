// /api/config: lectura pública, modificación solo de administrador
const { extractToken, readJsonBody, sendJson } = require('../http');

async function handleConfig({ req, res, pathname, currentUser }, { repos, auth }) {
  if (pathname !== '/api/config') return false;

  if (req.method === 'GET') {
    // Los cupones se validan en el servidor: el público no ve la lista de códigos
    const config = { ...(await repos.config.get()) };
    if (!currentUser || currentUser.role !== 'admin') delete config.coupons;
    return sendJson(res, 200, config);
  }

  if (req.method === 'PATCH' || req.method === 'POST') {
    const token = extractToken(req);
    if (!(await auth.isValidSession(token))) {
      return sendJson(res, 401, { ok: false, error: 'Requiere autenticación de administrador' });
    }

    try {
      const patch = await readJsonBody(req);
      const updated = await repos.config.update(patch);
      return sendJson(res, 200, { ok: true, config: updated });
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: e.message });
    }
  }

  // Otros métodos continúan hacia las rutas siguientes, igual que antes
  return false;
}

module.exports = { handleConfig };
