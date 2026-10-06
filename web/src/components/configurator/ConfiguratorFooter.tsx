import React from 'react';
import { Minus, Plus, MessageCircle } from 'lucide-react';
import { formatMoney } from '../../lib/money';

interface ConfiguratorFooterProps {
  quantity: number;
  onSetQuantity: (updater: (q: number) => number) => void;
  grandTotalPrice: number;
  onAddToCart: () => void;
  onComprarAhora: () => void;
  /** false mientras falten sabores o cremas por elegir */
  canSubmit?: boolean;
}

export const ConfiguratorFooter: React.FC<ConfiguratorFooterProps> = ({
  quantity,
  onSetQuantity,
  grandTotalPrice,
  onAddToCart,
  onComprarAhora,
  canSubmit = true,
}) => {
  return (
    <div className="shrink-0 z-20 bg-white border-t border-line-soft px-[18px] py-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <div className="flex items-center justify-between sm:justify-start gap-3">
        <div className="inline-flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSetQuantity((q) => Math.max(1, q - 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-ink text-white hover:bg-black transition-colors cursor-pointer"
            aria-label="Menos cantidad"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-8 text-center font-extrabold text-ink text-sm">{quantity}</span>
          <button
            type="button"
            onClick={() => onSetQuantity((q) => q + 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-[#E0DCD5] bg-white text-ink hover:border-ink transition-colors cursor-pointer"
            aria-label="Más cantidad"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="sm:hidden text-right">
          <span className="text-[11px] text-ink-muted block">Total</span>
          <span className="text-base font-extrabold text-ink">{formatMoney(grandTotalPrice)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-1 sm:justify-end">
        <button
          type="button"
          onClick={onAddToCart}
          disabled={!canSubmit}
          className="flex-1 sm:flex-none h-11 px-4 rounded-[10px] border-[1.5px] border-ink text-ink bg-white hover:bg-surface font-bold text-[13.5px] whitespace-nowrap flex items-center justify-center cursor-pointer transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
          aria-label="Agregar al pedido"
        >
          Agregar al pedido
        </button>

        <button
          type="button"
          onClick={onComprarAhora}
          disabled={!canSubmit}
          className="flex-1 sm:flex-none h-11 px-4 rounded-[10px] bg-brand-red hover:bg-brand-red-dark text-white font-bold text-[13.5px] flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="whitespace-nowrap"><span className="hidden sm:inline">Pedir por </span>WhatsApp<span className="hidden sm:inline"> · {formatMoney(grandTotalPrice)}</span></span>
        </button>
      </div>
    </div>
  );
};
