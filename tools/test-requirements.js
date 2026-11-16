// Pruebas de los requerimientos RFI-01..15 y RNF del backend. Usa copias temporales de datos: nunca toca data/.
// n8n se reemplaza por un servidor HTTP local que registra los eventos que recibe.
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const assert = require('node:assert/strict');
const { createApp } = require('./backend/app');

const root = path.resolve(__dirname, '..');
const silent = { log() {}, warn() {} };
const cleanup = [];

// Imagen JPEG mínima válida (firma FF D8 FF) para la constancia
const JPEG = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 0xff, 0xd9]).toString('base64');

async function startN8n({ fail = false } = {}) {
  const events = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      events.push({ token: req.headers['x-rtq-token'], ...JSON.parse(body) });
      res.writeHead(fail ? 500 : 200, { 'Content-Type': 'application/json' });
      res.end('{}');
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  cleanup.push(() => server.close());
  return { events, url: `http://127.0.0.1:${server.address().port}/webhook/rtq` };
}

async function startApp(env = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rtq-req-test-'));
  for (const name of ['catalog.db.json', 'store.config.json']) fs.copyFileSync(path.join(root, 'data', name), path.join(dataDir, name));
  const app = createApp({ dataDir, logger: silent, storage: 'json', env: { RTQ_N8N_TOKEN: 'secreto-n8n', RTQ_PUBLIC_URL: 'https://api.ejemplo.pe', ...env } });
  await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  cleanup.push(() => app.server.close(), () => fs.rmSync(dataDir, { recursive: true, force: true }));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const call = async (route, { method = 'GET', headers = {}, body } = {}) => {
    const res = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    let data = text; try { data = JSON.parse(text); } catch {}
    return { status: res.status, body: data, type: res.headers.get('content-type') };
  };
  const login = async username => {
    const res = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password: '1234' }) });
    return { Cookie: res.headers.get('set-cookie').split(';')[0] };
  };
  let n = 0;
  const order = (body, headers = {}) => call('/api/public/orders', { method: 'POST', headers: { 'Idempotency-Key': `clave-prueba-${Date.now()}-${n++}`, ...headers }, body });
  return { app, call, login, order, dataDir };
}

const baseCart = (extra = {}) => ({
  mode: 'delivery',
  address: 'Av. Bolognesi 450, Tacna',
  customer: { name: 'Lucía Prueba', phone: '912000111' },
  items: [{ productId: 'clasicos', presentationId: '10', qty: 2, details: 'Queso x10' }],
  ...extra,
});

