// /api/config: lectura pública, modificación solo de administrador
const { extractToken, readJsonBody, sendJson } = require('../http');
const { sanitizeString } = require('../sanitize');

// Campos de texto que el administrador puede cambiar y su largo máximo (RNF-04)
const TEXT_FIELDS = { name: 60, city: 60, address: 120, hours: 80, whatsappDisplay: 20, instagram: 40, facebook: 60 };
const URL_FIELDS = ['mapsUrl', 'instagramUrl', 'facebookUrl'];

function validateCoupons(list) {
  if (!Array.isArray(list) || list.length > 100) throw new Error('La lista de cupones no es válida.');
  return list.map(raw => {
    const code = String(raw && raw.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{3,20}$/.test(code)) throw new Error('Cada cupón necesita un código de 3 a 20 letras o números.');
    const type = raw.type === 'percent' ? 'percent' : raw.type === 'fixed' ? 'fixed' : null;
    const value = Number(raw.value);
    if (!type || !Number.isFinite(value) || value <= 0 || (type === 'percent' && value > 100) || value > 1000) throw new Error(`El valor del cupón ${code} no es válido.`);
    const minOrder = Number(raw.minOrder || 0);
    if (!Number.isFinite(minOrder) || minOrder < 0 || minOrder > 10000) throw new Error(`El pedido mínimo del cupón ${code} no es válido.`);
    return { code, name: sanitizeString(String(raw.name || code)).slice(0, 80), type, value, minOrder, active: raw.active !== false };
  });
}

// Solo pasan los campos conocidos, limpios; cualquier otro se rechaza
function validateConfigPatch(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Configuración inválida.');
  const clean = {};
  for (const [key, value] of Object.entries(patch)) {
    if (key in TEXT_FIELDS) clean[key] = sanitizeString(String(value)).slice(0, TEXT_FIELDS[key]);
    else if (URL_FIELDS.includes(key)) {
      if (!/^https:\/\/[^\s<>"']{4,300}$/.test(String(value))) throw new Error(`${key} debe ser un enlace https.`);
      clean[key] = String(value);
    } else if (key === 'whatsappInternational' || key === 'operatorPhone') {
      if (!/^51\d{9}$/.test(String(value))) throw new Error(`${key} debe tener el formato 51 + 9 dígitos.`);
      clean[key] = String(value);
    } else if (key === 'yape') {
      clean.yape = { number: sanitizeString(String(value && value.number || '')).slice(0, 20), holder: sanitizeString(String(value && value.holder || '')).slice(0, 60) };
    } else if (key === 'coupons') clean.coupons = validateCoupons(value);
    else throw new Error(`El campo "${sanitizeString(key).slice(0, 40)}" no se puede modificar aquí.`);
  }
  return clean;
}

async function handleConfig({ req, res, pathname, currentUser }, { repos, auth }) {
  if (pathname !== '/api/config') return false;

  if (req.method === 'GET') {
    // Los cupones se validan en el servidor: el público no ve la lista de códigos
    const config = { ...(await repos.config.get()) };
    if (!currentUser || currentUser.role !== 'admin') delete config.coupons;
    return sendJson(res, 200, config);
  }

  if (req.method === 'PATCH' || req.method === 'POST') {
    const token = extractToken(req);
    if (!(await auth.isValidSession(token))) {
      return sendJson(res, 401, { ok: false, error: 'Requiere autenticación de administrador' });
    }

    try {
      const patch = validateConfigPatch(await readJsonBody(req));
      const updated = await repos.config.update(patch);
      return sendJson(res, 200, { ok: true, config: updated });
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: e.message });
    }
  }

  // Otros métodos continúan hacia las rutas siguientes, igual que antes
  return false;
}

module.exports = { handleConfig, validateConfigPatch };
