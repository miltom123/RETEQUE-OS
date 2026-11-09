// Servidor de Archivos Estáticos con soporte para Web SPA (web/dist) y Admin (app/)
const fs = require('fs');
const path = require('path');
const { MIME_TYPES } = require('../config');

function serveStatic({ res, pathname }, { paths }) {
  const { appDir, webDist } = paths;
  let filePath = null;
  let rootDir = appDir;

  if (pathname === '/admin' || pathname === '/admin/') {
    pathname = '/admin.html';
  }

  const isWebRoute = pathname === '/' || pathname === '/index.html' ||
    pathname.startsWith('/app') || pathname.startsWith('/mobile') ||
    pathname.startsWith('/assets') || pathname === '/vite.svg' || pathname === '/manifest.json' || pathname === '/favicon.ico';

  if (isWebRoute && fs.existsSync(webDist)) {
    rootDir = webDist;
    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    const candidateFile = path.join(webDist, safePath);
    if (fs.existsSync(candidateFile) && !fs.statSync(candidateFile).isDirectory()) {
      filePath = candidateFile;
    } else {
      filePath = path.join(webDist, 'index.html');
    }
  } else {
    rootDir = appDir;
    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    filePath = path.join(appDir, safePath);
  }

  // Verificación estricta contra Path Traversal
  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('403 Acceso Denegado');
    return true;
  }

  // Si es un directorio, buscar index.html
  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end(`404 No encontrado: ${pathname}`);
    return true;
  }

  // Envío del archivo estático
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end(`404 No encontrado`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': content.length,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': ext === '.html' ? 'no-cache, must-revalidate' : 'public, max-age=3600'
    });
    res.end(content);
  });
  return true;
}

module.exports = { serveStatic };
