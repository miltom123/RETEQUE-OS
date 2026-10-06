import React from 'react';
import { Bike, Store, MapPin, Info } from 'lucide-react';
import { FulfillmentType } from '../../types/orderRequest';
import { siteConfig } from '../../config/site';

interface FulfillmentSelectorProps {
  type: FulfillmentType;
  address: string;
  reference: string;
  onChangeType: (type: FulfillmentType) => void;
  onChangeAddress: (address: string) => void;
  onChangeReference: (reference: string) => void;
  errors?: { address?: string };
}

export const FulfillmentSelector: React.FC<FulfillmentSelectorProps> = ({
  type,
  address,
  reference,
  onChangeType,
  onChangeAddress,
  onChangeReference,
  errors = {},
}) => {
  return (
    <div className="bg-white rounded-2xl border border-[#EFE6D6] p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[#242424] text-sm">
          ¿Cómo deseas recibir tu pedido?
        </h3>
        <span className="text-[11px] font-bold text-[#FF3038] bg-[#FFF2DF] px-2 py-0.5 rounded-full">
          Preferencia
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5" role="radiogroup">
        <button
          type="button"
          onClick={() => onChangeType('delivery')}
          role="radio"
          aria-checked={type === 'delivery'}
          className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 text-center transition cursor-pointer ${
            type === 'delivery'
              ? 'border-[#FF3038] bg-[#FFF8EE] text-[#FF3038]'
              : 'border-[#EFE6D6] bg-white text-[#6B6662] hover:border-[#F5A623]/50'
          }`}
        >
          <Bike className="w-5 h-5" />
          <span className="font-bold text-xs">Delivery</span>
          <span className="text-[10px] text-[#8C867F]">Por WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeType('pickup')}
          role="radio"
          aria-checked={type === 'pickup'}
          className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 text-center transition cursor-pointer ${
            type === 'pickup'
              ? 'border-[#FF3038] bg-[#FFF8EE] text-[#FF3038]'
              : 'border-[#EFE6D6] bg-white text-[#6B6662] hover:border-[#F5A623]/50'
          }`}
        >
          <Store className="w-5 h-5" />
          <span className="font-bold text-xs">Recojo en tienda</span>
          <span className="text-[10px] text-[#8C867F]">Local Tacna</span>
        </button>
      </div>

      {type === 'delivery' ? (
        <div className="space-y-3 pt-2 border-t border-[#F5EDE1]">
          <div>
            <label
              htmlFor="mobile-address"
              className="block text-xs font-bold text-[#242424] mb-1"
            >
              Dirección de entrega en Tacna <span className="text-[#FF3038]">*</span>
            </label>
            <div className="relative">
              <input
                id="mobile-address"
                type="text"
                value={address}
                onChange={(e) => onChangeAddress(e.target.value)}
                placeholder="Ej. Av. Bolognesi 845 / Urb. Vigil"
                className={`w-full h-11 px-3.5 rounded-xl border text-xs bg-[#FFFDF9] focus:outline-none transition ${
                  errors.address
                    ? 'border-[#FF3038] focus:ring-2 focus:ring-[#FF3038]/20'
                    : 'border-[#EFE6D6] focus:border-[#FF3038] focus:ring-2 focus:ring-[#FF3038]/10'
                }`}
              />
            </div>
            {errors.address && (
              <p className="text-[11px] text-[#FF3038] font-bold mt-1">
                {errors.address}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="mobile-reference"
              className="block text-xs font-bold text-[#242424] mb-1"
            >
              Referencia <span className="text-[#8C867F] font-normal">(opcional)</span>
            </label>
            <input
              id="mobile-reference"
              type="text"
              value={reference}
              onChange={(e) => onChangeReference(e.target.value)}
              placeholder="Ej. Frente al colegio, portón negro"
              className="w-full h-11 px-3.5 rounded-xl border border-[#EFE6D6] text-xs bg-[#FFFDF9] focus:outline-none focus:border-[#FF3038] focus:ring-2 focus:ring-[#FF3038]/10 transition"
            />
          </div>

          <div className="flex items-start gap-2 bg-[#FFF8EE] border border-[#EFE6D6] p-3 rounded-xl text-[11px] text-[#6B6662]">
            <Info className="w-4 h-4 text-[#F5A623] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[#242424]">Costo de envío:</p>
              <p>A coordinar por WhatsApp según la distancia con el repartidor.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#FFF8EE] border border-[#EFE6D6] p-3.5 rounded-xl space-y-2 text-xs">
          <div className="flex items-center gap-2 text-[#FF3038] font-bold">
            <MapPin className="w-4 h-4" />
            <span>Punto de recojo oficial</span>
          </div>
          <p className="font-bold text-[#242424]">{siteConfig.address}</p>
          <p className="text-[11px] text-[#6B6662]">
            Horario de atención: {siteConfig.hours}
          </p>
          <p className="text-[11px] text-[#8C867F] italic">
            Sin costo de envío. Tu pedido se alistará para que lo recojas recién salido de cocina.
          </p>
        </div>
      )}
    </div>
  );
};
