/**
 * Configuración del servidor: rutas de carpetas, argumentos de línea de comandos y tipos MIME.
 * No lee ni escribe archivos; solo calcula valores para que el resto de módulos los reciba.
 */
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

function resolvePaths(rootDir = ROOT_DIR) {
  return {
    rootDir,
    appDir: path.join(rootDir, 'app'),
    dataDir: path.join(rootDir, 'data'),
    webDist: path.join(rootDir, 'web', 'dist')
  };
}

// Mismos argumentos que aceptaba tools/server.js: -p/--port, -Lan/--lan y --pin
function parseArgs(argv = [], env = {}) {
  let port = 3000;
  let bindAll = false;
  let adminPin = env.RTQ_ADMIN_PIN || '2026';
  let legacyPinEnabled = Boolean(env.RTQ_ADMIN_PIN);

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '-p' || argv[i] === '--port') {
      port = parseInt(argv[++i], 10) || 3000;
    } else if (argv[i] === '-Lan' || argv[i] === '--lan') {
      bindAll = true;
    } else if (argv[i] === '--pin') {
      legacyPinEnabled = true;
      adminPin = argv[++i] || '2026';
    }
  }

  return { port, bindAll, adminPin, legacyPinEnabled };
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=UTF-8'
};

module.exports = { ROOT_DIR, resolvePaths, parseArgs, MIME_TYPES };