async function run() {
  const n8n = await startN8n();
  const t = await startApp({ RTQ_N8N_WEBHOOK_URL: n8n.url });
  const admin = await t.login('administrador');

  // RFI-01: registro, inicio de sesión y sesión firmada
  const reg = await t.call('/api/customers/register', { method: 'POST', body: { email: 'Lucia@Correo.pe', password: 'clave123', name: 'Lucía Prueba', phone: '+51 912 000 111' } });
  assert.equal(reg.status, 201);
  assert.equal(reg.body.customer.email, 'lucia@correo.pe');
  assert.equal(reg.body.customer.phone, '912000111');
  assert.equal(reg.body.customer.passwordHash, undefined, 'La API nunca devuelve el hash de la contraseña');
  assert.equal((await t.call('/api/customers/register', { method: 'POST', body: { email: 'lucia@correo.pe', password: 'clave123', name: 'Lucía Prueba', phone: '912000111' } })).status, 400, 'Correo repetido');
  assert.match((await t.call('/api/customers/register', { method: 'POST', body: { email: 'x@y.pe', password: '1', name: 'Lu', phone: '1' } })).body.error, /contraseña/);
  assert.equal((await t.call('/api/customers/login', { method: 'POST', body: { email: 'lucia@correo.pe', password: 'mala' } })).status, 401);
  const session = await t.call('/api/customers/login', { method: 'POST', body: { email: 'lucia@correo.pe', password: 'clave123' } });
  assert.equal(session.status, 200);
  const me = { 'x-customer-token': session.body.token };
  assert.equal((await t.call('/api/customers/me', { headers: me })).body.customer.name, 'Lucía Prueba');
  assert.equal((await t.call('/api/customers/me', { headers: { 'x-customer-token': session.body.token.slice(0, -2) + '00' } })).status, 401, 'Token alterado');
  assert.ok(fs.existsSync(path.join(t.dataDir, 'customers.db.json')), 'Las cuentas persisten en disco');

  // RFI-06: direcciones con ubicación en el mapa
  const saved = await t.call('/api/customers/me', { method: 'PATCH', headers: me, body: { addresses: [{ label: 'Casa', address: 'Calle <b>Zela</b> 123', reference: 'Portón negro', lat: -18.0146, lng: -70.2536 }] } });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.customer.addresses[0].address, 'Calle bZela/b 123', 'RNF-04: se limpian las etiquetas');
  assert.equal(saved.body.customer.addresses[0].lat, -18.0146);
  assert.equal((await t.call('/api/customers/me', { method: 'PATCH', headers: me, body: { addresses: Array(6).fill({ address: 'Calle Uno 1' }) } })).status, 400, 'Máximo 5 direcciones');

  // RFI-07 y RFI-08: programación, método de pago y ubicación en el pedido
  assert.match((await t.order(baseCart({ payMethod: 'Bitcoin' }))).body.error, /método de pago/);
  assert.match((await t.order(baseCart({ payMethod: 'Yape', scheduledFor: new Date(Date.now() + 5 * 60000).toISOString() }))).body.error, /30 minutos/);
  assert.match((await t.order(baseCart({ payMethod: 'Yape', scheduledFor: new Date(Date.now() + 9 * 864e5).toISOString() }))).body.error, /7 días/);
  const when = new Date(Date.now() + 2 * 3600e3).toISOString();
  const created = await t.order(baseCart({ payMethod: 'Yape', scheduledFor: when, location: { lat: -18.0146, lng: -70.2536 }, total: 0.01 }), me);
  assert.equal(created.status, 201);
  assert.match(created.body.accessToken, /^[a-f0-9]{32}$/);
  assert.equal(created.body.total, 32, 'RNF-02: 2 x 16 del catálogo, el total del navegador se ignora');
  assert.match(created.body.whatsappText, /pago: Yape/);
  const code = created.body.code;
  let stored = (await t.call('/api/pedidos/' + code, { headers: admin })).body;
  assert.equal(stored.scheduledFor, when);
  assert.equal(stored.gps, 'https://maps.google.com/?q=-18.014600,-70.253600');
  assert.equal(stored.customerId, reg.body.customer.id);
  assert.equal(stored.accessTokenHash, undefined, 'El personal no recibe el hash del token');
  assert.deepEqual(stored.items[0].spec, { productId: 'clasicos', presentationId: '10', details: 'Queso x10' });

  // RFI-08 y RFI-13: constancia de pago, solo con el token del pedido; el personal la ve
  const upload = (headers, image = JPEG) => t.call(`/api/public/orders/${code}/receipt`, { method: 'POST', headers, body: { image } });
  assert.equal((await upload({})).status, 403, 'Sin token no se sube constancia');
  assert.equal((await upload({ 'x-order-token': 'f'.repeat(32) })).status, 403);
  assert.equal((await upload({ 'x-order-token': created.body.accessToken }, 'data:image/jpeg;base64,PHNjcmlwdD4=')).status, 400, 'Un archivo que no es imagen se rechaza');
  assert.equal((await upload({ 'x-order-token': created.body.accessToken })).status, 200);
  assert.equal((await t.call(`/api/pedidos/${code}/receipt`)).status, 401, 'La constancia no es pública');
  const receipt = await t.call(`/api/pedidos/${code}/receipt`, { headers: admin });
  assert.equal(receipt.status, 200); assert.equal(receipt.type, 'image/jpeg');

  // RFI-09: seguimiento público sin datos personales (RNF-03)
  const track = (await t.call('/api/pedidos/' + code)).body;
  assert.equal(track.status, 'pending_confirmation');
  assert.equal(track.hasReceipt, true);
  for (const field of ['customer', 'phone', 'address', 'reference', 'gps', 'customerId', 'accessTokenHash', 'dispatch']) assert.equal(track[field], undefined, `El seguimiento no expone ${field}`);

  // RFI-10: historial del cliente con lo necesario para repetir
  const history = (await t.call('/api/customers/me/orders', { headers: me })).body;
  assert.equal(history.length, 1); assert.equal(history[0].id, code); assert.equal(history[0].items[0].spec.productId, 'clasicos');
  assert.equal(history[0].phone, undefined);
  assert.equal((await t.call('/api/customers/me/orders')).status, 401);

  // RFI-13: Yape sin verificar no pasa a cocina; verificado sí
  await t.call('/api/pedidos/' + code, { method: 'PATCH', headers: admin, body: { status: 'new' } });
  assert.equal((await t.call('/api/pedidos/' + code, { method: 'PATCH', headers: admin, body: { status: 'kitchen' } })).status, 400);
  await t.call('/api/pedidos/' + code, { method: 'PATCH', headers: admin, body: { verifyPayment: true } });
  assert.equal((await t.call('/api/pedidos/' + code, { method: 'PATCH', headers: admin, body: { status: 'kitchen' } })).body.order.statusAt.kitchen.length > 0, true, 'Se registra la hora de cada estado');

  // RFI-14: motorizados y despacho por n8n
  assert.equal((await t.call('/api/drivers', { method: 'PUT', headers: await t.login('caja'), body: { drivers: [] } })).status, 403, 'Solo el administrador gestiona motorizados');
  assert.match((await t.call('/api/drivers', { method: 'PUT', headers: admin, body: { drivers: [{ name: 'Pepe', phone: '123' }] } })).body.error, /celular/);
  const drivers = await t.call('/api/drivers', { method: 'PUT', headers: admin, body: { drivers: [{ name: 'Pepe Moto', phone: '933111222' }, { name: 'Rosa Moto', phone: '944111222' }], dispatchAlertMinutes: 5 } });
  assert.equal(drivers.status, 200);
  const toDelivery = await t.call('/api/pedidos/' + code, { method: 'PATCH', headers: admin, body: { status: 'delivery' } });
  assert.equal(toDelivery.body.order.status, 'delivery');
  assert.equal(toDelivery.body.order.dispatch.status, 'offered');
  assert.equal(toDelivery.body.order.dispatch.takeTokenHash, undefined);
  const offer = n8n.events.find(e => e.event === 'dispatch.offered');
  assert.ok(offer, 'n8n recibe la oferta para el grupo');
  assert.equal(offer.token, 'secreto-n8n');
  assert.equal(offer.alertAfterMinutes, 5, 'RNF-06: alerta a los 5 minutos por defecto');
  for (const pii of ['Lucía', '912000111', 'Bolognesi']) assert.ok(!JSON.stringify(offer).includes(pii), `RNF-03: el mensaje al grupo no lleva ${pii}`);
  assert.match(offer.takeUrl, /^https:\/\/api\.ejemplo\.pe\/api\/dispatch\/take\?o=RTQ-/);

  // n8n consulta si alguien lo tomó (para alertar al operador)
  const statusPath = new URL(offer.statusUrl).pathname;
  assert.equal((await t.call(statusPath)).status, 401, 'La ruta interna exige el token de servicio');
  assert.equal((await t.call(statusPath, { headers: { 'x-rtq-token': 'secreto-n8n' } })).body.assigned, false);

  // El motorizado toma el pedido desde el enlace del grupo
  const take = new URL(offer.takeUrl).searchParams;
  assert.match((await t.call('/api/dispatch/take?o=' + take.get('o'))).body, /Tomar pedido/);
  assert.match((await t.call('/api/dispatch/take', { method: 'POST', body: { o: take.get('o'), t: take.get('t'), phone: '900000000' } })).body.error, /no está registrado/);
  const taken = await t.call('/api/dispatch/take', { method: 'POST', body: { o: take.get('o'), t: take.get('t'), phone: '933111222' } });
  assert.equal(taken.status, 200); assert.equal(taken.body.driver, 'Pepe Moto');
  assert.equal((await t.call('/api/dispatch/take', { method: 'POST', body: { o: take.get('o'), t: take.get('t'), phone: '944111222' } })).status, 400, 'El enlace sirve una sola vez');
  const assigned = n8n.events.find(e => e.event === 'dispatch.assigned');
  assert.equal(assigned.driver.phone, '51933111222', 'La comanda completa va solo al motorizado asignado');
  assert.match(assigned.text, /Bolognesi/);
  assert.equal((await t.call(statusPath, { headers: { 'x-rtq-token': 'secreto-n8n' } })).body.assigned, true);
  assert.equal((await t.call('/api/pedidos/' + code)).body.driverAssigned, true);

  // RNF-05: si n8n falla, el pedido igual avanza y queda para coordinar a mano
  const down = await startApp({ RTQ_N8N_WEBHOOK_URL: (await startN8n({ fail: true })).url });
  const downAdmin = await down.login('administrador');
  const cash = await down.call('/api/caja/pedidos', { method: 'POST', headers: downAdmin, body: { customer: 'Mario Caja', phone: '955111222', mode: 'delivery', payMethod: 'Efectivo', address: 'Jr. Zela 10', deliveryFee: 5, items: [{ productId: 'clasicos', qty: 1 }] } });
  const id = cash.body.order.id;
  await down.call('/api/pedidos/' + id, { method: 'PATCH', headers: downAdmin, body: { status: 'kitchen' } });
  const failed = await down.call('/api/pedidos/' + id, { method: 'PATCH', headers: downAdmin, body: { status: 'delivery' } });
  assert.equal(failed.status, 200); assert.equal(failed.body.order.status, 'delivery');
  assert.equal(failed.body.order.dispatch.status, 'failed'); assert.match(failed.body.order.dispatch.lastError, /n8n/);
  await down.call('/api/drivers', { method: 'PUT', headers: downAdmin, body: { drivers: [{ id: 'mot_1', name: 'Pepe Moto', phone: '933111222' }] } });
  const manual = await down.call(`/api/pedidos/${id}/dispatch`, { method: 'POST', headers: downAdmin, body: { driverId: 'mot_1', manual: true } });
  assert.equal(manual.body.order.dispatch.status, 'manual'); assert.equal(manual.body.order.dispatch.driverName, 'Pepe Moto');
  const reloaded = createApp({ dataDir: down.dataDir, logger: silent, storage: 'json' });
  assert.equal(reloaded.repos.orders.getById(id).dispatch.status, 'manual', 'El despacho manual persiste tras reiniciar');

  // RNF-02: el panel no puede fijar precios de productos del catálogo
  const panel = await t.call('/api/pedidos', { method: 'POST', headers: admin, body: { customer: 'Panel', items: [{ productId: 'clasicos', name: 'X', qty: 2, price: 0.01 }], total: 0.01 } });
  assert.equal(panel.body.order.subtotal, 32); assert.equal(panel.body.order.total, 32);

  // RNF-04: la configuración solo acepta campos conocidos y limpios
  assert.equal((await t.call('/api/config', { method: 'PATCH', headers: admin, body: { isAdmin: true } })).status, 400);
  assert.equal((await t.call('/api/config', { method: 'PATCH', headers: admin, body: { mapsUrl: 'javascript:alert(1)' } })).status, 400);
  assert.equal((await t.call('/api/config', { method: 'PATCH', headers: admin, body: { coupons: [{ code: 'X', type: 'percent', value: 500 }] } })).status, 400);
  const product = await t.call('/api/catalog', { method: 'POST', headers: admin, body: { id: 'nuevo-x', name: 'Nuevo <img>', icon: '<img src=x onerror=alert(1)>', price: 10 } });
  assert.ok(!/[<>"]/.test(product.body.product.icon + product.body.product.name), 'RNF-04: ícono y nombre sin etiquetas');

  // RNF-01: sin sesión no se ven ni cambian pedidos, pagos ni carta
  assert.equal((await t.call('/api/pedidos')).status, 401);
  assert.equal((await t.call('/api/pedidos/' + code, { method: 'PATCH', body: { verifyPayment: true } })).status, 401);
  assert.equal((await t.call('/api/catalog/clasicos/stock', { method: 'PATCH', body: { stock: false } })).status, 401);
  assert.equal((await t.call(`/api/pedidos/${code}/dispatch`, { method: 'POST', body: {} })).status, 401);
}

run()
  .then(() => console.log('Requerimientos: cuentas, direcciones, programación, pagos y constancia, seguimiento, historial, despacho n8n, tolerancia a fallos, montos y sanitización: PASS'))
  .catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => cleanup.reverse().forEach(fn => { try { fn(); } catch {} }));
