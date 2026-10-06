import React, { useState } from 'react';
import { MessageCircle, CheckCircle2, Tag, X } from 'lucide-react';
import { formatMoney } from '../../lib/money';

interface CartDrawerFooterProps {
  subtotal: number;
  discount: number;
  grandTotal: number;
  appliedCouponCode?: string;
  onApplyCoupon: (code: string) => void;
  onRemoveCoupon: () => void;
  couponMessage?: { text: string; error?: boolean } | null;
  sent: boolean;
  onSend: () => void;
  onClear: () => void;
}

export const CartDrawerFooter: React.FC<CartDrawerFooterProps> = ({
  subtotal,
  discount,
  grandTotal,
  appliedCouponCode,
  onApplyCoupon,
  onRemoveCoupon,
  couponMessage,
  sent,
  onSend,
  onClear,
}) => {
  const [inputCode, setInputCode] = useState('');

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    onApplyCoupon(inputCode.trim());
  };

  return (
    <div className="p-4 border-t border-line-soft bg-white space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Sección Cupón de Descuento */}
      {appliedCouponCode ? (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-xs">
          <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
            <Tag className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cupón {appliedCouponCode} (-{formatMoney(discount)})</span>
          </div>
          <button
            type="button"
            onClick={onRemoveCoupon}
            className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded cursor-pointer"
            title="Quitar cupón"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <form onSubmit={handleApply} className="flex gap-2">
          <div className="relative flex-1">
            <Tag className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="¿Tienes un cupón? (ej. BIENVENIDO10)"
              className="w-full h-9 pl-8 pr-2.5 rounded-lg border border-neutral-200 text-xs uppercase font-medium placeholder:normal-case placeholder:font-normal focus:outline-none focus:border-[#D31728] focus:ring-1 focus:ring-[#D31728]/20"
            />
          </div>
          <button
            type="submit"
            className="h-9 px-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
          >
            Aplicar
          </button>
        </form>
      )}

      {couponMessage && (
        <p className={`text-[11px] font-medium ${couponMessage.error ? 'text-[#D31728]' : 'text-emerald-600'}`}>
          {couponMessage.text}
        </p>
      )}

      {/* Desglose de Totales */}
      <div className="space-y-1 pt-1 text-sm border-t border-neutral-100">
        <div className="flex items-center justify-between text-neutral-600 text-xs">
          <span>Subtotal</span>
          <span className="font-bold text-neutral-800">{formatMoney(subtotal)}</span>
        </div>

        {discount > 0 && (
          <div className="flex items-center justify-between text-emerald-600 text-xs font-bold">
            <span>Descuento aplicado</span>
            <span>-{formatMoney(discount)}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-neutral-900 font-black">Total productos</span>
          <span className="text-lg font-extrabold text-ink">{formatMoney(grandTotal)}</span>
        </div>
      </div>

      {sent ? (
        <div className="rounded-xl border border-[#16B959]/40 bg-[#E8F8EE] p-3 space-y-2">
          <div className="flex items-start gap-2 text-sm text-neutral-800">
            <CheckCircle2 className="w-5 h-5 text-[#16B959] shrink-0" aria-hidden="true" />
            <span>
              Abrimos WhatsApp con tu pedido. Si ya lo enviaste, puedes vaciar el carrito. Si no se abrió,
              vuelve a intentarlo.
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onClear}
              className="h-10 rounded-[10px] bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-black cursor-pointer"
            >
              Ya lo envié, vaciar
            </button>
            <button
              type="button"
              onClick={onSend}
              className="h-10 rounded-xl border border-neutral-300 text-neutral-800 text-xs font-bold hover:bg-neutral-50 cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onSend}
          className="w-full h-12 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-sm rounded-[10px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
        >
          <MessageCircle className="w-5 h-5 fill-white" aria-hidden="true" />
          <span>Enviar pedido por WhatsApp</span>
        </button>
      )}
    </div>
  );
};
