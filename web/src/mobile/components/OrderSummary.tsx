import React from 'react';
import { Tag } from 'lucide-react';
import { formatMoney } from '../../lib/money';
import { FulfillmentType } from '../../types/orderRequest';

interface OrderSummaryProps {
  subtotal: number;
  discount: number;
  totalProducts: number;
  fulfillmentType: FulfillmentType;
  couponCode?: string;
  itemCount: number;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  subtotal,
  discount,
  totalProducts,
  fulfillmentType,
  couponCode,
  itemCount,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-[#EFE6D6] p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between pb-2 border-b border-[#F5EDE1]">
        <h3 className="font-bold text-[#242424] text-sm">Resumen del pedido</h3>
        <span className="text-xs text-[#8C867F] font-bold">
          {itemCount} {itemCount === 1 ? 'producto' : 'productos'}
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between text-[#6B6662]">
          <span>Subtotal de productos</span>
          <span className="font-bold text-[#242424]">{formatMoney(subtotal)}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-emerald-600 font-bold items-center">
            <span className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              <span>Descuento {couponCode ? `(${couponCode})` : ''}</span>
            </span>
            <span>-{formatMoney(discount)}</span>
          </div>
        )}

        <div className="flex justify-between text-[#6B6662] pt-1">
          <span>Modalidad de entrega</span>
          <span className="font-bold text-[#242424]">
            {fulfillmentType === 'delivery' ? 'Delivery a coordinar' : 'Recojo en tienda (Gratis)'}
          </span>
        </div>

        {fulfillmentType === 'delivery' && (
          <div className="text-[11px] text-amber-700 bg-amber-50/70 border border-amber-200/50 p-2 rounded-lg">
            🛵 <strong>Costo de envío:</strong> A coordinar por WhatsApp según la distancia.
          </div>
        )}

        <div className="flex items-baseline justify-between pt-3 border-t border-[#F5EDE1]">
          <div>
            <span className="block font-black text-[#242424] text-sm">
              Total de productos
            </span>
            {fulfillmentType === 'delivery' && (
              <span className="text-[10px] text-[#8C867F] block">
                (+ costo de envío por WhatsApp)
              </span>
            )}
          </div>
          <span className="font-black text-[#FF3038] text-xl font-display">
            {formatMoney(totalProducts)}
          </span>
        </div>
      </div>
    </div>
  );
};
