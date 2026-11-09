// Funciones de Sanitización compartidas por repositorios y rutas
function sanitizeId(id) {
  if (typeof id !== 'string') return `RTQ-${Math.floor(2000 + Math.random() * 8000)}`;
  const cleaned = id.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  return cleaned || `RTQ-${Math.floor(2000 + Math.random() * 8000)}`;
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

module.exports = { sanitizeId, sanitizeString, sanitizeUrl };
