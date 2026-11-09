/**
 * Composición de la aplicación HTTP.
 *
 * Importar este módulo no abre puertos ni toca archivos. createApp() crea los repositorios
 * (que sí leen y, si falta algún archivo, escriben en dataDir) y devuelve un http.Server
 * sin escuchar. Quien llama decide cuándo hacer listen(): tools/server.js en producción
 * local, o las pruebas con un directorio de datos temporal.
 */
const http = require('http');
const path = require('path');
const { UsersRepository } = require('../users.repository');
const { resolvePaths } = require('./config');
const { handleCors, extractToken, sendJson } = require('./http');
const { createAuth } = require('./auth');
const { createOrderRateLimiter } = require('./rate-limit');
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
const { serveStatic } = require('./routes/static.routes');

// El orden importa: reproduce la cadena de if de la versión monolítica, incluidos los casos
// en que un método no contemplado continúa hacia la siguiente ruta y termina en estáticos.
const API_ROUTES = [handleReports, handleUsers, handleCaja, handleAuth, handleOrders, handleConfig, handleCatalog];

function isAdminOnly(pathname, method) {
  return pathname.startsWith('/api/users') || pathname.startsWith('/api/reports') ||
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

  // Mismo orden de creación que la versión monolítica
  const users = new UsersRepository(paths.dataDir);
  const config = new ConfigRepository(paths.configFile, logger);
  const catalog = new CatalogRepository(paths.catalogFile, logger);
  const orders = new OrderRepository(paths.ordersFile, logger);
  const repos = { users, config, catalog, orders };

  const auth = createAuth({
    usersRepo: users,
    adminPin: options.adminPin || '2026',
    legacyPinEnabled: Boolean(options.legacyPinEnabled)
  });
  const deps = { repos, auth, checkOrderRateLimit: createOrderRateLimiter(), logger, paths };

  async function handleRequest(req, res) {
    handleCors(req, res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(parsedUrl.pathname);

    const currentToken = extractToken(req);
    const currentUser = auth.isValidSession(currentToken) ? auth.sessionUser(currentToken) : null;
    const adminOnly = isAdminOnly(pathname, req.method);
    if (adminOnly && !currentUser) return sendJson(res, 401, { error: 'Inicia sesión.' });
    if (adminOnly && currentUser.role !== 'admin') return sendJson(res, 403, { error: 'Esta acción es exclusiva del administrador.' });

    const ctx = { req, res, pathname, parsedUrl, currentUser };
    for (const route of API_ROUTES) {
      if (await route(ctx, deps)) return;
    }
    serveStatic(ctx, deps);
  }

  const server = http.createServer(handleRequest);
  return { server, handleRequest, repos, auth, paths };
}

module.exports = { createApp, isAdminOnly };
