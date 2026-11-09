// Fuente Única de Verdad: Repositorio de Configuración del Negocio (data/store.config.json)
const fs = require('fs');
const crypto = require('crypto');
const { readJsonFile } = require('./json-file');

class ConfigRepository {
  constructor(filePath, logger = console) {
    this.filePath = filePath;
    this.logger = logger;
    this.config = {};
    this.init();
  }

  // Una configuración ilegible detiene el arranque: antes quedaba vacía y el siguiente guardado la sobrescribía
  init() {
    if (fs.existsSync(this.filePath)) {
      this.config = readJsonFile(this.filePath, {
        isValid: value => Boolean(value) && typeof value === 'object' && !Array.isArray(value),
        expected: 'un objeto de configuración'
      });
    }
  }

  get() {
    return { ...this.config };
  }

  update(patch) {
    this.config = { ...this.config, ...patch };
    const tmp = `${this.filePath}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.config, null, 2), 'utf8');
    fs.renameSync(tmp, this.filePath);
    return this.config;
  }
}

module.exports = { ConfigRepository };
