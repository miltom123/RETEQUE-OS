// /api/users y PATCH /api/users/:username (solo administrador; el permiso se valida en app.js)
// El PATCH activa o desactiva una cuenta de caja, o cambia el nombre o la contraseña de cualquier cuenta.
const { readJsonBody, sendJson } = require('../http');

async function handleUsers({ req, res, pathname }, { repos, auth }) {
  if (pathname === '/api/users') {
    if (req.method === 'GET') return sendJson(res, 200, await repos.users.list());
    if (req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        if (body.role && body.role !== 'cashier') return sendJson(res, 400, { error: 'Solo puedes crear usuarios de caja.' });
        return sendJson(res, 201, { ok: true, user: await repos.users.add(body.username, body.name, body.password) });
      } catch (error) { return sendJson(res, 400, { error: error.message }); }
    }
    return sendJson(res, 405, { error: 'Método no permitido.' });
  }
  if (pathname.startsWith('/api/users/') && req.method === 'PATCH') {
    try {
      const username = pathname.slice('/api/users/'.length);
      const body = await readJsonBody(req);
      if (!body || typeof body !== 'object' || Array.isArray(body)) return sendJson(res, 400, { error: 'Datos inválidos.' });
      let user;
      if (body.name !== undefined || body.password !== undefined) {
        user = await repos.users.update(username, { name: body.name, password: body.password });
        // Una contraseña nueva cierra las sesiones abiertas con la anterior
        if (body.password !== undefined) auth.revokeUserSessions(user.username);
      }
      if (body.active !== undefined) {
        user = await repos.users.setActive(username, body.active);
        if (!user.active) auth.revokeUserSessions(user.username);
      }
      if (!user) return sendJson(res, 400, { error: 'No hay cambios que guardar.' });
      return sendJson(res, 200, { ok: true, user });
    } catch (error) { return sendJson(res, 400, { error: error.message }); }
  }
  return false;
}

module.exports = { handleUsers };
