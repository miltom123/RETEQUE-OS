// POST /api/caja/pedidos: pedido registrado por personal autenticado con precios tomados del catálogo
const crypto = require('crypto');
const { readJsonBody, sendJson } = require('../http');

async function handleCaja({ req, res, pathname, currentUser }, { repos }) {
  if (pathname !== '/api/caja/pedidos' || req.method !== 'POST') return false;
  if (!currentUser) return sendJson(res, 401, { error: 'Inicia sesión para registrar pedidos.' });
  try {
    const body = await readJsonBody(req);
    if (typeof body.customer !== 'string' || !body.customer.trim() || body.customer.length > 100) throw new Error('Ingresa el nombre del cliente.');
    if (!['pickup', 'delivery'].includes(body.mode)) throw new Error('Modalidad inválida.');
    if (!['Efectivo', 'Yape', 'Plin', 'Transferencia'].includes(body.payMethod)) throw new Error('Selecciona el medio de pago.');
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > 50) throw new Error('Agrega entre 1 y 50 productos.');
    const catalog = repos.catalog.getAll();
    const items = body.items.map(item => {
      const product = catalog.find(product => product.id === item.productId);
      if (!product || product.stock === false) throw new Error('Un producto ya no está disponible. Actualiza la carta.');
      if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99) throw new Error('La cantidad debe ser de 1 a 99.');
      return { productId: product.id, name: product.name, qty: item.qty, price: product.promo != null ? Number(product.promo) : Number(product.price), sauces: String(item.sauces || '').slice(0, 200) };
    });
    const fee = body.mode === 'pickup' ? 0 : Number(body.deliveryFee);
    if (!Number.isFinite(fee) || fee < 0 || fee > 100) throw new Error('El costo de delivery debe estar entre 0 y 100 soles.');
    if (body.mode === 'delivery' && (typeof body.address !== 'string' || !body.address.trim())) throw new Error('Ingresa la dirección del delivery.');
    const subtotal = items.reduce((sum, item) => sum + Math.round(item.price * 100) * item.qty, 0) / 100;
    const order = repos.orders.insert({ id: 'RTQ-' + crypto.randomBytes(6).toString('hex').toUpperCase(), customer: body.customer,
      phone: String(body.phone || '').slice(0, 30), items, mode: body.mode, deliveryFee: fee, subtotal, total: subtotal + fee,
      discount: 0, status: 'new', payMethod: body.payMethod, payVerified: body.payVerified === true,
      address: String(body.address || '').slice(0, 300), notes: String(body.notes || '').slice(0, 500), createdAt: new Date().toISOString(),
      createdBy: currentUser.username, channel: 'caja' });
    return sendJson(res, 201, { ok: true, order });
  } catch (error) { return sendJson(res, 400, { error: error.message }); }
}

module.exports = { handleCaja };
