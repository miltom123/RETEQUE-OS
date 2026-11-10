// Pruebas de las cuentas iniciales en PostgreSQL. Usa un repositorio en memoria: no toca datos ni red.
const assert = require('node:assert/strict');
const { ensureInitialStaff } = require('./backend/initial-staff');

function fakeUsers(initial = []) {
  const rows = [...initial];
  return {
    rows,
    async list() { return rows; },
    async add(username, name, password, role) { rows.push({ username, name, role, password }); },
  };
}
const silent = { log() {}, warn() {} };

async function run() {
  const empty = fakeUsers();
  assert.deepEqual(await ensureInitialStaff(empty, {}, silent), [], 'Sin contraseña no se crea nada');
  assert.deepEqual(await ensureInitialStaff(empty, { RTQ_ADMIN_PASSWORD: '1234' }, silent), [], 'Una contraseña corta no sirve');
  assert.equal(empty.rows.length, 0);

  const onlyAdmin = fakeUsers();
  assert.deepEqual(await ensureInitialStaff(onlyAdmin, { RTQ_ADMIN_PASSWORD: 'clave-larga-1' }, silent), ['administrador']);
  assert.equal(onlyAdmin.rows[0].role, 'admin');

  const both = fakeUsers();
  assert.deepEqual(await ensureInitialStaff(both, { RTQ_ADMIN_PASSWORD: 'clave-larga-1', RTQ_CAJA_PASSWORD: 'clave-larga-2' }, silent), ['administrador', 'caja']);
  assert.deepEqual(both.rows.map(u => u.role), ['admin', 'cashier']);

  const existing = fakeUsers([{ username: 'otra', role: 'admin' }]);
  assert.deepEqual(await ensureInitialStaff(existing, { RTQ_ADMIN_PASSWORD: 'clave-larga-1' }, silent), [], 'Con usuarios existentes no se crea ni cambia nada');
  assert.equal(existing.rows.length, 1);

  console.log('Cuentas iniciales: sin contraseña, contraseña corta, solo administrador, ambas y base con usuarios: PASS');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
