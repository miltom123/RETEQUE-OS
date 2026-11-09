// /api/users y PATCH /api/users/:username (solo administrador; el permiso se valida en app.js)
const { readJsonBody, sendJson } = require('../http');

async function handleUsers({ req, res, pathname }, { repos, auth }) {
  if (pathname === '/api/users') {
    if (req.method === 'GET') return sendJson(res, 200, repos.users.list());
    if (req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        if (body.role && body.role !== 'cashier') return sendJson(res, 400, { error: 'Solo puedes crear usuarios de caja.' });
        return sendJson(res, 201, { ok: true, user: repos.users.add(body.username, body.name, body.password) });
      } catch (error) { return sendJson(res, 400, { error: error.message }); }
    }
    return sendJson(res, 405, { error: 'Método no permitido.' });
  }
  if (pathname.startsWith('/api/users/') && req.method === 'PATCH') {
    try {
      const username = pathname.slice('/api/users/'.length);
      const body = await readJsonBody(req);
      const user = repos.users.setActive(username, body.active);
      if (!user.active) auth.revokeUserSessions(user.username);
      return sendJson(res, 200, { ok: true, user });
    } catch (error) { return sendJson(res, 400, { error: error.message }); }
  }
  return false;
}

module.exports = { handleUsers };
