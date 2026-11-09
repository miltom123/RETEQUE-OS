// Pruebas de la cotización con precios del servidor. Usa una copia temporal: nunca modifica data/.
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('node:assert/strict');
const { quoteCart, QuoteError } = require('./backend/pricing');
const { createApp } = require('./backend/app');

const root = path.resolve(__dirname, '..');
const products = JSON.parse(fs.readFileSync(path.join(root, 'data', 'catalog.db.json'), 'utf8'));
const coupons = JSON.parse(fs.readFileSync(path.join(root, 'data', 'store.config.json'), 'utf8')).coupons;
const quote = (items, extra = {}) => quoteCart({ items, mode: 'pickup', ...extra }, { products, coupons });
const rejects = (items, pattern, extra) => assert.throws(() => quote(items, extra), err => err instanceof QuoteError && pattern.test(err.message));

// 1. Precios desde el catálogo del servidor
assert.equal(quote([{ productId: 'clasicos', qty: 1 }]).total, 16, '10 unidades usa el precio del producto');
const twenty = quote([{ productId: 'clasicos', presentationId: '20', qty: 2, extras: { 'mayonesa-ajo': 2 } }]);
assert.equal(twenty.items[0].unitPrice, 31);
assert.equal(twenty.total, 62);
assert.equal(twenty.items[0].name, 'Tequeños de queso — 20 unid.');
assert.match(twenty.items[0].summary, /2 x Mayonesa de ajo/);
assert.equal(quote([{ productId: 'chicha', presentationId: '1l', qty: 1 }]).total, 15);
assert.equal(quote([{ productId: 'limonada', presentationId: 'medio', qty: 1 }]).total, 8);
assert.equal(quote([{ productId: 'pizza-americana', qty: 1, extras: { 'ad-maiz': 2 } }]).total, 41);
assert.equal(quote([{ productId: 'promo-solo', qty: 1 }]).items[0].drink.id, 'inka-cola-600', 'La bebida por defecto es la primera');
assert.equal(quote([{ productId: 'promo-solo', qty: 1, drinkId: 'pepsi-1l' }]).total, 21.9);
const withAddons = quote([{ productId: 'promo-extra', qty: 1, addons: [{ productId: 'clasicos', presentationId: '10', qty: 1 }, { productId: 'pastel-queso', qty: 1 }] }]);
assert.equal(withAddons.total, 52.4);
assert.match(withAddons.items[0].summary, /\+ 1 x Pastelito de queso/);
assert.equal(quote([{ productId: 'promo-solo', qty: 3 }]).total, 59.7, 'Sin errores de coma flotante');
assert.equal(quote([{ productId: 'clasicos', qty: 1, unitPrice: 0.01, price: 0.01 }]).total, 16, 'Se ignora el precio del navegador');
assert.equal(quote([{ productId: 'clasicos', qty: 1, details: '<b>10 queso</b>' }]).items[0].details, 'b10 queso/b');

// 2. El precio editado en el panel mueve la presentación base, no la de 20
const edited = products.map(p => (p.id === 'clasicos' ? { ...p, price: 16.5 } : p));
const editedQuote = items => quoteCart({ items, mode: 'pickup' }, { products: edited, coupons });
assert.equal(editedQuote([{ productId: 'clasicos', qty: 1 }]).total, 16.5);
assert.equal(editedQuote([{ productId: 'clasicos', presentationId: '20', qty: 1 }]).total, 27);

