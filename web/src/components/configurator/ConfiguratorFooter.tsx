import React from 'react';
import { Minus, Plus, ShoppingCart, MessageCircle } from 'lucide-react';
import { formatMoney } from '../../lib/money';

interface ConfiguratorFooterProps {
  quantity: number;
  onSetQuantity: (updater: (q: number) => number) => void;
  grandTotalPrice: number;
  onAddToCart: () => void;
  onComprarAhora: () => void;
}

export const ConfiguratorFooter: React.FC<ConfiguratorFooterProps> = ({
  quantity,
  onSetQuantity,
  grandTotalPrice,
  onAddToCart,
  onComprarAhora,
}) => {
  return (
    <div className="fixed sm:absolute bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md border-t border-neutral-200 p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <div className="inline-flex items-center border border-neutral-300 rounded-xl p-1 bg-white">
          <button
            type="button"
            onClick={() => onSetQuantity((q) => Math.max(1, q - 1))}
            className="w-8 h-8 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 rounded-lg font-bold transition-colors"
            aria-label="Menos cantidad"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-9 text-center font-black text-neutral-900 text-sm">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => onSetQuantity((q) => q + 1)}
            className="w-8 h-8 flex items-center justify-center bg-[#C5161D] text-white rounded-lg font-bold hover:bg-[#A3001E] transition-colors"
            aria-label="Más cantidad"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="sm:hidden text-right">
          <span className="text-[11px] text-neutral-500 block">Total</span>
          <span className="text-base font-black text-[#C5161D]">{formatMoney(grandTotalPrice)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1 max-w-xl justify-end">
        <button
          type="button"
          onClick={onAddToCart}
          className="flex-1 sm:flex-none sm:min-w-[170px] h-11 px-5 rounded-xl border-2 border-[#C5161D] text-[#C5161D] hover:bg-[#FFF0F1] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
          aria-label="Agregar al carrito"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Agregar al carrito</span>
        </button>

        <button
          type="button"
          onClick={onComprarAhora}
          className="flex-1 sm:flex-none sm:min-w-[210px] h-11 px-6 rounded-xl bg-[#C5161D] hover:bg-[#A3001E] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors"
        >
          <MessageCircle className="w-4 h-4 fill-white" />
          <span>Pedir por WhatsApp ({formatMoney(grandTotalPrice)})</span>
        </button>
      </div>
    </div>
  );
};
