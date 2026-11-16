// Reglas de nombre y contraseña del personal, iguales para JSON y PostgreSQL
const { isValidPersonName } = require('./sanitize');

// Mismo criterio que al crear la cuenta: de 3 a 60 caracteres, solo letras
function cleanStaffName(name) {
  if (!isValidPersonName(name)) throw new Error('Ingresa un nombre de 3 a 60 caracteres, solo con letras.');
  return name.trim();
}

function checkStaffPassword(password) {
  if (typeof password !== 'string' || password.length < 4 || password.length > 128) throw new Error('La contraseña debe tener entre 4 y 128 caracteres.');
  return password;
}

/** Valida los cambios de nombre o contraseña; devuelve solo los campos enviados. */
function staffChanges(changes) {
  const out = {};
  if (changes && changes.name !== undefined) out.name = cleanStaffName(changes.name);
  if (changes && changes.password !== undefined) out.password = checkStaffPassword(changes.password);
  if (!Object.keys(out).length) throw new Error('No hay cambios que guardar.');
  return out;
}

module.exports = { cleanStaffName, checkStaffPassword, staffChanges };
