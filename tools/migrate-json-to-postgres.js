// Solo lee la carpeta indicada. No carga .env ni imprime registros o credenciales.
const fs = require('fs');
const path = require('path');
const { SupabaseRpc } = require('./backend/repositories/supabase-rpc');
const { normalizeOptions } = require('./backend/repositories/catalog.repository');

function invalid(location) { throw new Error(`Dato inválido en ${location}; no se muestra su contenido.`); }
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
function text(v, location, nullable = false) {
  if (nullable && v == null) return null;
  if (typeof v !== 'string') invalid(location);
  return v;
}
function money(v, location) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 99999999.99 ||
      Math.abs(v * 100 - Math.round(v * 100)) > 0.000001) invalid(location);
  return v;
}
function timestamp(v, location, nullable = false) {
  if (nullable && v == null) return null;
  // Exige zona horaria para no interpretar silenciosamente según la máquina.
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v) || !Number.isFinite(Date.parse(v))) invalid(location);
  const [year, month, day] = v.slice(0,10).split('-').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year,month,0)).getUTCDate()) invalid(location);
  return new Date(v).toISOString();
}
function keys(v, allowed, location) {
  if (!object(v) || Object.keys(v).some(k => !allowed.includes(k))) invalid(location);
}
function unique(rows, key, location) {
  const seen = new Set();
  rows.forEach((r, i) => {
    if (typeof r[key] !== 'string' || !r[key] || seen.has(r[key])) invalid(`${location}[${i}].${key}`);
    seen.add(r[key]);
  });
}
function loadSnapshot(directory, options = {}) {
  const read = (name, optional = false) => {
    const file = path.join(directory, name);
    if (optional && !fs.existsSync(file)) return [];
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch { throw new Error(`No se pudo leer ${name}; no se modificó el origen.`); }
  };
  const products = read('catalog.db.json');
  // El modo limitado ni siquiera abre archivos de pedidos o usuarios.
  const orders = options.catalogConfigOnly ? [] : read('orders.db.json');
  const users = options.catalogConfigOnly ? [] : read('users.db.json', true);
  const config = read('store.config.json');
  for (const [label, rows, key] of [['products', products, 'id'], ['orders', orders, 'id'], ['users', users, 'username']]) {
    if (!Array.isArray(rows)) invalid(label);
    rows.forEach((r,i) => { if (!object(r)) invalid(`${label}[${i}]`); });
    unique(rows, key, label);
  }
  const productFields = ['id','name','icon','cat','qty','price','promo','sauces','badge','desc','stock','options'];
  products.forEach((p,i) => {
    keys(p, productFields, `products[${i}]`);
    for (const k of productFields.filter(k=>!['price','promo','stock','options'].includes(k))) text(p[k],`products[${i}].${k}`);
    money(p.price, `products[${i}].price`);
    if (p.promo !== null) money(p.promo, `products[${i}].promo`);
    if (typeof p.stock !== 'boolean') invalid(`products[${i}].stock`);
    // Las opciones deben estar ya normalizadas: lo que se importa es exactamente lo que el servidor guardaría
    const options = p.options === undefined ? null : p.options;
    if (JSON.stringify(normalizeOptions(options)) !== JSON.stringify(options)) invalid(`products[${i}].options`);
    p.options = options;
  });
  if (!object(config)) invalid('config');
  for (const k of ['name','city','address','hours','whatsappDisplay','whatsappInternational','mapsUrl']) text(config[k],`config.${k}`);
  if (!object(config.yape)) invalid('config.yape');
  for (const k of ['number','holder']) text(config.yape[k],`config.yape.${k}`);
  const orderFields = ['id','customer','phone','channel','mode','status','priority','payMethod','payVerified','address','reference','gps','notes','time','elapsedMinutes','createdAt','createdBy','subtotal','deliveryFee','discount','total','items'];
  const normalizedOrders = orders.map((o,i) => {
    const loc = `orders[${i}]`;
    keys(o, orderFields, loc);
    for (const [k,values] of [['channel',['web','app','whatsapp','caja']],['mode',['delivery','pickup']],['status',['new','kitchen','delivery','delivered']]]) {
      if (!values.includes(o[k])) invalid(`${loc}.${k}`);
    }
    const normalized = { ...o };
    for (const k of ['customer','phone','payMethod','address','reference','gps','notes','time','createdBy']) normalized[k] = text(o[k], `${loc}.${k}`, true);
    for (const k of ['priority','payVerified']) {
      if (o[k] != null && typeof o[k] !== 'boolean') invalid(`${loc}.${k}`);
      normalized[k] = o[k] ?? null;
    }
    if (o.elapsedMinutes != null && (!Number.isInteger(o.elapsedMinutes) || o.elapsedMinutes < 0 || o.elapsedMinutes > 2147483647)) invalid(`${loc}.elapsedMinutes`);
    normalized.elapsedMinutes = o.elapsedMinutes ?? null;
    normalized.createdAt = timestamp(o.createdAt,`${loc}.createdAt`,true);
    for (const k of ['subtotal','deliveryFee','discount','total']) money(o[k],`${loc}.${k}`);
    if (!Array.isArray(o.items)) invalid(`${loc}.items`);
    normalized.items = o.items.map((item,j) => {
      const at = `${loc}.items[${j}]`;
      keys(item,['productId','name','qty','price','sauces'],at);
      if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > 2147483647) invalid(`${at}.qty`);
      return { productId: text(item.productId,`${at}.productId`,true), name: text(item.name,`${at}.name`),
        qty:item.qty, price:money(item.price,`${at}.price`), sauces:text(item.sauces,`${at}.sauces`,true) };
    });
    return normalized;
  });
  const normalizedUsers = users.map((u,i) => {
    const loc = `users[${i}]`;
    keys(u,['username','name','role','active','salt','passwordHash','createdAt'],loc);
    for (const k of ['username','name','salt','passwordHash']) text(u[k],`${loc}.${k}`);
    if (!['admin','cashier'].includes(u.role) || typeof u.active !== 'boolean' || !/^[0-9a-fA-F]{128}$/.test(u.passwordHash) || !u.salt) invalid(loc);
    // No normalizar salt, username ni hash: conservar el login scrypt existente.
    return {...u, createdAt: timestamp(u.createdAt,`${loc}.createdAt`)};
  });
  return { products, orders:normalizedOrders, users:normalizedUsers, config };
}

