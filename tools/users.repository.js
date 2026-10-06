const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const normalizeUsername = value => String(value || '').trim().toLowerCase();
function publicUser(user) {
  return { username: user.username, name: user.name, role: user.role, active: user.active, createdAt: user.createdAt };
}
function passwordHash(password, salt) { return crypto.scryptSync(password, salt, 64).toString('hex'); }
class UsersRepository {
  constructor(directory) {
    this.file = path.join(directory, 'users.db.json');
    fs.mkdirSync(directory, { recursive: true });
    if (fs.existsSync(this.file)) this.users = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    else {
      this.users = [];
      this.add('administrador', 'Administrador', process.env.RTQ_ADMIN_PASSWORD || '1234', 'admin');
      this.add('caja', 'Caja principal', process.env.RTQ_CAJA_PASSWORD || '1234', 'cashier');
    }
  }
  save() {
    const temporary = `${this.file}.${crypto.randomBytes(6).toString('hex')}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(this.users, null, 2));
    fs.renameSync(temporary, this.file);
  }
  find(username) { return this.users.find(user => user.username === normalizeUsername(username)); }
  list() { return this.users.map(publicUser); }
  authenticate(username, password) {
    const user = this.find(username);
    if (!user || !user.active || typeof password !== 'string') return null;
    const candidate = Buffer.from(passwordHash(password, user.salt), 'hex');
    const stored = Buffer.from(user.passwordHash, 'hex');
    return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored) ? publicUser(user) : null;
  }
  add(username, name, password, role = 'cashier') {
    username = normalizeUsername(username);
    if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username) || ['atencion', 'atención'].includes(username)) throw new Error('Usa un usuario de 3 a 32 caracteres: letras, números, punto, guion o guion bajo.');
    if (this.find(username)) throw new Error('Ese usuario ya existe.');
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 60) throw new Error('Ingresa un nombre de hasta 60 caracteres.');
    if (typeof password !== 'string' || password.length < 4 || password.length > 128) throw new Error('La contraseña debe tener entre 4 y 128 caracteres.');
    const salt = crypto.randomBytes(16).toString('hex');
    const user = { username, name: name.trim(), role, active: true, salt, passwordHash: passwordHash(password, salt), createdAt: new Date().toISOString() };
    this.users.push(user);
    try { this.save(); } catch (e) { this.users.pop(); throw e; }
    return publicUser(user);
  }
  setActive(username, active) {
    const user = this.find(username);
    if (!user || user.role !== 'cashier') throw new Error('Solo puedes activar o desactivar usuarios de caja.');
    if (typeof active !== 'boolean') throw new Error('Estado inválido.');
    const previous = user.active; user.active = active;
    try { this.save(); } catch (e) { user.active = previous; throw e; }
    return publicUser(user);
  }
}
module.exports = { UsersRepository, publicUser };
