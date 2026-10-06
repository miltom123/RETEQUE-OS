import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Tag, X, Trash2, Utensils } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { formatMoney, roundMoney } from '../../lib/money';
import { CartItem } from '../components/CartItem';
import { validateCoupon } from '../../lib/coupons';
import { useUiStore } from '../../store/uiStore';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, clearCart } = useCartStore();
  const showToast = useUiStore((s) => s.showToast);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  );
  const discount = appliedCoupon ? appliedCoupon.discount : 0;
  const totalProducts = roundMoney(Math.max(0, subtotal - discount));

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    const res = validateCoupon(couponCode.trim(), subtotal);
    if (res.valid) {
      setAppliedCoupon({ code: res.rule!.code, discount: res.discount });
      setCouponError(null);
      showToast({ message: `Cupón ${res.rule!.code} aplicado: -S/ ${res.discount.toFixed(2)}` });
    } else {
      setAppliedCoupon(null);
      setCouponError(res.message);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  if (items.length === 0) {
    return (
      <div className="p-8 text-center space-y-4 my-8">
        <div className="w-14 h-14 rounded-2xl bg-[#FFF2DF] text-[#FF3038] flex items-center justify-center mx-auto shadow-inner">
          <ShoppingBag className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-black text-[#242424] font-display">Tu carrito está vacío</h2>
          <p className="text-xs text-[#6B6662] max-w-[240px] mx-auto">
            ¡Antójate con nuestros tequeños crocantes, pizzas y combos para compartir!
          </p>
        </div>
        <Link
          to="/app/menu"
          className="inline-flex items-center gap-1.5 bg-[#FF3038] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md active:scale-95 transition"
        >
          <Utensils className="w-4 h-4" />
          <span>Ver Menú de Retequeños</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between">
      <div className="p-3.5 sm:p-4 space-y-3.5">
        {/* Header Carrito Estandarizado */}
        <div className="flex items-center justify-between px-0.5">
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#242424] font-display leading-tight">
              Tu Carrito de Pedido
            </h2>
            <p className="text-[11.5px] text-[#8C867F]">
              {items.length} {items.length === 1 ? 'producto' : 'productos'} seleccionados
            </p>
          </div>

          <button
            type="button"
            onClick={clearCart}
            className="text-xs font-bold text-[#8C867F] hover:text-[#FF3038] flex items-center gap-1 cursor-pointer px-2 py-1 rounded-lg hover:bg-red-50 transition"
            title="Vaciar todo el carrito"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vaciar</span>
          </button>
        </div>

        {/* Lista de Items Compacta y Estandarizada */}
        <div className="space-y-2">
          {items.map((item) => (
            <CartItem key={item.lineId} item={item} />
          ))}
        </div>

        {/* Cupón de descuento Compacto */}
        <div className="bg-white rounded-2xl border border-[#EFE6D6] p-3 space-y-2 shadow-xs">
          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cupón {appliedCoupon.code} (-{formatMoney(discount)})</span>
              </div>
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="text-emerald-700 hover:text-emerald-900 p-0.5"
                title="Quitar cupón"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 text-[#8C867F] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Cupón de descuento (ej. BIENVENIDO10)"
                  className="w-full h-9 pl-8.5 pr-2.5 rounded-xl border border-[#EFE6D6] text-xs uppercase font-medium bg-[#FFFDF9] focus:outline-none focus:border-[#FF3038]"
                />
              </div>
              <button
                type="submit"
                className="h-9 px-3.5 bg-[#242424] hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
              >
                Aplicar
              </button>
            </form>
          )}

          {couponError && (
            <p className="text-[11px] font-bold text-[#FF3038] mt-0.5 px-1">{couponError}</p>
          )}
        </div>

        {/* Resumen de Costos Proporcionado */}
        <div className="bg-white rounded-2xl border border-[#EFE6D6] p-3.5 space-y-2 shadow-xs text-xs">
          <div className="flex justify-between text-[#6B6662]">
            <span>Subtotal de productos</span>
            <span className="font-bold text-[#242424]">{formatMoney(subtotal)}</span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Descuento aplicado</span>
              <span>-{formatMoney(discount)}</span>
            </div>
          )}

          <div className="flex justify-between text-[#8C867F] pt-1 border-t border-[#F5EDE1]/70">
            <span>Costo de envío (Delivery)</span>
            <span className="italic font-medium text-[11px]">A coordinar por WhatsApp</span>
          </div>

          <div className="flex items-baseline justify-between pt-2 border-t border-[#F5EDE1]">
            <div>
              <span className="block font-black text-[#242424] text-xs uppercase tracking-wider">
                Total de productos
              </span>
            </div>
            <span className="font-black text-[#FF3038] text-lg font-display">
              {formatMoney(totalProducts)}
            </span>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Checkout Action Estandarizado */}
      <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#EFE6D6] p-3 sm:p-3.5 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] mt-3">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <span className="text-[9.5px] text-[#8C867F] block font-bold uppercase tracking-wider leading-none mb-0.5">
              Total productos
            </span>
            <span className="font-black text-[#FF3038] text-lg font-display leading-none whitespace-nowrap">
              {formatMoney(totalProducts)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/app/pedido')}
            className="flex-1 max-w-[230px] h-11 bg-[#FF3038] hover:bg-[#E52B33] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md shadow-[#FF3038]/20 cursor-pointer"
          >
            <span>Continuar con mis datos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
