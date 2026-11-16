// Funciones de Sanitización compartidas por repositorios y rutas

// Deja solo letras, números, guion y guion bajo; devuelve '' si no queda nada válido
function cleanId(id) {
  if (typeof id !== 'string') return '';
  return id.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
}

function sanitizeId(id) {
  return cleanId(id) || `RTQ-${Math.floor(2000 + Math.random() * 8000)}`;
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/[<>]/g, '') // Elimina etiquetas potencialmente maliciosas
    .slice(0, 500); // Límite de longitud preventiva
}

function sanitizeUrl(url) {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('https://maps.google.com/') || trimmed.startsWith('https://www.google.com/maps/')) {
    return trimmed;
  }
  return '';
}

// Nombre de persona: solo letras (con tildes y ñ), espacios, apóstrofo, guion y punto; de 3 a 60 caracteres
function isValidPersonName(value) {
  if (typeof value !== 'string') return false;
  const name = value.trim();
  if (name.length < 3 || name.length > 60) return false;
  if (!/^\p{L}[\p{L}\s'.-]*$/u.test(name)) return false;
  return (name.match(/\p{L}/gu) || []).length >= 3;
}

// Celular peruano: 9 dígitos que empiezan en 9, con o sin el 51 delante. Devuelve los 9 dígitos o null.
function normalizePeruMobile(value) {
  const digits = String(value || '').replace(/\D/g, '');
  const local = digits.length === 11 && digits.startsWith('51') ? digits.slice(2) : digits;
  return /^9\d{8}$/.test(local) ? local : null;
}

module.exports = { cleanId, sanitizeId, sanitizeString, sanitizeUrl, isValidPersonName, normalizePeruMobile };
