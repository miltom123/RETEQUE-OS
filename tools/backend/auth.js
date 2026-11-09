/**
 * Autenticación y permisos: sesiones en memoria, bloqueo por intentos fallidos,
 * PIN heredado opcional y regla de acceso de caja a pedidos del día.
 *
 * Cada llamada a createAuth crea su propio estado, de modo que dos instancias
 * de la aplicación (por ejemplo, en pruebas) no comparten sesiones.
 */
const crypto = require('crypto');
const { publicUser } = require('../users.repository');
const { peruDay } = require('./dates');

function timingSafeEqualStrings(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function canAccessOrder(user, order) {
  return user.role === 'admin' || Boolean(order.createdAt && peruDay(order.createdAt) === peruDay());
}

function createAuth({ usersRepo, adminPin = '2026', legacyPinEnabled = false }) {
  const activeSessions = new Map(); // token -> { createdAt, expiresAt, user }
  const loginAttempts = new Map(); // ip -> { count, lockedUntil }

  function checkLoginRateLimit(ip) {
    const now = Date.now();
    const rec = loginAttempts.get(ip);
    if (!rec) return { allowed: true };
    if (rec.lockedUntil && now < rec.lockedUntil) {
      const remainingSecs = Math.ceil((rec.lockedUntil - now) / 1000);
      return { allowed: false, error: `Demasiados intentos fallidos. Bloqueado temporalmente (${remainingSecs}s restantes).` };
    }
    if (rec.lockedUntil && now >= rec.lockedUntil) {
      loginAttempts.delete(ip);
      return { allowed: true };
    }
    return { allowed: true };
  }

  function recordLoginAttempt(ip, success) {
    if (success) {
      loginAttempts.delete(ip);
      return;
    }
    const now = Date.now();
    const rec = loginAttempts.get(ip) || { count: 0, lockedUntil: null };
    rec.count++;
    if (rec.count >= 5) {
      rec.lockedUntil = now + 15 * 60 * 1000; // 15 minutos
    }
    loginAttempts.set(ip, rec);
  }

  function createSession(user = { username: 'administrador', role: 'admin', name: 'Administrador' }) {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 horas
    activeSessions.set(token, { createdAt: now, expiresAt, user });
    return { token, expiresAt };
  }

  // Valida el token y refresca los datos públicos del usuario desde el repositorio
  function isValidSession(token) {
    if (!token) return false;
    const session = activeSessions.get(token);
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
      activeSessions.delete(token);
      return false;
    }
    const user = usersRepo.find(session.user.username);
    if (!user || !user.active) { activeSessions.delete(token); return false; }
    session.user = publicUser(user);
    return true;
  }

  function sessionUser(token) {
    return activeSessions.get(token).user;
  }

  function revokeSession(token) {
    activeSessions.delete(token);
  }

  function revokeUserSessions(username) {
    for (const [token, session] of activeSessions) {
      if (session.user.username === username) activeSessions.delete(token);
    }
  }

  // Usuario y contraseña; el PIN solo se acepta si se habilitó expresamente y sin usuario
  function verifyCredentials(body) {
    const inputPin = String(body.pin || '').trim();
    const user = usersRepo.authenticate(body.username, body.password);
    if (user) return { ok: true, user };
    if (legacyPinEnabled && !body.username && timingSafeEqualStrings(inputPin, adminPin)) return { ok: true, user: null };
    return { ok: false, user: null };
  }

  return {
    checkLoginRateLimit,
    recordLoginAttempt,
    createSession,
    isValidSession,
    sessionUser,
    revokeSession,
    revokeUserSessions,
    verifyCredentials,
    legacyPinEnabled
  };
}

module.exports = { createAuth, canAccessOrder, timingSafeEqualStrings };
