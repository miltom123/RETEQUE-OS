import React from 'react';
import { X, Bike, Store, MessageCircle } from 'lucide-react';
import { formatMoney } from '../../lib/money';
import { useCheckoutStore } from '../../store/checkoutStore';

interface DirectCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productName: string;
  quantity: number;
  grandTotalPrice: number;
  hasPizza: boolean;
  pizzasSummaryText: string;
  hasTequeños: boolean;
  targetTequeños: number;
  flavorsSummaryText: string;
  creamsSummaryText: string;
  includesDrink: boolean;
  selectedDrinkName?: string;
  errors: Record<string, string>;
}

export const DirectCheckoutModal: React.FC<DirectCheckoutModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  productName,
  quantity,
  grandTotalPrice,
  hasPizza,
  pizzasSummaryText,
  hasTequeños,
  targetTequeños,
  flavorsSummaryText,
  creamsSummaryText,
  includesDrink,
  selectedDrinkName,
  errors,
}) => {
  const { fullName, phone, deliveryType, address, setField } = useCheckoutStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10010] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="modal-in bg-surface rounded-[18px] max-w-lg w-full p-6 shadow-2xl space-y-4 text-left">
        <div className="flex items-center justify-between pb-3 border-b border-line-soft">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-ink">
              Datos para tu pedido en Tacna
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Se enviará tu pedido detallado a nuestro WhatsApp oficial.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-neutral-700 mb-1">
              Nombre completo <span className="text-[#D31728]">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setField('fullName', e.target.value)}
              placeholder="Ej. Milton Flores"
              className={`w-full h-10 px-3 rounded-[10px] border text-sm focus:outline-none focus:ring-2 ${
                errors.fullName ? 'border-[#D31728] focus:ring-[#D31728]/20' : 'border-neutral-200 focus:border-[#D31728]'
              }`}
            />
            {errors.fullName && (
              <p className="text-[11px] text-[#D31728] mt-1">{errors.fullName}</p>
            )}
          </div>

          <div>
            <label className="block font-bold text-neutral-700 mb-1">
              Celular / WhatsApp <span className="text-[#D31728]">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setField('phone', e.target.value)}
              placeholder="Ej. 912 266 950"
              className={`w-full h-10 px-3 rounded-[10px] border text-sm focus:outline-none focus:ring-2 ${
                errors.phone ? 'border-[#D31728] focus:ring-[#D31728]/20' : 'border-neutral-200 focus:border-[#D31728]'
              }`}
            />
            {errors.phone && (
              <p className="text-[11px] text-[#D31728] mt-1">{errors.phone}</p>
            )}
          </div>

          <div>
            <label className="block font-bold text-neutral-700 mb-1">Tipo de entrega</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setField('deliveryType', 'delivery')}
                className={`p-2.5 rounded-xl border-2 flex items-center justify-center gap-2 font-bold cursor-pointer ${
                  deliveryType === 'delivery'
                    ? 'border-[#D31728] bg-[#FFF0F1] text-[#D31728]'
                    : 'border-neutral-200 text-neutral-600'
                }`}
              >
                <Bike className="w-4 h-4" />
                <span>Delivery</span>
              </button>
              <button
                type="button"
                onClick={() => setField('deliveryType', 'recojo')}
                className={`p-2.5 rounded-xl border-2 flex items-center justify-center gap-2 font-bold cursor-pointer ${
                  deliveryType === 'recojo'
                    ? 'border-[#D31728] bg-[#FFF0F1] text-[#D31728]'
                    : 'border-neutral-200 text-neutral-600'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Recojo en tienda</span>
              </button>
            </div>
          </div>

          {deliveryType === 'delivery' && (
            <div>
              <label className="block font-bold text-neutral-700 mb-1">
                Dirección en Tacna <span className="text-[#D31728]">*</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setField('address', e.target.value)}
                placeholder="Ej. Av. San Martín 450, Tacna"
                className={`w-full h-10 px-3 rounded-[10px] border text-sm focus:outline-none focus:ring-2 ${
                  errors.address ? 'border-[#D31728] focus:ring-[#D31728]/20' : 'border-neutral-200 focus:border-[#D31728]'
                }`}
              />
              {errors.address && (
                <p className="text-[11px] text-[#D31728] mt-1">{errors.address}</p>
              )}
            </div>
          )}
        </div>

        {/* Order compact summary in modal */}
        <div className="bg-[#FFF8ED] border border-[#F5E4CE] rounded-2xl p-3.5 space-y-1.5 text-left text-xs">
          <div className="flex items-center justify-between font-black text-neutral-900 border-b border-[#F5E4CE]/80 pb-1.5">
            <span>{quantity} x {productName}</span>
            <span className="text-[#D31728]">{formatMoney(grandTotalPrice)}</span>
          </div>
          {hasPizza && (
            <p className="text-neutral-600">
              <span className="font-bold">Pizzas:</span> {pizzasSummaryText}
            </p>
          )}
          {hasTequeños && targetTequeños > 0 && (
            <p className="text-neutral-600">
              <span className="font-bold">Sabores:</span> {flavorsSummaryText}
            </p>
          )}
          <p className="text-neutral-600">
            <span className="font-bold">Cremas:</span> {creamsSummaryText}
          </p>
          {includesDrink && selectedDrinkName && (
            <p className="text-neutral-600">
              <span className="font-bold">Bebida:</span> {selectedDrinkName}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onConfirm}
          className="w-full h-12 bg-[#16B959] hover:bg-[#13A24D] text-white font-black text-sm rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
        >
          <MessageCircle className="w-5 h-5 fill-white" />
          <span>Continuar a WhatsApp ({formatMoney(grandTotalPrice)})</span>
        </button>
      </div>
    </div>
  );
};