// 3. Errores con mensajes para el cliente
rejects([], /vacío/);
rejects([{ productId: 'no-existe', qty: 1 }], /ya no está en la carta/);
rejects([{ productId: 'clasicos', presentationId: '40', qty: 1 }], /tamaño válido/);
rejects([{ productId: 'clasicos', qty: 1, extras: { inventado: 1 } }], /agregado/);
rejects([{ productId: 'clasicos', qty: 1, extras: { 'mayonesa-ajo': 11 } }], /hasta 10/);
rejects([{ productId: 'promo-solo', qty: 1, drinkId: 'champagne' }], /bebida válida/);
for (const qty of [0, 51, 1.5, '2', null]) rejects([{ productId: 'clasicos', qty }], /cantidad/);
rejects(Array.from({ length: 51 }, () => ({ productId: 'agua', qty: 1 })), /hasta 50/);
rejects([{ productId: 'clasicos', qty: 1 }], /delivery o recojo/, { mode: 'avion' });
const soldOut = products.map(p => (p.id === 'agua' ? { ...p, stock: false } : p));
assert.throws(() => quoteCart({ items: [{ productId: 'agua', qty: 1 }] }, { products: soldOut, coupons }), /agotado/);
assert.throws(() => quoteCart({ items: [{ productId: 'promo-solo', qty: 1, addons: [{ productId: 'agua', qty: 1 }] }] }, { products: soldOut, coupons }), /agotado/);

// 4. Cupones con la misma regla que tenía la web
assert.equal(quote([{ productId: 'clasicos', presentationId: '20', qty: 1 }], { couponCode: 'rete10' }).discount, 2.7);
assert.equal(quote([{ productId: 'clasicos', presentationId: '20', qty: 1 }], { couponCode: 'BIENVENIDO10' }).total, 22);
const below = quote([{ productId: 'clasicos', qty: 1 }], { couponCode: 'RETE10' });
assert.equal(below.discount, 0); assert.equal(below.coupon.applied, false); assert.match(below.coupon.message, /mínimo de S\/ 20.00/);
assert.match(quote([{ productId: 'clasicos', qty: 1 }], { couponCode: 'NOEXISTE' }).coupon.message, /no es válido/);
const inactive = coupons.map(c => ({ ...c, active: false }));
assert.equal(quoteCart({ items: [{ productId: 'promo-familiar', qty: 1 }], couponCode: 'RETE10' }, { products, coupons: inactive }).discount, 0);
assert.equal(quote([{ productId: 'promo-solo', qty: 1 }]).coupon, null);
assert.equal(quote([{ productId: 'clasicos', qty: 1 }], { mode: 'delivery' }).deliveryNote, 'El costo del delivery se coordina por WhatsApp.');

// 5. Ruta HTTP y configuración pública sin cupones
const tempDirs = [];
let server;
async function http() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rtq-pricing-test-'));
  tempDirs.push(dataDir);
  for (const name of ['catalog.db.json', 'store.config.json']) fs.copyFileSync(path.join(root, 'data', name), path.join(dataDir, name));
  const app = createApp({ dataDir, logger: { log() {}, warn() {} } });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  server = app.server;
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (route, body, headers = {}) => fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });

  const ok = await post('/api/public/quote', { mode: 'delivery', couponCode: 'RETE10', items: [{ productId: 'promo-familiar', qty: 1, drinkId: 'chicha-morada' }] });
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.equal(body.subtotal, 66.9); assert.equal(body.discount, 6.69); assert.equal(body.total, 60.21);
  const bad = await post('/api/public/quote', { items: [{ productId: 'no-existe', qty: 1 }] });
  assert.equal(bad.status, 400); assert.match((await bad.json()).error, /ya no está en la carta/);
  assert.equal((await post('/api/public/quote', '{roto')).status, 400);
  assert.equal((await fetch(base + '/api/public/quote')).status, 405);

  assert.equal((await (await fetch(base + '/api/config')).json()).coupons, undefined, 'El público no ve los cupones');
  const login = await post('/api/auth/login', { username: 'administrador', password: '1234' });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  assert.equal((await (await fetch(base + '/api/config', { headers: { Cookie: cookie } })).json()).coupons.length, 5, 'El administrador sí los ve');
  assert.equal(JSON.parse(fs.readFileSync(path.join(dataDir, 'store.config.json'), 'utf8')).coupons.length, 5);
}

http().then(() => {
  console.log('Cotización: precios del servidor, tamaños, extras, bebidas, agregados, errores, cupones y ruta pública: PASS');
}).catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  for (const dir of tempDirs) {
    const resolved = path.resolve(dir);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('rtq-pricing-test-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});
