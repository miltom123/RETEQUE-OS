// Ayuda exclusiva de pruebas. El servidor de producción no importa este módulo.
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('node:assert/strict');
const { SupabaseRpc } = require('./backend/repositories/supabase-rpc');
const { loadSnapshot } = require('./migrate-json-to-postgres');

async function prepareStorage(directory) {
  if (process.env.RTQ_STORAGE !== 'postgres') return;
  const resolved = fs.realpathSync.native(directory);
  const temporary = fs.realpathSync.native(os.tmpdir()) + path.sep;
  assert.ok(resolved.startsWith(temporary), 'La fuente de pruebas debe estar en una copia temporal');
  const { UsersRepository } = require('./users.repository');
  const { OrderRepository } = require('./backend/repositories/orders.repository');
  new UsersRepository(directory);
  new OrderRepository(path.join(directory,'orders.db.json'), { log() {} });
  const snapshot = loadSnapshot(directory);
  if (process.env.RTQ_TEST_SUPABASE_LOCAL === '1') {
    const { clearFixture } = require('./local-supabase-test-db');
    await clearFixture();
    await new SupabaseRpc().call('rtq_import_snapshot', {p_snapshot:snapshot});
    return;
  }
  // El reset HTTP solo existe en el adaptador SQL de pruebas; no es una RPC remota.
  const url = new URL(process.env.RTQ_TEST_SQL_BRIDGE || 'http://invalid');
  assert.equal(url.hostname, '127.0.0.1', 'Las suites destructivas solo usan destinos locales');
  assert.equal(url.origin, new URL(process.env.SUPABASE_URL).origin);
  const response = await fetch(url.origin+'/test/reset', { method:'POST',
    headers:{'Content-Type':'application/json', Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`}, body:JSON.stringify(snapshot) });
  assert.equal(response.status,200,'Inicialización de la base temporal');
}
async function readStored(directory, collection) {
  if (process.env.RTQ_STORAGE !== 'postgres') {
    const files = {products:'catalog.db.json',orders:'orders.db.json',users:'users.db.json'};
    return JSON.parse(fs.readFileSync(path.join(directory, files[collection]),'utf8'));
  }
  return new SupabaseRpc().operation({products:'products.list', orders:'orders.list', users:'users.list'}[collection]);
}
module.exports = { prepareStorage, readStored };
