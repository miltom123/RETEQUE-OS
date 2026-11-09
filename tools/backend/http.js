/**
 * Utilidades HTTP sin estado: CORS, lectura de cuerpo JSON, respuestas JSON y extracción de token.
 */

// Extracción de Token de Autorización
function extractToken(req) {
  // 1. Cabecera Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  // 2. Cabecera personalizada x-admin-token
  if (req.headers['x-admin-token']) {
    return String(req.headers['x-admin-token']).trim();
  }
  // 3. Cookie rtq_admin_token
  const cookieHeader = req.headers['cookie'];
  if (cookieHeader) {
    const match = cookieHeader.match(/rtq_admin_token=([a-f0-9]+)/);
    if (match) return match[1];
  }
  return null;
}

// Validación de Origen CORS Seguro
function handleCors(req, res) {
  const origin = req.headers['origin'];
  if (!origin) {
    // Petición interna o de la misma máquina
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    // Permitir orígenes seguros de desarrollo y LAN
    const isAllowed =
      /^http:\/\/localhost(:[0-9]+)?$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1(:[0-9]+)?$/.test(origin) ||
      /^http:\/\/192\.168\.[0-9]+\.[0-9]+(:[0-9]+)?$/.test(origin) ||
      /^http:\/\/10\.[0-9]+\.[0-9]+\.[0-9]+(:[0-9]+)?$/.test(origin);

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token');
}

// Lector seguro de body JSON con límite de tamaño (DoS protection)
function readJsonBody(req, limitBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    let data = '';

    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > limitBytes) {
        req.destroy();
        reject(new Error('Payload Too Large'));
        return;
      }
      data += chunk;
    });

    req.on('end', () => {
      if (!data) return resolve({});
      try {
        const json = JSON.parse(data);
        resolve(json);
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });

    req.on('error', err => reject(err));
  });
}

// Respuestas JSON estandarizadas. Devuelve true para que las rutas indiquen "petición atendida".
function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN'
  });
  res.end(body);
  return true;
}

module.exports = { extractToken, handleCors, readJsonBody, sendJson };
