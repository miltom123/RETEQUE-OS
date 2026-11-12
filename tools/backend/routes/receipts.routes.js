/**
 * Constancia de pago Yape / Plin / transferencia (RFI-08, RFI-13).
 *   POST /api/public/orders/:id/receipt  cliente, cabecera x-order-token (la entregada al crear el pedido)
 *                                        { image: "data:image/jpeg;base64,..." } hasta 2 MB
 *   GET  /api/pedidos/:id/receipt        personal con sesión: muestra la imagen para verificar el pago
 * Las imágenes se guardan en data/receipts/<pedido>.<ext>, fuera de las carpetas públicas.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { readJsonBody, sendJson } = require('../http');
const { cleanId } = require('../sanitize');
const { canAccessOrder } = require('../auth');

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = {
  'image/jpeg': { ext: 'jpg', magic: [0xff, 0xd8, 0xff] },
  'image/png': { ext: 'png', magic: [0x89, 0x50, 0x4e, 0x47] },
  'image/webp': { ext: 'webp', magic: [0x52, 0x49, 0x46, 0x46] },
};

const sha256 = value => crypto.createHash('sha256').update(String(value)).digest('hex');

// El contenido debe empezar con la firma real del formato declarado: no basta con la extensión
function decodeImage(dataUrl) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!match) return null;
  const buffer = Buffer.from(match[2], 'base64');
  const type = TYPES[match[1]];
  if (!buffer.length || buffer.length > MAX_BYTES || !type.magic.every((byte, i) => buffer[i] === byte)) return null;
  return { buffer, type: match[1], ext: type.ext };
}

function validOrderToken(order, token) {
  if (!order || !order.accessTokenHash || !/^[a-f0-9]{32}$/.test(token || '')) return false;
  return crypto.timingSafeEqual(Buffer.from(sha256(token), 'hex'), Buffer.from(order.accessTokenHash, 'hex'));
}

async function handleReceipts({ req, res, pathname, currentUser }, { repos, paths, checkReceiptLimit }) {
  const upload = pathname.match(/^\/api\/public\/orders\/([^/]+)\/receipt$/);
  const view = pathname.match(/^\/api\/pedidos\/([^/]+)\/receipt$/);
  if (!upload && !view) return false;
  const dir = path.join(paths.dataDir, 'receipts');

  if (upload) {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Método no permitido.' });
    const limit = checkReceiptLimit(req.socket.remoteAddress || 'unknown');
    if (!limit.allowed) return sendJson(res, 429, { error: limit.error });
    const order = await repos.orders.getById(cleanId(upload[1]));
    if (!validOrderToken(order, String(req.headers['x-order-token'] || ''))) return sendJson(res, 403, { error: 'No pudimos validar tu pedido. Escríbenos por WhatsApp.' });
    if (!/yape|plin|transfer/i.test(order.payMethod || '')) return sendJson(res, 400, { error: 'Este pedido no se paga por Yape, Plin ni transferencia.' });
    if (order.payVerified) return sendJson(res, 400, { error: 'Tu pago ya fue verificado.' });
    if (['cancelled', 'delivered'].includes(order.status)) return sendJson(res, 400, { error: 'Este pedido ya está cerrado.' });
    let body;
    try { body = await readJsonBody(req, Math.ceil(MAX_BYTES * 1.4) + 1024); } catch { return sendJson(res, 413, { error: 'La imagen es muy pesada. Usa una de hasta 2 MB.' }); }
    const image = decodeImage(body.image);
    if (!image) return sendJson(res, 400, { error: 'Adjunta una foto JPG, PNG o WEBP de hasta 2 MB.' });
    fs.mkdirSync(dir, { recursive: true });
    for (const { ext } of Object.values(TYPES)) fs.rmSync(path.join(dir, `${order.id}.${ext}`), { force: true });
    const tmp = path.join(dir, `${order.id}.${crypto.randomBytes(4).toString('hex')}.tmp`);
    fs.writeFileSync(tmp, image.buffer);
    fs.renameSync(tmp, path.join(dir, `${order.id}.${image.ext}`));
    await repos.orders.patch(order.id, { receipt: { type: image.type, uploadedAt: new Date().toISOString() } });
    return sendJson(res, 200, { ok: true, message: 'Recibimos tu constancia. Caja la revisará y confirmará tu pago.' });
  }

  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Método no permitido.' });
  if (!currentUser) return sendJson(res, 401, { error: 'Inicia sesión.' });
  const order = await repos.orders.getById(cleanId(view[1]));
  if (!order || !order.receipt) return sendJson(res, 404, { error: 'Este pedido no tiene constancia.' });
  if (!canAccessOrder(currentUser, order)) return sendJson(res, 403, { error: 'Caja solo puede consultar pedidos del día.' });
  const file = path.join(dir, `${order.id}.${TYPES[order.receipt.type].ext}`);
  if (!fs.existsSync(file)) return sendJson(res, 404, { error: 'No se encontró la imagen de la constancia.' });
  const content = fs.readFileSync(file);
  res.writeHead(200, { 'Content-Type': order.receipt.type, 'Content-Length': content.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'" });
  res.end(content);
  return true;
}

module.exports = { handleReceipts, decodeImage, validOrderToken };
