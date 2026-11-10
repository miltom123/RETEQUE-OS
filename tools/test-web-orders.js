// Pruebas del pedido web por confirmar. Cada grupo usa su propia copia temporal de datos: nunca modifica data/.
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('node:assert/strict');
const { createApp } = require('./backend/app');

const root = path.resolve(__dirname, '..');
const tempDirs = [];
const servers = [];
const silent = { log() {}, warn() {} };

async function startApp() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rtq-web-orders-test-'));
  tempDirs.push(dataDir);
  for (const name of ['catalog.db.json', 'store.config.json']) fs.copyFileSync(path.join(root, 'data', name), path.join(dataDir, name));
  const app = createApp({ dataDir, logger: silent });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  servers.push(app.server);
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const call = async (route, options = {}) => {
    const res = await fetch(base + route, options);
    const text = await res.text();
    let body = text; try { body = JSON.parse(text); } catch (e) {}
    return { status: res.status, body };
  };
  const order = (body, key = `clave-${Math.random().toString(36).slice(2)}-prueba`) => call('/api/public/orders', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) }, body: JSON.stringify(body),
  });
  const login = async username => {
    const res = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password: '1234' }) });
    return { Cookie: res.headers.get('set-cookie').split(';')[0], 'Content-Type': 'application/json' };
  };
  return { app, call, order, login };
}

const cart = (extra = {}) => ({
  mode: 'pickup',
  customer: { name: 'Ana Prueba', phone: '+51 912 345 678' },
  items: [{ productId: 'clasicos', presentationId: '20', qty: 1, extras: { 'mayonesa-ajo': 1 }, details: '10 queso, 10 jamón', unitPrice: 0.01 }],
  ...extra,
});

async function run() {
  // 1. Creación, idempotencia y validaciones. Celular único: con PostgreSQL la base se comparte entre suites
  const a = await startApp();
  const uniquePhone = '9' + String(Date.now()).slice(-8);
  const cartA = (extra = {}) => cart({ customer: { name: 'Ana Prueba', phone: uniquePhone }, ...extra });
  assert.equal((await a.order(cartA(), null)).status, 400, 'Sin clave de idempotencia no se crea el pedido');
  const created = await a.order(cartA({ couponCode: 'BIENVENIDO10' }), 'clave-fija-0001');
  assert.equal(created.status, 201);
  assert.match(created.body.code, /^RTQ-[0-9A-F]{12}$/);
  assert.equal(created.body.status, 'pending_confirmation');
  assert.equal(created.body.total, 24, '27 + 2 de crema - 5 del cupón; el precio del navegador se ignora');
  assert.match(created.body.whatsappUrl, new RegExp(`^https://wa\\.me/51912266950\\?text=.*${created.body.code}`));
  const again = await a.order(cartA({ couponCode: 'BIENVENIDO10' }), 'clave-fija-0001');
  assert.equal(again.status, 201); assert.equal(again.body.code, created.body.code, 'Un reintento devuelve el mismo pedido');
  assert.equal((await a.order(cartA({ notes: 'otro' }), 'clave-fija-0001')).status, 409, 'La clave no sirve para otro pedido');
  const [p1, p2] = await Promise.all([a.order(cartA(), 'clave-doble-clic'), a.order(cartA(), 'clave-doble-clic')]);
  assert.equal(p1.body.code, p2.body.code, 'Dos envíos simultáneos crean un solo pedido');
  assert.match((await a.order(cartA({ customer: { name: 'Ana', phone: '12345' } }))).body.error, /celular válido/);
  assert.match((await a.order(cartA({ mode: 'delivery' }))).body.error, /dirección/);
  assert.match((await a.order(cartA({ items: [{ productId: 'no-existe', qty: 1 }] }))).body.error, /ya no está en la carta/);
  const forged = await a.order(cartA({ status: 'delivered', payVerified: true, channel: 'caja', total: 1, createdBy: 'administrador' }));
  assert.equal(forged.status, 201);
  const admin = await a.login('administrador');
  const stored = (await a.call('/api/pedidos', { headers: admin })).body;
  const web = stored.filter(o => o.channel === 'web' && o.phone === uniquePhone);
  assert.equal(web.length, 3, 'Solo tres pedidos creados: el reintento y el doble clic no duplican');
  const saved = stored.find(o => o.id === created.body.code);
  assert.equal(saved.status, 'pending_confirmation'); assert.equal(saved.payVerified, false); assert.equal(saved.createdBy, null);
  assert.equal(saved.phone, uniquePhone); assert.equal(saved.payMethod, 'Por coordinar'); assert.match(saved.notes, /Cupón BIENVENIDO10/);
  assert.equal(saved.items[0].price, 29); assert.match(saved.items[0].sauces, /1 x Mayonesa de ajo · 10 queso, 10 jamón/);
  const forgedSaved = stored.find(o => o.id === forged.body.code);
  assert.equal(forgedSaved.status, 'pending_confirmation'); assert.equal(forgedSaved.payVerified, false); assert.equal(forgedSaved.total, 29);

  // 2. Caja confirma o cancela; los reportes y el seguimiento público
  const b = await startApp();
  const cashier = await b.login('caja');
  const adminB = await b.login('administrador');
  const reportOrders = async () => (await b.call('/api/reports?records=all', { headers: adminB })).body.summary.orders;
  const ordersBefore = await reportOrders();
  const toConfirm = (await b.order(cart())).body.code;
  const toCancel = (await b.order(cart({ customer: { name: 'Luis Prueba', phone: '987654321' } }))).body.code;
  assert.equal(await reportOrders(), ordersBefore, 'Un pedido por confirmar no cuenta en los reportes');
  const tracking = await b.call('/api/pedidos/' + toConfirm);
  assert.equal(tracking.body.status, 'pending_confirmation'); assert.equal(tracking.body.customer, undefined, 'El seguimiento público no expone datos personales');
  const patch = (id, body, headers = cashier) => b.call('/api/pedidos/' + id, { method: 'PATCH', headers, body: JSON.stringify(body) });
  assert.equal((await patch(toConfirm, { status: 'kitchen' })).status, 400, 'Caja no salta la confirmación');
  assert.equal((await patch(toConfirm, { status: 'new' })).body.order.status, 'new');
  assert.equal((await patch(toConfirm, { status: 'kitchen' })).status, 200);
  assert.equal(await reportOrders(), ordersBefore + 1, 'Confirmado, ya cuenta');
  const cancelled = (await patch(toCancel, { status: 'cancelled' })).body.order;
  assert.equal(cancelled.status, 'cancelled'); assert.equal(cancelled.time, 'Cancelado');
  assert.equal((await patch(toCancel, { status: 'new' })).status, 400, 'Caja no reabre un pedido cancelado');

  // 3. Límite por celular
  const c = await startApp();
  const results = [];
  for (let i = 0; i < 6; i++) results.push((await c.order(cart({ customer: { name: 'Mismo Celular', phone: '955555555' } }))).status);
  assert.deepEqual(results, [201, 201, 201, 201, 201, 429]);

  console.log('Pedido web: código, idempotencia, validaciones, campos forzados, confirmación de caja, reportes y límites: PASS');
}

run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  for (const server of servers) await new Promise(resolve => server.close(resolve));
  for (const dir of tempDirs) {
    const resolved = path.resolve(dir);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('rtq-web-orders-test-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});
