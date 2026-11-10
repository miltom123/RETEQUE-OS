// ===================================================
// CUPONES: SE VALIDAN EN EL SERVIDOR
// La lista de códigos ya no viaja en el código de la web; el servidor responde si aplica y cuánto descuenta.
// ===================================================

import type { CartItem } from '../store/cartStore';
import { quoteCart, type OrderMode } from './orderApi';

export interface CouponCheck {
  valid: boolean;
  message: string;
  discount: number;
  code: string;
}

export async function validateCoupon(rawCode: string, items: CartItem[], mode: OrderMode): Promise<CouponCheck> {
  const code = (rawCode || '').trim().toUpperCase();
  if (!code) return { valid: false, message: 'Ingresa un código de cupón', discount: 0, code };
  try {
    const quote = await quoteCart(items, mode, code);
    const coupon = quote.coupon;
    if (coupon && coupon.applied) return { valid: true, message: coupon.message, discount: quote.discount, code: coupon.code };
    return { valid: false, message: coupon ? coupon.message : `El cupón "${code}" no es válido o ha expirado.`, discount: 0, code };
  } catch (error) {
    return { valid: false, message: error instanceof Error ? error.message : 'No pudimos validar el cupón.', discount: 0, code };
  }
}
