// Rutas públicas de la tienda: cotizar el carrito con precios del servidor
const { readJsonBody, sendJson } = require('../http');
const { quoteCart, QuoteError } = require('../pricing');

async function loadPricingData(repos) {
  const [products, config] = await Promise.all([repos.catalog.getAll(), repos.config.get()]);
  return { products, coupons: (config && config.coupons) || [] };
}

async function handlePublic({ req, res, pathname }, { repos, checkQuoteRateLimit }) {
  if (pathname !== '/api/public/quote') return false;
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Método no permitido.' });

  const rate = checkQuoteRateLimit(req.socket.remoteAddress || 'unknown');
  if (!rate.allowed) return sendJson(res, 429, { error: rate.error });

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    return sendJson(res, 400, { error: 'No pudimos leer tu carrito.' });
  }
  try {
    return sendJson(res, 200, quoteCart(body, await loadPricingData(repos)));
  } catch (error) {
    if (error instanceof QuoteError) return sendJson(res, 400, { error: error.message });
    throw error;
  }
}

module.exports = { handlePublic, loadPricingData };
