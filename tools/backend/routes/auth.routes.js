// /api/auth/login, /api/auth/verify y /api/auth/logout del panel de personal
const { extractToken, readJsonBody, sendJson } = require('../http');

async function handleAuth({ req, res, pathname }, { auth }) {
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    try {
      const clientIp = req.socket.remoteAddress || 'unknown';
      const limit = auth.checkLoginRateLimit(clientIp);
      if (!limit.allowed) {
        return sendJson(res, 429, { ok: false, error: limit.error });
      }

      const body = await readJsonBody(req);
      const result = await auth.verifyCredentials(body);

      if (result.ok) {
        auth.recordLoginAttempt(clientIp, true);
        const session = auth.createSession(result.user || undefined);
        res.setHeader('Set-Cookie', `rtq_admin_token=${session.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
        return sendJson(res, 200, {
          ok: true,
          message: 'Autenticación exitosa',
          token: session.token,
          expiresAt: session.expiresAt,
          user: auth.sessionUser(session.token)
        });
      } else {
        auth.recordLoginAttempt(clientIp, false);
        return sendJson(res, 401, { ok: false, error: 'Usuario o contraseña incorrectos' });
      }
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: e.message });
    }
  }

  if (pathname === '/api/auth/verify' && req.method === 'GET') {
    const token = extractToken(req);
    const isValid = await auth.isValidSession(token);
    return sendJson(res, 200, { authenticated: isValid, user: isValid ? auth.sessionUser(token) : null });
  }

  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    const token = extractToken(req);
    if (token) auth.revokeSession(token);
    res.setHeader('Set-Cookie', 'rtq_admin_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    return sendJson(res, 200, { ok: true });
  }

  return false;
}

module.exports = { handleAuth };
