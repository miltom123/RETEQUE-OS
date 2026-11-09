// /api/catalog: lectura pública; alta, stock y baja solo de administrador
const { extractToken, readJsonBody, sendJson } = require('../http');

async function handleCatalog({ req, res, pathname }, { repos, auth }) {
  if (pathname === '/api/catalog') {
    if (req.method === 'GET') {
      return sendJson(res, 200, repos.catalog.getAll());
    }

    if (req.method === 'POST') {
      const token = extractToken(req);
      if (!auth.isValidSession(token)) {
        return sendJson(res, 401, { ok: false, error: 'Requiere autenticación de administrador' });
      }

      try {
        const product = await readJsonBody(req);
        const saved = repos.catalog.save(product);
        return sendJson(res, 200, { ok: true, product: saved });
      } catch (e) {
        return sendJson(res, 400, { ok: false, error: e.message });
      }
    }
  }

  if (pathname.startsWith('/api/catalog/') && pathname.endsWith('/stock') && req.method === 'PATCH') {
    const token = extractToken(req);
    if (!auth.isValidSession(token)) {
      return sendJson(res, 401, { ok: false, error: 'Requiere autenticación de administrador' });
    }

    const prodId = pathname.split('/')[3];
    try {
      const body = await readJsonBody(req);
      const updated = repos.catalog.toggleStock(prodId, body.stock);
      if (updated) {
        return sendJson(res, 200, { ok: true, product: updated });
      }
      return sendJson(res, 404, { ok: false, error: 'Producto no encontrado' });
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: e.message });
    }
  }

  if (pathname.startsWith('/api/catalog/') && req.method === 'DELETE') {
    const token = extractToken(req);
    if (!auth.isValidSession(token)) {
      return sendJson(res, 401, { ok: false, error: 'Requiere autenticación de administrador' });
    }

    const prodId = pathname.split('/')[3];
    const ok = repos.catalog.delete(prodId);
    return sendJson(res, ok ? 200 : 404, { ok });
  }

  return false;
}

module.exports = { handleCatalog };
