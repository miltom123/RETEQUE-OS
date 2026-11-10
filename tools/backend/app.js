/**
 * Composición de la aplicación HTTP.
 *
 * Importar este módulo no abre puertos ni toca archivos. createApp() crea los repositorios
 * (JSON lee y puede inicializar dataDir; PostgreSQL nunca usa esos archivos) y devuelve un http.Server
 * sin escuchar. Quien llama decide cuándo hacer listen(): tools/server.js en producción
 * local, o las pruebas con un directorio de datos temporal.
 */
const http = require('http');
const path = require('path');
const { UsersRepository } = require('../users.repository');
const { resolvePaths } = require('./config');
const { handleCors, extractToken, sendJson } = require('./http');
const { createAuth } = require('./auth');
const { createRateLimiter, createOrderRateLimiter } = require('./rate-limit');
const { createIdempotencyStore } = require('./idempotency');
const { OrderRepository } = require('./repositories/orders.repository');
const { ConfigRepository } = require('./repositories/config.repository');
const { CatalogRepository } = require('./repositories/catalog.repository');
const { handleReports } = require('./routes/reports.routes');
const { handleUsers } = require('./routes/users.routes');
const { handleCaja } = require('./routes/caja.routes');
const { handleAuth } = require('./routes/auth.routes');
const { handleOrders } = require('./routes/orders.routes');
const { handleConfig } = require('./routes/config.routes');
const { handleCatalog } = require('./routes/catalog.routes');
const { handlePublic } = require('./routes/public.routes');
const { serveStatic } = require('./routes/static.routes');

// El orden importa: reproduce la cadena de if de la versión monolítica, incluidos los casos
// en que un método no contemplado continúa hacia la siguiente ruta y termina en estáticos.
const API_ROUTES = [handleReports, handleUsers, handleCaja, handleAuth, handleOrders, handleConfig, handleCatalog, handlePublic];

function isAdminOnly(pathname, method) {
  return pathname.startsWith('/api/users') || pathname.startsWith('/api/reports') ||
    (pathname === '/api/pedidos' && method === 'POST') ||
    (pathname.startsWith('/api/catalog') && method !== 'GET') ||
    (pathname === '/api/config' && method !== 'GET');
}

function createApp(options = {}) {
  const defaults = resolvePaths();
  const paths = {
    appDir: options.appDir || defaults.appDir,
    dataDir: options.dataDir || defaults.dataDir,
    webDist: options.webDist || defaults.webDist
  };
  paths.ordersFile = path.join(paths.dataDir, 'orders.db.json');
  paths.configFile = path.join(paths.dataDir, 'store.config.json');
  paths.catalogFile = path.join(paths.dataDir, 'catalog.db.json');
  const logger = options.logger || console;

  const storage = options.storage || process.env.RTQ_STORAGE || 'json';
  if (!['json', 'postgres'].includes(storage)) throw new Error('RTQ_STORAGE debe ser json o postgres.');
  let repos;
  if (storage === 'postgres') {
    const { createPostgresRepositories } = require('./repositories/postgres.repositories');
    repos = createPostgresRepositories(options.postgres);
  } else {
    const users = new UsersRepository(paths.dataDir);
    const config = new ConfigRepository(paths.configFile, logger);
    const catalog = new CatalogRepository(paths.catalogFile, logger);
    const orders = new OrderRepository(paths.ordersFile, logger);
    repos = { users, config, catalog, orders };
  }

  const auth = createAuth({
    usersRepo: repos.users,
    adminPin: options.adminPin || '2026',
    legacyPinEnabled: Boolean(options.legacyPinEnabled)
  });
  const deps = {
    repos, auth, logger, paths,
    checkOrderRateLimit: createOrderRateLimiter(),
    checkQuoteRateLimit: createRateLimiter({ max: 120, message: 'Demasiadas consultas seguidas. Espera un momento.' }),
    // Pedidos web por confirmar: pocos por IP y por celular para que nadie llene la lista de caja
    checkPublicOrderRateLimit: createRateLimiter({ max: 10, windowMs: 10 * 60 * 1000, message: 'Hiciste varios pedidos seguidos. Espera unos minutos o escríbenos por WhatsApp.' }),
    checkPublicOrderPhoneLimit: createRateLimiter({ max: 5, windowMs: 10 * 60 * 1000, message: 'Ya registramos varios pedidos con ese celular. Escríbenos por WhatsApp para confirmarlos.' }),
    idempotency: createIdempotencyStore()
  };

  async function routeRequest(req, res) {
    handleCors(req, res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    let parsedUrl, pathname;
    try {
      parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      pathname = decodeURIComponent(parsedUrl.pathname);
    } catch (error) {
      // URL o cabecera Host mal formadas (por ejemplo /%E0%A4%A): antes detenían el proceso
      return sendJson(res, 400, { ok: false, error: 'Dirección de la petición inválida.' });
    }

    const currentToken = extractToken(req);
    const currentUser = (await auth.isValidSession(currentToken)) ? auth.sessionUser(currentToken) : null;
    const adminOnly = isAdminOnly(pathname, req.method);
    if (adminOnly && !currentUser) return sendJson(res, 401, { error: 'Inicia sesión.' });
    if (adminOnly && currentUser.role !== 'admin') return sendJson(res, 403, { error: 'Esta acción es exclusiva del administrador.' });

    const ctx = { req, res, pathname, parsedUrl, currentUser };
    for (const route of API_ROUTES) {
      if (await route(ctx, deps)) return;
    }
    serveStatic(ctx, deps);
  }

  // Ningún error de una petición debe detener el servidor: se registra y se responde 500
  async function handleRequest(req, res) {
    try {
      await routeRequest(req, res);
    } catch (error) {
      logger.warn('[HTTP] Error no controlado en', req.method, '- operación fallida');
      if (!res.headersSent) sendJson(res, 500, { ok: false, error: 'Error interno del servidor.' });
      else res.destroy();
    }
  }

  const server = http.createServer(handleRequest);
  return { server, handleRequest, repos, auth, paths };
}

module.exports = { createApp, isAdminOnly };
