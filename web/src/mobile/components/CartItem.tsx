import React from 'react';
import { Trash2, Plus, Minus } from 'lucide-react';
import { CartItem as CartItemType } from '../../types/cart';
import { formatMoney } from '../../lib/money';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { useCartStore } from '../../store/cartStore';

interface CartItemProps {
  item: CartItemType;
}

export const CartItem: React.FC<CartItemProps> = ({ item }) => {
  const { updateQuantity, removeItem } = useCartStore();

  const lineTotal = item.unitPrice * item.quantity;

  return (
    <div className="bg-white rounded-2xl border border-[#EFE6D6] p-2.5 sm:p-3 flex gap-3 shadow-xs items-center relative transition-all overflow-hidden group">
      {/* Imagen cuadrada compacta y estandarizada (64px) */}
      <div className="w-16 h-16 rounded-xl bg-[#FFF2DF] overflow-hidden shrink-0 relative shadow-inner">
        <ImageWithFallback
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />
      </div>

      {/* Contenido del item */}
      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
        <div>
          <div className="flex items-start justify-between gap-1.5">
            <h4 className="font-bold text-[#242424] text-xs sm:text-sm leading-snug line-clamp-1">
              {item.name}
            </h4>
            <button
              type="button"
              onClick={() => removeItem(item.lineId)}
              className="text-[#8C867F] hover:text-[#FF3038] p-0.5 transition cursor-pointer shrink-0"
              title="Eliminar del pedido"
              aria-label={`Eliminar ${item.name} del pedido`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Presentación (ej. 10 unid., Familiar, etc.) */}
          {item.selectedPresentation && (
            <p className="text-[11px] font-semibold text-[#8C867F] leading-tight mt-0.5">
              {item.selectedPresentation}
            </p>
          )}

          {/* Opciones / salsas seleccionadas en badges compactos */}
          {item.selectedOptions && item.selectedOptions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {item.selectedOptions.map((opt, i) => (
                <span
                  key={i}
                  className="inline-block bg-[#FFF8EE] text-[#C57A18] text-[9.5px] font-semibold px-1.5 py-0.2 rounded-md border border-[#F5EDE1] leading-tight"
                >
                  {opt}
                </span>
              ))}
            </div>
          )}

          {/* Indicaciones para cocina */}
          {item.notes && (
            <p className="text-[10.5px] text-[#6B6662] italic mt-1 bg-[#FFFDF9] px-1.5 py-0.5 rounded border border-[#F5EDE1] line-clamp-1">
              📝 {item.notes}
            </p>
          )}
        </div>

        {/* Fila de Precio y Selector de Cantidad */}
        <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-[#F5EDE1]/70">
          {/* Precio: en una sola línea estricta */}
          <span className="font-black text-[#FF3038] text-sm sm:text-base font-display whitespace-nowrap shrink-0 leading-none">
            {formatMoney(lineTotal)}
          </span>

          {/* Selector de cantidad compacto y estandarizado */}
          <div className="flex items-center gap-1.5 bg-[#FAF8F4] border border-[#EFE6D6] rounded-xl px-1.5 py-0.5 shrink-0 shadow-xs">
            <button
              type="button"
              onClick={() => updateQuantity(item.lineId, -1)}
              className="w-5.5 h-5.5 rounded-lg flex items-center justify-center text-[#242424] hover:bg-white active:scale-90 transition cursor-pointer"
              title="Disminuir cantidad"
              aria-label="Disminuir cantidad"
            >
              <Minus className="w-3 h-3 stroke-[2.5]" />
            </button>
            <span className="font-bold text-xs text-[#242424] min-w-4 text-center select-none">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => updateQuantity(item.lineId, 1)}
              className="w-5.5 h-5.5 rounded-lg flex items-center justify-center text-[#242424] hover:bg-white active:scale-90 transition cursor-pointer"
              title="Aumentar cantidad"
              aria-label="Aumentar cantidad"
            >
              <Plus className="w-3 h-3 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
