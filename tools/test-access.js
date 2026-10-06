// Ejecuta las pruebas en una copia temporal: nunca modifica pedidos del negocio.
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rtq-access-test-'));
let server;
async function request(route, options = {}) {
  const res = await fetch(`http://127.0.0.1:3099${route}`, options);
  return { status: res.status, body: await res.json(), cookie: res.headers.get('set-cookie') };
}
async function run() {
  for (const folder of ['tools', 'data', 'app']) fs.cpSync(path.join(root, folder), path.join(tempRoot, folder), { recursive: true });
  fs.cpSync(path.join(root, 'web', 'src'), path.join(tempRoot, 'web', 'src'), { recursive: true });
  fs.copyFileSync(path.join(root, 'Iniciar app (celular).cmd'), path.join(tempRoot, 'Iniciar app (celular).cmd'));
  const oldSuite = spawnSync(process.execPath, [path.join(tempRoot, 'tools', 'test-system.js')], { encoding: 'utf8', timeout: 30000 });
  console.log(oldSuite.stdout); if (oldSuite.stderr) console.error(oldSuite.stderr);
  assert.equal(oldSuite.status, 0, 'La suite existente debe pasar');
  const env = { ...process.env }; delete env.RTQ_ADMIN_PIN;
  const ordersFile = path.join(tempRoot, 'data', 'orders.db.json');
  const testOrders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
  testOrders.push({ ...testOrders[0], id: 'RTQ-OLD', createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() });
  fs.writeFileSync(ordersFile, JSON.stringify(testOrders));
  server = spawn(process.execPath, [path.join(tempRoot, 'tools', 'server.js'), '--port', '3099'], { env, stdio: 'ignore' });
  for (let attempt = 0; attempt < 30; attempt++) {
    try { await request('/api/auth/verify'); break; } catch (e) { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  const login = body => request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await request('/api/pedidos')).status, 401);
  assert.equal((await login({ pin: '2026' })).status, 401);
  assert.equal((await login({ username: 'desconocido', password: '1234' })).status, 401);
  assert.equal((await login({ username: 'administrador', password: 'incorrecta' })).status, 401);
  for (const [username, role] of [['administrador', 'admin'], ['caja', 'cashier']]) {
    const result = await login({ username, password: '1234' });
    assert.equal(result.status, 200); assert.equal(result.body.user.role, role);
    assert.match(result.cookie, /HttpOnly/);
    const headers = { Cookie: result.cookie.split(';')[0] };
    assert.equal((await request('/api/auth/verify', { headers })).body.user.role, role);
    const orders = await request('/api/pedidos', { headers });
    assert.equal(orders.status, 200); assert.ok(Array.isArray(orders.body));
    assert.equal((await request('/api/auth/logout', { method: 'POST', headers })).status, 200);
    assert.equal((await request('/api/pedidos', { headers })).status, 401);
  }
  const adminLogin = await login({ username: 'administrador', password: '1234' });
  const cashierLogin = await login({ username: 'caja', password: '1234' });
  const adminHeaders = { Cookie: adminLogin.cookie.split(';')[0], 'Content-Type': 'application/json' };
  const cashHeaders = { Cookie: cashierLogin.cookie.split(';')[0], 'Content-Type': 'application/json' };
  assert.equal((await request('/api/reports')).status, 401);
  assert.equal((await request('/api/reports', { headers: cashHeaders })).status, 403);
  assert.equal((await request('/api/reports/export?type=json', { headers: cashHeaders })).status, 403);
  assert.equal((await request('/api/reports', { headers: adminHeaders })).status, 200);
  assert.equal((await request('/api/reports?from=2026-02-30', { headers: adminHeaders })).status, 400);
  assert.equal((await request('/api/reports/export?type=json', { headers: adminHeaders })).status, 200);
  const reportCsv = await fetch('http://localhost:3099/api/reports/export?type=orders&records=all', { headers: adminHeaders });
  assert.equal(reportCsv.status, 200);
  assert.match(reportCsv.headers.get('content-disposition'), /attachment.*\.csv/);
  assert.ok((await reportCsv.text()).includes('RTQ-OLD'));
  const mutate = (route, headers, body, method = 'POST') => request(route, { method, headers, body: JSON.stringify(body) });
  assert.equal((await request('/api/users', { headers: cashHeaders })).status, 403);
  assert.equal((await mutate('/api/users', cashHeaders, { username: 'intruso', name: 'No autorizado', password: '1234' })).status, 403);
  assert.equal((await mutate('/api/config', cashHeaders, {}, 'PATCH')).status, 403);
  assert.equal((await mutate('/api/catalog', cashHeaders, {})).status, 403);
  assert.equal((await mutate('/api/catalog/clasicos/stock', cashHeaders, {stock:false}, 'PATCH')).status, 403);
  assert.equal((await request('/api/pedidos?scope=all', { headers: cashHeaders })).status, 403);
  assert.equal((await request('/api/pedidos/RTQ-2064', { headers: cashHeaders })).status, 403);
  assert.equal((await request('/api/pedidos/RTQ-OLD', { headers: cashHeaders })).status, 403);
  assert.equal((await mutate('/api/pedidos/RTQ-OLD', cashHeaders, { status: 'kitchen' }, 'PATCH')).status, 403);
  assert.equal((await request('/api/pedidos/RTQ-OLD', { headers: adminHeaders })).status, 200);
  assert.equal((await mutate('/api/pedidos/RTQ-2064', cashHeaders, {verifyPayment:true}, 'PATCH')).status, 403);
  const today = await request('/api/pedidos', { headers: cashHeaders });
  assert.ok(!today.body.some(order => order.id === 'RTQ-2064'), 'Los pedidos sin fecha no se exponen a caja');
  assert.ok(!today.body.some(order => order.id === 'RTQ-OLD'), 'Los pedidos antiguos no se exponen a caja');
  const catalog = await request('/api/catalog');
  const product = catalog.body.find(product => product.stock !== false);
  const orderPayload = { customer: 'Prueba caja', mode: 'pickup', payMethod: 'Yape', deliveryFee: 99, total: 0.01, createdAt:'2000-01-01', items:[{productId:product.id,qty:2,price:0.01}] };
  assert.equal((await mutate('/api/caja/pedidos', {}, orderPayload)).status, 401);
  const createdOrder = await mutate('/api/caja/pedidos', cashHeaders, orderPayload);
  assert.equal(createdOrder.status, 201);
  assert.equal(createdOrder.body.order.total, 2 * (product.promo ?? product.price));
  assert.equal(createdOrder.body.order.createdBy, 'caja');
  assert.equal(createdOrder.body.order.deliveryFee, 0);
  assert.ok(createdOrder.body.order.createdAt.startsWith(new Date().toISOString().slice(0,10)));
  const id = createdOrder.body.order.id;
  assert.equal((await request('/api/pedidos/' + id, { headers: cashHeaders })).status, 200);
  assert.equal((await mutate('/api/pedidos/' + id, cashHeaders, {status:'kitchen'}, 'PATCH')).status, 400);
  assert.equal((await mutate('/api/pedidos/' + id, cashHeaders, {verifyPayment:true}, 'PATCH')).status, 200);
  assert.equal((await mutate('/api/pedidos/' + id, cashHeaders, {status:'kitchen'}, 'PATCH')).status, 200);
  assert.equal((await mutate('/api/pedidos/' + id, cashHeaders, {status:'delivered'}, 'PATCH')).status, 200);
  assert.equal((await mutate('/api/pedidos/' + id, cashHeaders, {status:'new'}, 'PATCH')).status, 400);
  assert.equal((await mutate('/api/pedidos', cashHeaders, {id:'BYPASS',items:[]})).status, 403);
  assert.equal((await mutate('/api/users', adminHeaders, {username:'caja_test',name:'Caja prueba',password:'5678',role:'admin'})).status, 400);
  const added = await mutate('/api/users', adminHeaders, {username:'caja_test',name:'Caja prueba',password:'5678'});
  assert.equal(added.status, 201); assert.equal(added.body.user.role, 'cashier');
  assert.equal((await mutate('/api/users', adminHeaders, {username:'caja_test',name:'Duplicado',password:'5678'})).status, 400);
  const listing = await request('/api/users', {headers:adminHeaders});
  assert.ok(listing.body.every(user => !user.passwordHash && !user.salt));
  const storedUsers = fs.readFileSync(path.join(tempRoot,'data','users.db.json'),'utf8');
  assert.ok(!storedUsers.includes('"password":'));
  const newLogin = await login({username:'caja_test',password:'5678'});
  assert.equal(newLogin.status,200);
  const newHeaders = {Cookie:newLogin.cookie.split(';')[0]};
  assert.equal((await mutate('/api/users/caja_test', adminHeaders, {active:false}, 'PATCH')).status,200);
  assert.equal((await request('/api/pedidos',{headers:newHeaders})).status,401);
  assert.equal((await login({username:'caja_test',password:'5678'})).status,401);
  assert.equal((await mutate('/api/users/administrador', adminHeaders, {active:false}, 'PATCH')).status,400);
  assert.equal((await mutate('/api/users/caja_test', adminHeaders, {active:true}, 'PATCH')).status,200);
  const stopped = new Promise(resolve => server.once('exit', resolve)); server.kill(); await stopped;
  server = spawn(process.execPath, [path.join(tempRoot, 'tools', 'server.js'), '--port', '3099'], { env, stdio: 'ignore' });
  for (let attempt=0; attempt<30; attempt++) { try { await request('/api/auth/verify'); break; } catch(e) { await new Promise(resolve => setTimeout(resolve,100)); } }
  assert.equal((await login({username:'caja_test',password:'5678'})).status,200,'Las nuevas cuentas sobreviven al reinicio');
  assert.equal((await login({username:'atención',password:'1234'})).status,401);
  console.log('Acceso y caja: permisos, aislamiento del historial, precios, pagos, altas, bajas y persistencia: PASS');
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (server) { server.kill(); await new Promise(resolve => server.once('exit', resolve)); }
  const resolved = path.resolve(tempRoot);
  assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
  assert.ok(path.basename(resolved).startsWith('rtq-access-test-'));
  fs.rmSync(resolved, { recursive: true, force: true });
});
