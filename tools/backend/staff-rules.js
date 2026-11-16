// Reglas de nombre y contraseña del personal, iguales para JSON y PostgreSQL
function cleanStaffName(name) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 60) throw new Error('Ingresa un nombre de hasta 60 caracteres.');
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