function stats(snapshot) {
  const cents = snapshot.orders.reduce((sum,o)=>sum+BigInt(Math.round(o.total*100)),0n);
  return { products:snapshot.products.length, orders:snapshot.orders.length,
    items:snapshot.orders.reduce((sum,o)=>sum+o.items.length,0), users:snapshot.users.length,
    orderTotal:`${cents/100n}.${String(cents%100n).padStart(2,'0')}` };
}
function warnings(snapshot) {
  const ids = new Set(snapshot.products.map(p=>p.id));
  return { undatedOrders:snapshot.orders.filter(o=>!o.createdAt).length,
    unknownProductReferences:snapshot.orders.flatMap(o=>o.items).filter(i=>i.productId && !ids.has(i.productId)).length,
    missingUsersFile:snapshot.users.length === 0 };
}
async function migrate(directory, options = {}) {
  const snapshot = loadSnapshot(directory, options);
  const report = options.catalogConfigOnly
    ? {dryRun:Boolean(options.dryRun),scope:'catalog-config',source:{products:snapshot.products.length,storeConfig:1}}
    : { dryRun:Boolean(options.dryRun), source:stats(snapshot), warnings:warnings(snapshot) };
  if (options.dryRun) return report; // Ni crea el cliente ni requiere una clave.
  const db = options.db || new SupabaseRpc();
  if (options.catalogConfigOnly) {
    const verification = await db.call('rtq_import_catalog_config', {p_products:snapshot.products,p_config:snapshot.config});
    return {...report,...verification};
  }
  if (db.url && !['localhost','127.0.0.1','[::1]'].includes(new URL(db.url).hostname)) {
    throw new Error('La migración completa de pedidos y usuarios solo está habilitada en localhost. En la nube usa --catalog-config-only con autorización aparte.');
  }
  const verification = await db.call('rtq_import_snapshot', { p_snapshot:snapshot });
  return { ...report, ...verification };
}
async function main() {
  const args = process.argv.slice(2);
  const positional = args.filter(a=>!a.startsWith('--'));
  if (positional.length !== 1 || args.some(a=>a.startsWith('--') && !['--dry-run','--catalog-config-only'].includes(a))) {
    throw new Error('Uso: node tools/migrate-json-to-postgres.js <carpeta> [--dry-run] [--catalog-config-only]');
  }
  console.log(JSON.stringify(await migrate(path.resolve(positional[0]),{dryRun:args.includes('--dry-run'),catalogConfigOnly:args.includes('--catalog-config-only')}),null,2));
}
if (require.main === module) main().catch(error=>{
  console.error(error.message);
  if (error.differences) console.error(JSON.stringify({ differences:error.differences }));
  process.exitCode=1;
});
module.exports = { loadSnapshot, stats, warnings, migrate };
