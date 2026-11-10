// Primeras cuentas del equipo en PostgreSQL. La base nueva llega sin usuarios y nadie podría entrar
// al panel; si no hay ninguno, se crean con las contraseñas que el propietario puso en el entorno.
// Nunca se usa una contraseña por defecto y nunca se tocan cuentas que ya existen.
const MIN_PASSWORD = 8;

async function ensureInitialStaff(users, env = process.env, logger = console) {
  if ((await users.list()).length > 0) return [];

  const adminPassword = env.RTQ_ADMIN_PASSWORD;
  if (typeof adminPassword !== 'string' || adminPassword.length < MIN_PASSWORD) {
    logger.warn(`[EQUIPO] No hay usuarios y RTQ_ADMIN_PASSWORD no tiene al menos ${MIN_PASSWORD} caracteres: nadie podrá entrar al panel.`);
    return [];
  }

  const created = [];
  await users.add('administrador', 'Administrador', adminPassword, 'admin');
  created.push('administrador');
  const cajaPassword = env.RTQ_CAJA_PASSWORD;
  if (typeof cajaPassword === 'string' && cajaPassword.length >= MIN_PASSWORD) {
    await users.add('caja', 'Caja principal', cajaPassword, 'cashier');
    created.push('caja');
  }
  logger.log(`[EQUIPO] Cuentas iniciales creadas: ${created.join(', ')}.`);
  return created;
}

module.exports = { ensureInitialStaff };
