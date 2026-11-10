import { useCallback, useEffect, useState } from 'react';
import type { CartItem } from '../store/cartStore';
import { useCheckoutStore } from '../store/checkoutStore';
import { validateCoupon, type CouponCheck } from '../lib/coupons';
import type { OrderMode } from '../lib/orderApi';

export interface AppliedCoupon {
  code: string;
  discount: number;
}

/**
 * Cupón validado por el servidor y compartido entre carrito y checkout (queda en checkoutStore).
 * Si el carrito o la modalidad cambian, se vuelve a consultar: un descuento por porcentaje cambia
 * con el subtotal y un cupón con monto mínimo puede dejar de aplicar.
 */
export function useServerCoupon(items: CartItem[], mode: OrderMode, active = true) {
  const setField = useCheckoutStore((s) => s.setField);
  const [applied, setApplied] = useState<AppliedCoupon | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    if (!active) return;
    const stored = useCheckoutStore.getState().couponCode;
    if (!stored || items.length === 0) {
      setApplied(null);
      if (stored) setField('couponCode', '');
      return;
    }
    let cancelled = false;
    validateCoupon(stored, items, mode).then((res) => {
      if (cancelled) return;
      if (res.valid) {
        setApplied({ code: res.code, discount: res.discount });
      } else if (!res.unavailable) {
        // Si la tienda no respondió se conserva el cupón: no se sabe que dejó de aplicar
        setApplied(null);
        setField('couponCode', '');
        setMessage({ text: res.message, error: true });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [items, mode, active, setField]);

  const apply = useCallback(
    async (code: string): Promise<CouponCheck> => {
      const res = await validateCoupon(code, items, mode);
      if (res.valid) {
        setApplied({ code: res.code, discount: res.discount });
        setField('couponCode', res.code);
        setMessage({ text: res.message });
      } else {
        setApplied(null);
        setField('couponCode', '');
        setMessage({ text: res.message, error: true });
      }
      return res;
    },
    [items, mode, setField]
  );

  const remove = useCallback(() => {
    setApplied(null);
    setField('couponCode', '');
    setMessage(null);
  }, [setField]);

  return { applied, message, apply, remove };
}
