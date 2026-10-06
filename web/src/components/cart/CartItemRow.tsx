import React from 'react';
import { Trash2, Plus, Minus } from 'lucide-react';
import { formatMoney } from '../../lib/money';
import { ImageWithFallback } from '../ui/ImageWithFallback';
import type { CartItem } from '../../store/cartStore';

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (lineId: string, delta: number) => void;
  onRemoveItem: (lineId: string) => void;
}

export const CartItemRow: React.FC<CartItemRowProps> = ({
  item,
  onUpdateQuantity,
  onRemoveItem,
}) => {
  return (
    <li className="p-3 rounded-xl border border-line-soft bg-white space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <ImageWithFallback
            src={item.image}
            alt=""
            className="w-14 h-14 rounded-lg object-cover border border-neutral-200 shrink-0"
            loading="lazy"
          />
          <div className="min-w-0">
            <h3 className="font-black text-sm text-neutral-900 leading-snug line-clamp-2">{item.name}</h3>
            {item.selectedPresentation && (
              <p className="text-[11px] text-neutral-600 line-clamp-1">{item.selectedPresentation}</p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRemoveItem(item.lineId)}
          className="text-neutral-400 hover:text-[#D31728] p-2 -m-1 rounded-lg cursor-pointer"
          aria-label={`Quitar ${item.name}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {item.selectedOptions && item.selectedOptions.length > 0 && (
        <ul className="text-[11.5px] text-ink-soft font-medium pl-1 space-y-0.5">
          {item.selectedOptions.map((opt, idx) => (
            <li key={idx}>• {opt}</li>
          ))}
        </ul>
      )}
      {item.notes && <p className="text-[11px] text-neutral-600 pl-1">📝 {item.notes}</p>}

      <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60">
        <div className="inline-flex items-center gap-1.5" role="group" aria-label="Cantidad">
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.lineId, -1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-ink text-white hover:bg-black cursor-pointer"
            aria-label="Quitar uno"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="w-8 text-center font-black text-neutral-900 text-sm" aria-live="polite">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.lineId, 1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E0DCD5] bg-white text-ink hover:border-ink cursor-pointer"
            aria-label="Agregar uno"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <span className="font-black text-sm text-neutral-900">
          {formatMoney(item.unitPrice * item.quantity)}
        </span>
      </div>
    </li>
  );
};
