/**
 * Validaciones y filtros de entrada compartidos por todos los formularios.
 * Regla general: el filtro (`sanitize…`) bloquea lo que no se puede escribir mientras el
 * cliente teclea; la validación (`isValid…`) se vuelve a aplicar al enviar, porque pegar
 * texto o el autocompletado también pueden meter valores incorrectos.
 */

export const PHONE_LENGTH = 9;
export const NAME_MIN = 3;
export const NAME_MAX = 60;
export const ADDRESS_MIN = 5;
export const ADDRESS_MAX = 300;
export const REFERENCE_MAX = 200;
export const EMAIL_MAX = 100;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 128;
export const COUPON_MAX = 20;

// ---------------------------------------------------------------- Celular

/** Deja solo dígitos (sin espacios, guiones ni "+"). */
export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Filtro para el campo de celular: solo números, el primero tiene que ser 9 y máximo 9 dígitos.
 * Si se pega un número con el prefijo de país (+51 912 345 678) se quita el 51.
 */
export function sanitizePhoneInput(value: string): string {
  let digits = normalizePhone(value);
  if (digits.length > PHONE_LENGTH && digits.startsWith('51')) digits = digits.slice(2);
  if (!digits.startsWith('9')) return '';
  return digits.slice(0, PHONE_LENGTH);
}

/** Celular peruano: exactamente 9 dígitos y el primero es 9. */
export function isValidPeruMobile(value: string): boolean {
  return /^9\d{8}$/.test(sanitizePhoneInput(value));
}

// ----------------------------------------------------------------- Nombres

/** Letras (con tildes y ñ), espacio, apóstrofo, guion y punto: "María José", "O'Brien", "Ana-Lucía". */
const NAME_CHARS = /[^\p{L}\s'.-]/gu;

/** Filtro para nombres: quita números y símbolos, junta espacios repetidos y corta al máximo. */
export function sanitizeNameInput(value: string): string {
  return value
    .replace(NAME_CHARS, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s'.-]+/, '')
    .slice(0, NAME_MAX);
}

export function isValidName(value: string): boolean {
  const name = value.trim();
  if (name.length < NAME_MIN || name.length > NAME_MAX) return false;
  if (!/^\p{L}[\p{L}\s'.-]*$/u.test(name)) return false;
  return (name.match(/\p{L}/gu) || []).length >= NAME_MIN;
}

// ------------------------------------------------------------------ Correo

/** Filtro para correo: sin espacios y con largo máximo. */
export function sanitizeEmailInput(value: string): string {
  return value.replace(/\s/g, '').slice(0, EMAIL_MAX);
}

export function isValidEmail(value: string): boolean {
  const email = value.trim();
  return email.length <= EMAIL_MAX && /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(email);
}

// ------------------------------------------------------- Texto libre y otros

/** Texto libre (dirección, referencia, indicaciones): sin < ni >, sin saltos raros, con largo máximo. */
export function sanitizeFreeText(value: string, max: number): string {
  return value.replace(/[<>\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/^\s+/, '').slice(0, max);
}

export function isValidAddress(value: string): boolean {
  const address = value.trim();
  return address.length >= ADDRESS_MIN && address.length <= ADDRESS_MAX && /[\p{L}\d]/u.test(address);
}

/** Código de cupón: letras y números, en mayúsculas. */
export function sanitizeCouponInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, COUPON_MAX);
}

export const MESSAGES = {
  name: `Escribe tu nombre, solo letras (mínimo ${NAME_MIN}).`,
  phone: 'Ingresa un celular de 9 dígitos que empiece con 9.',
  address: 'Ingresa tu dirección (calle, número o urbanización).',
  email: 'Ingresa un correo válido, por ejemplo nombre@correo.com.',
  password: `La contraseña debe tener entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres.`,
} as const;
