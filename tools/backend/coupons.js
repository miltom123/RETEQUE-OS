// Cupones que administra el panel. Se guardan en la configuración (store.config.json o la fila
// de configuración en PostgreSQL) y el servidor los aplica al cotizar; la web nunca ve la lista.
const TYPES = ['fixed', 'percent'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_COUPONS = 100;

class CouponError extends Error {}

function cleanDate(value, label) {
  if (value == null || value === '') return null;
  const text = String(value).trim();
  if (!DATE.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) throw new CouponError(`${label} debe tener el formato AAAA-MM-DD.`);
  return text;
}

function money(value, label, { min = 0, max = 10000 } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) throw new CouponError(`${label} debe estar entre ${min} y ${max}.`);
  return Math.round(number * 100) / 100;
}

/** Valida y normaliza la lista completa de cupones antes de guardarla. */
function normalizeCoupons(list) {
  if (!Array.isArray(list)) throw new CouponError('La lista de cupones no es válida.');
  if (list.length > MAX_COUPONS) throw new CouponError(`Puedes tener hasta ${MAX_COUPONS} cupones.`);
  const seen = new Set();
  return list.map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw new CouponError(`El cupón ${index + 1} no es válido.`);
    const code = String(raw.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) throw new CouponError('El código debe tener de 3 a 30 letras, números, guion o guion bajo.');
    if (seen.has(code)) throw new CouponError(`El código ${code} está repetido.`);
    seen.add(code);
    if (!TYPES.includes(raw.type)) throw new CouponError(`El cupón ${code} debe ser de monto fijo o de porcentaje.`);
    const value = raw.type === 'percent'
      ? money(raw.value, `El porcentaje de ${code}`, { min: 1, max: 100 })
      : money(raw.value, `El descuento de ${code}`, { min: 0.1, max: 1000 });
    const name = String(raw.name || '').trim().slice(0, 80) || code;
    const startDate = cleanDate(raw.startDate, `La fecha de inicio de ${code}`);
    const endDate = cleanDate(raw.endDate, `La fecha de fin de ${code}`);
    if (startDate && endDate && startDate > endDate) throw new CouponError(`En ${code}, la fecha de fin es anterior a la de inicio.`);
    return {
      code, name, type: raw.type, value,
      minOrder: money(raw.minOrder || 0, `El pedido mínimo de ${code}`),
      active: raw.active !== false,
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    };
  });
}

/** Fecha de hoy en Tacna (Perú), para comparar con las fechas de vigencia. */
function todayInPeru(now = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
}

/** Motivo por el que un cupón activo no aplica hoy, o null si está vigente. */
function outsideValidity(rule, now = Date.now()) {
  const today = todayInPeru(now);
  if (rule.startDate && today < rule.startDate) return 'todavía no está vigente';
  if (rule.endDate && today > rule.endDate) return 'ya venció';
  return null;
}

module.exports = { normalizeCoupons, outsideValidity, todayInPeru, CouponError, MAX_COUPONS };
