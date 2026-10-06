import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useCheckoutStore } from '../../store/checkoutStore';
import { useUiStore } from '../../store/uiStore';
import { openWhatsAppCheckout } from '../../lib/whatsapp';
import { isValidName, isValidPeruMobile } from '../../lib/validation';
import { CartItemRow } from './CartItemRow';
import { CartCustomerForm } from './CartCustomerForm';
import { CartDrawerFooter } from './CartDrawerFooter';
import { DEFAULT_TACNA_ZONE, TacnaZone } from '../../config/tacnaZones';
import { roundMoney } from '../../lib/money';
import { validateCoupon } from '../../lib/coupons';

export const CartDrawer: React.FC = () => {
  const isOpen = useCartStore((s) => s.isCartOpen);
  const closeCart = useCartStore((s) => s.closeCart);
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const showToast = useUiStore((s) => s.showToast);
  const { fullName, phone, deliveryType, address, reference, generalNotes } = useCheckoutStore();

  const [selectedZone, setSelectedZone] = useState<TacnaZone>(DEFAULT_TACNA_ZONE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponMessage, setCouponMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Bloquea el scroll del fondo y cierra con Escape
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, closeCart]);

  useEffect(() => {
    if (items.length === 0) {
      setSent(false);
      setAppliedCoupon(null);
      setCouponMessage(null);
    }
  }, [items.length]);

  if (!isOpen) return null;

  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const deliveryFee = deliveryType === 'delivery' ? roundMoney(selectedZone.fee) : 0;
  const discount = appliedCoupon ? appliedCoupon.discount : 0;
  const grandTotal = roundMoney(Math.max(0, subtotal - discount));

  const handleApplyCoupon = (code: string) => {
    const res = validateCoupon(code, subtotal);
    if (res.valid) {
      setAppliedCoupon({ code: res.rule!.code, discount: res.discount });
      setCouponMessage({ text: res.message });
      showToast({ message: `Cupón ${res.rule!.code} aplicado: -S/ ${res.discount.toFixed(2)}` });
    } else {
      setAppliedCoupon(null);
      setCouponMessage({ text: res.message, error: true });
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponMessage(null);
    showToast({ message: 'Cupón removido' });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!isValidName(fullName)) errs.fullName = 'Escribe tu nombre (mínimo 3 letras)';
    if (!isValidPeruMobile(phone)) errs.phone = 'Ingresa un celular válido de 9 dígitos (empieza en 9)';
    if (deliveryType === 'delivery' && address.trim().length < 5) errs.address = 'Ingresa tu dirección en Tacna';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSend = () => {
    if (!validate()) return;
    openWhatsAppCheckout(
      items,
      { fullName, phone, deliveryType, address, reference, generalNotes },
      subtotal,
      deliveryFee,
      deliveryType === 'delivery' ? selectedZone.name : undefined,
      discount,
      appliedCoupon?.code
    );
    setSent(true);
  };

  const handleClear = () => {
    clearCart();
    setSent(false);
    setAppliedCoupon(null);
    setCouponMessage(null);
    closeCart();
    showToast({ message: 'Pedido vaciado. ¡Gracias por tu compra!' });
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-hidden" role="dialog" aria-modal="true" aria-label="Tu pedido">
      <div onClick={closeCart} className="absolute inset-0 bg-black/60 backdrop-blur-sm fade-in" />

      <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col z-10 drawer-in">
        {/* Cabecera */}
        <div className="p-4 sm:p-5 flex items-center justify-between bg-[#C5161D] text-white">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" aria-hidden="true" />
            <h2 className="font-black text-base sm:text-lg">
              Tu pedido {totalCount > 0 && <span className="font-bold text-white/80">({totalCount})</span>}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="p-2 hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
            aria-label="Cerrar pedido"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <ShoppingBag className="w-12 h-12 text-neutral-300 mx-auto" aria-hidden="true" />
              <p className="font-bold text-neutral-800 text-sm">Tu pedido está vacío</p>
              <p className="text-xs text-neutral-500">Elige tus tequeños, pizzas o promociones favoritas de la carta.</p>
              <button
                type="button"
                onClick={closeCart}
                className="mt-2 inline-flex items-center justify-center h-10 px-5 rounded-xl bg-[#C5161D] text-white text-sm font-bold cursor-pointer"
              >
                Ver la carta
              </button>
            </div>
          ) : (
            <>
              <ul className="space-y-3" aria-label="Productos del pedido">
                {items.map((item) => (
                  <CartItemRow
                    key={item.lineId}
                    item={item}
                    onUpdateQuantity={updateQuantity}
                    onRemoveItem={removeItem}
                  />
                ))}
              </ul>

              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-bold text-neutral-500 hover:text-[#C5161D] underline underline-offset-2 cursor-pointer"
              >
                Vaciar pedido
              </button>

              <CartCustomerForm
                errors={errors}
                selectedZone={selectedZone}
                onSelectZone={setSelectedZone}
              />
            </>
          )}
        </div>

        {/* Acciones Footer */}
        {items.length > 0 && (
          <CartDrawerFooter
            subtotal={subtotal}
            discount={discount}
            grandTotal={grandTotal}
            appliedCouponCode={appliedCoupon?.code}
            onApplyCoupon={handleApplyCoupon}
            onRemoveCoupon={handleRemoveCoupon}
            couponMessage={couponMessage}
            sent={sent}
            onSend={handleSend}
            onClear={handleClear}
          />
        )}
      </div>
    </div>,
    document.body
  );
};
