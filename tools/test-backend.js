// Pruebas del backend modular. Usa carpetas temporales: nunca modifica data/ del negocio.
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const assert = require('node:assert/strict');

const { prepareStorage } = require('./test-storage');
const root = path.resolve(__dirname, '..');
const realDataDir = path.join(root, 'data');
const hashDir = dir => Object.fromEntries(fs.readdirSync(dir).sort().map(name => {
  const file = path.join(dir, name);
  return [name, fs.statSync(file).isFile() ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : 'dir'];
}));
const realDataBefore = hashDir(realDataDir);
const tempDirs = [];
const makeTemp = () => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rtq-backend-test-')); tempDirs.push(dir); return dir; };
const silent = { log() {}, warn() {} };

// 1. Importar módulos no abre puertos ni escribe archivos
const { createApp, isAdminOnly } = require('./backend/app');
const { parseArgs } = require('./backend/config');
const { canAccessOrder } = require('./backend/auth');
const { sanitizeId, sanitizeString, sanitizeUrl } = require('./backend/sanitize');
const { DataFileError } = require('./backend/repositories/json-file');
assert.deepEqual(hashDir(realDataDir), realDataBefore, 'Importar módulos no debe tocar data/');

let server;
async function run() {
  // 2. Configuración: mismos argumentos que la versión monolítica
  assert.deepEqual(parseArgs([], {}), { port: 3000, bindAll: false, adminPin: '2026', legacyPinEnabled: false });
  assert.deepEqual(parseArgs(['--port', '4000', '-Lan', '--pin', '9999'], {}), { port: 4000, bindAll: true, adminPin: '9999', legacyPinEnabled: true });
  assert.deepEqual(parseArgs(['-p', 'x'], { RTQ_ADMIN_PIN: '7777' }), { port: 3000, bindAll: false, adminPin: '7777', legacyPinEnabled: true });

  // 3. Utilidades puras
  assert.equal(sanitizeId("RTQ-1');<x>"), 'RTQ-1x');
  assert.equal(sanitizeString(' <b>hola</b> '), 'bhola/b');
  assert.equal(sanitizeUrl('javascript:alert(1)'), '');
  assert.ok(isAdminOnly('/api/users', 'GET') && isAdminOnly('/api/catalog', 'POST') && !isAdminOnly('/api/catalog', 'GET'));
  assert.ok(canAccessOrder({ role: 'admin' }, {}));
  assert.ok(!canAccessOrder({ role: 'cashier' }, {}));
  assert.ok(canAccessOrder({ role: 'cashier' }, { createdAt: new Date().toISOString() }));

  // 4. Crear la aplicación con un directorio de datos temporal y sin escuchar
  const dataDir = makeTemp();
  for (const name of ['catalog.db.json', 'store.config.json']) fs.copyFileSync(path.join(realDataDir, name), path.join(dataDir, name));
  await prepareStorage(dataDir);
  const app = createApp({ dataDir, logger: silent });
  assert.equal(app.server.listening, false, 'createApp no debe abrir puertos');
  assert.deepEqual(fs.readdirSync(dataDir).sort(), ['catalog.db.json', 'orders.db.json', 'store.config.json', 'users.db.json']);
  assert.deepEqual(hashDir(realDataDir), realDataBefore, 'createApp con dataDir temporal no debe tocar data/');

  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  server = app.server;
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (route, options = {}) => {
    const res = await fetch(base + route, options);
    const text = await res.text();
    let body = text; try { body = JSON.parse(text); } catch (e) {}
    return { status: res.status, headers: res.headers, body };
  };
  const json = (method, headers, body) => ({ method, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const login = async (username, password) => {
    const res = await request('/api/auth/login', json('POST', {}, { username, password }));
    return { res, headers: res.status === 200 ? { Cookie: res.headers.get('set-cookie').split(';')[0] } : {} };
  };

  // 5. HTTP base y CORS
  const preflight = await request('/api/catalog', { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173' } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.match(preflight.headers.get('access-control-allow-methods'), /DELETE/);
  assert.equal((await request('/api/config')).body.whatsappInternational, '51912266950');
  assert.ok((await request('/api/catalog')).body.length > 0);

  // 6. Autenticación: usuarios, PIN heredado desactivado por defecto, verify y logout
  assert.equal((await request('/api/auth/login', json('POST', {}, { pin: '2026' }))).status, 401);
  const admin = await login('administrador', '1234');
  const cashier = await login('caja', '1234');
  assert.equal(admin.res.status, 200); assert.equal(admin.res.body.user.role, 'admin');
  assert.equal(cashier.res.status, 200); assert.equal(cashier.res.body.user.role, 'cashier');
  assert.match(admin.res.headers.get('set-cookie'), /HttpOnly/);
  assert.equal((await request('/api/auth/verify', { headers: { Authorization: `Bearer ${admin.res.body.token}` } })).body.authenticated, true);

  // 7. Permisos de administrador y reportes
  assert.equal((await request('/api/reports')).status, 401);
  assert.equal((await request('/api/reports', { headers: cashier.headers })).status, 403);
  assert.equal((await request('/api/reports', { headers: admin.headers })).status, 200);
  const exported = await request('/api/reports/export?type=orders&records=all', { headers: admin.headers });
  assert.equal(exported.status, 200); assert.match(exported.headers.get('content-disposition'), /attachment.*\.csv/);
  assert.equal((await request('/api/reports', { method: 'POST', headers: admin.headers })).status, 405);
  assert.equal((await request('/api/users', { headers: cashier.headers })).status, 403);

  // 8. Caja: precios desde el catálogo y flujo de estados
  const product = (await request('/api/catalog')).body.find(item => item.stock !== false);
  const cajaOrder = await request('/api/caja/pedidos', json('POST', cashier.headers, { customer: 'Prueba', mode: 'pickup', payMethod: 'Yape', total: 0.01, items: [{ productId: product.id, qty: 2, price: 0.01 }] }));
  assert.equal(cajaOrder.status, 201);
  assert.equal(cajaOrder.body.order.total, 2 * (product.promo ?? product.price));
  const id = cajaOrder.body.order.id;
  assert.equal((await request('/api/pedidos/' + id, json('PATCH', cashier.headers, { status: 'kitchen' }))).status, 400, 'Pago Yape sin verificar no pasa a cocina');
  assert.equal((await request('/api/pedidos/' + id, json('PATCH', cashier.headers, { verifyPayment: true }))).status, 200);
  assert.equal((await request('/api/pedidos/' + id, json('PATCH', cashier.headers, { status: 'kitchen' }))).body.order.status, 'kitchen');
  assert.equal((await request('/api/pedidos/' + id, json('PATCH', cashier.headers, { status: 'new' }))).status, 400);
  assert.equal((await request('/api/pedidos/' + id)).body.customer, undefined, 'La consulta pública no expone datos personales');
  assert.equal((await request('/api/pedidos/' + id, json('PATCH', {}, { status: 'delivered' }))).status, 401);
  assert.equal((await request('/api/pedidos')).status, 401);

  // 9. Admisión: POST /api/pedidos exige sesión de administrador y el servidor fija estado, pago y autoría
  const forged = { id: 'RTQ-PANEL', status: 'delivered', payVerified: true, createdBy: 'otro', channel: 'caja', createdAt: '2000-01-01', items: [{ name: 'X', qty: 1, price: 1 }] };
  assert.equal((await request('/api/pedidos', json('POST', {}, forged))).status, 401);
  assert.equal((await request('/api/pedidos', json('POST', cashier.headers, forged))).status, 403);
  const panelOrder = await request('/api/pedidos', json('POST', admin.headers, forged));
  assert.equal(panelOrder.status, 201);
  assert.equal(panelOrder.body.order.status, 'new');
  assert.equal(panelOrder.body.order.payVerified, false);
  assert.equal(panelOrder.body.order.createdBy, 'administrador');
  assert.equal(panelOrder.body.order.channel, 'app');
  assert.ok(panelOrder.body.order.createdAt.startsWith(new Date().toISOString().slice(0, 4)));
  const before = (await request('/api/pedidos/RTQ-PANEL', { headers: admin.headers })).body;
  assert.equal((await request('/api/pedidos', json('POST', admin.headers, { id: 'RTQ-PANEL', customer: 'Reemplazo' }))).status, 409);
  assert.deepEqual((await request('/api/pedidos/RTQ-PANEL', { headers: admin.headers })).body, before, 'Un id repetido no reemplaza el pedido');
  // Un id que no es texto o queda vacío recibe un id único del servidor
  for (const badId of [7, null, "');<>", undefined]) {
    const created = await request('/api/pedidos', json('POST', admin.headers, { id: badId, items: [] }));
    assert.equal(created.status, 201); assert.match(created.body.order.id, /^RTQ-[0-9A-F]{12}$/);
  }
  assert.equal((await request('/api/pedidos', json('POST', admin.headers, [1, 2]))).status, 400);
  if (process.env.RTQ_STORAGE === 'postgres') await assert.rejects(app.repos.orders.insert({ id: 'RTQ-PANEL' }), /ya existe/);
  else assert.throws(() => app.repos.orders.insert({ id: 'RTQ-PANEL' }), /ya existe/);

  // 10. Métodos no contemplados siguen cayendo al servidor estático, como antes
  const fallThrough = await request('/api/pedidos', { method: 'PUT' });
  assert.equal(fallThrough.status, 404); assert.match(fallThrough.body, /404 No encontrado/);

  // 11. Estáticos del panel y protección de rutas
  const adminPage = await request('/admin');
  assert.equal(adminPage.status, 200); assert.match(adminPage.headers.get('content-type'), /text\/html/);
  const traversal = await request('/..%2f..%2fdata%2fusers.db.json');
  assert.notEqual(traversal.status, 200);

  // 12. Robustez: una URL mal codificada o un error interno no detienen el servidor
  const malformed = await request('/%E0%A4%A');
  assert.equal(malformed.status, 400);
  const originalGetAll = app.repos.catalog.getAll;
  app.repos.catalog.getAll = () => { throw new Error('fallo simulado'); };
  const failure = await request('/api/catalog');
  app.repos.catalog.getAll = originalGetAll;
  assert.equal(failure.status, 500);
  assert.equal(failure.body.error, 'Error interno del servidor.', 'No se exponen detalles internos');
  assert.equal((await request('/api/config')).status, 200, 'El servidor sigue respondiendo');

  // 13. Cierre de sesión
  assert.equal((await request('/api/auth/logout', { method: 'POST', headers: admin.headers })).status, 200);
  assert.equal((await request('/api/pedidos', { headers: admin.headers })).status, 401);
  await new Promise(resolve => server.close(resolve)); server = null;

  // 14. PIN heredado solo si se habilita expresamente; instancias con estado independiente
  const pinDir = makeTemp();
  for (const name of ['catalog.db.json', 'store.config.json']) fs.copyFileSync(path.join(realDataDir, name), path.join(pinDir, name));
  await prepareStorage(pinDir);
  const pinApp = createApp({ dataDir: pinDir, legacyPinEnabled: true, adminPin: '4321', logger: silent });
  await new Promise(resolve => pinApp.server.listen(0, '127.0.0.1', resolve));
  server = pinApp.server;
  const pinRes = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/login`, json('POST', {}, { pin: '4321' }));
  assert.equal(pinRes.status, 200);
  assert.equal(await app.auth.isValidSession((await pinRes.json()).token), false, 'Las sesiones no se comparten entre instancias');
  await new Promise(resolve => server.close(resolve)); server = null;

  // 15. Un archivo de datos ilegible detiene el arranque y queda intacto; uno ausente se crea como antes
  const unreadable = [
    ['orders.db.json', '{ ilegible'], ['orders.db.json', '{"no":"es lista"}'],
    ['catalog.db.json', '[ incompleto'], ['catalog.db.json', '{}'],
    ['store.config.json', 'no json'], ['store.config.json', '[]']
  ];
  for (const [name, content] of unreadable) {
    const corruptDir = makeTemp();
    fs.writeFileSync(path.join(corruptDir, name), content);
    assert.throws(() => createApp({ dataDir: corruptDir, storage: 'json', logger: silent }), DataFileError, `${name} ilegible debe detener el arranque`);
    assert.equal(fs.readFileSync(path.join(corruptDir, name), 'utf8'), content, `${name} no debe modificarse`);
  }
  const freshApp = createApp({ dataDir: makeTemp(), storage: 'json', logger: silent });
  assert.deepEqual(freshApp.repos.orders.getAll().map(order => order.id), ['RTQ-2064', 'RTQ-2181', 'RTQ-2052']);
  assert.deepEqual(freshApp.repos.catalog.getAll(), []);
  assert.deepEqual(freshApp.repos.config.get(), {});

  assert.deepEqual(hashDir(realDataDir), realDataBefore, 'Las pruebas no deben tocar data/');
  console.log('Backend modular: importación sin efectos, configuración, HTTP, autenticación, caja, reportes, estáticos, admisión de pedidos y datos ilegibles: PASS');
}

run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  for (const dir of tempDirs) {
    const resolved = path.resolve(dir);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('rtq-backend-test-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});
