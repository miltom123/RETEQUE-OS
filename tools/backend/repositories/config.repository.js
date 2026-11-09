// Fuente Única de Verdad: Repositorio de Configuración del Negocio (data/store.config.json)
const fs = require('fs');
const crypto = require('crypto');

class ConfigRepository {
  constructor(filePath, logger = console) {
    this.filePath = filePath;
    this.logger = logger;
    this.config = {};
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(this.filePath)) {
        this.config = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      }
    } catch (e) {
      this.logger.warn('[Config] Error al leer store.config.json:', e.message);
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
