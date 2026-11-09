// Lectura estricta de archivos de datos JSON: si existen pero no se pueden usar, se detiene
// el arranque sin tocarlos, para no sobrescribir datos del negocio con valores por defecto.
const fs = require('fs');

class DataFileError extends Error {}

function readJsonFile(filePath, { isValid, expected }) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new DataFileError(`No se pudo leer ${filePath}: ${error.message}. El archivo no se modificó; revísalo o restáuralo desde una copia antes de iniciar el servidor.`);
  }
  if (!isValid(parsed)) {
    throw new DataFileError(`${filePath} no contiene ${expected}. El archivo no se modificó; revísalo o restáuralo desde una copia antes de iniciar el servidor.`);
  }
  return parsed;
}

module.exports = { DataFileError, readJsonFile };
