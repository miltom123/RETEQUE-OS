import React from 'react';
import { Bike, Store, MapPin } from 'lucide-react';
import { useCheckoutStore } from '../../store/checkoutStore';
import { siteConfig } from '../../config/site';
import { TACNA_ZONES, TacnaZone } from '../../config/tacnaZones';

interface CartCustomerFormProps {
  errors: Record<string, string>;
  selectedZone: TacnaZone;
  onSelectZone: (zone: TacnaZone) => void;
}

const inputClass = (hasError: boolean) =>
  `w-full h-11 px-3 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 ${
    hasError ? 'border-[#C5161D] focus:ring-[#C5161D]/25' : 'border-neutral-200 focus:border-[#C5161D] focus:ring-[#C5161D]/15'
  }`;

export const CartCustomerForm: React.FC<CartCustomerFormProps> = ({
  errors,
  selectedZone,
  onSelectZone,
}) => {
  const { fullName, phone, deliveryType, address, reference, generalNotes, setField } = useCheckoutStore();

  return (
    <div className="pt-3 border-t border-neutral-200 space-y-3 text-sm">
      <div className="font-black text-neutral-900">Datos para la entrega</div>

      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de entrega">
        <button
          type="button"
          onClick={() => setField('deliveryType', 'delivery')}
          className={`h-11 rounded-xl border-2 flex items-center justify-center gap-2 font-black text-xs cursor-pointer transition-colors ${
            deliveryType === 'delivery'
              ? 'border-[#C5161D] bg-[#FFF0F1] text-[#C5161D]'
              : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
          }`}
          role="radio"
          aria-checked={deliveryType === 'delivery'}
        >
          <Bike className="w-4 h-4" aria-hidden="true" />
          <span>Delivery</span>
        </button>

        <button
          type="button"
          onClick={() => setField('deliveryType', 'recojo')}
          className={`h-11 rounded-xl border-2 flex items-center justify-center gap-2 font-black text-xs cursor-pointer transition-colors ${
            deliveryType === 'recojo'
              ? 'border-[#C5161D] bg-[#FFF0F1] text-[#C5161D]'
              : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
          }`}
          role="radio"
          aria-checked={deliveryType === 'recojo'}
        >
          <Store className="w-4 h-4" aria-hidden="true" />
          <span>Recojo en tienda</span>
        </button>
      </div>

      <div>
        <label htmlFor="cart-nombre" className="block text-xs font-bold text-neutral-700 mb-1">
          Nombre completo <span className="text-[#C5161D]">*</span>
        </label>
        <input
          id="cart-nombre"
          type="text"
          value={fullName}
          onChange={(e) => setField('fullName', e.target.value)}
          placeholder="Ej. Milton Flores"
          className={inputClass(Boolean(errors.fullName))}
          aria-invalid={Boolean(errors.fullName)}
        />
        {errors.fullName && <p className="text-[11px] text-[#C5161D] mt-1 font-bold">{errors.fullName}</p>}
      </div>

      <div>
        <label htmlFor="cart-celular" className="block text-xs font-bold text-neutral-700 mb-1">
          Celular en Tacna (9 dígitos) <span className="text-[#C5161D]">*</span>
        </label>
        <input
          id="cart-celular"
          type="tel"
          value={phone}
          onChange={(e) => setField('phone', e.target.value.replace(/[^\d\s]/g, ''))}
          placeholder="Ej. 912 266 950"
          className={inputClass(Boolean(errors.phone))}
          aria-invalid={Boolean(errors.phone)}
        />
        {errors.phone && <p className="text-[11px] text-[#C5161D] mt-1 font-bold">{errors.phone}</p>}
      </div>

      {deliveryType === 'delivery' && (
        <>
          <div>
            <label htmlFor="cart-zona" className="block text-xs font-bold text-neutral-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#C5161D]" />
                Distrito / Zona en Tacna <span className="text-[#C5161D]">*</span>
              </span>
              <span className="text-amber-700 font-bold text-[11px]">Por coordinar</span>
            </label>
            <select
              id="cart-zona"
              value={selectedZone.id}
              onChange={(e) => {
                const found = TACNA_ZONES.find((z) => z.id === e.target.value);
                if (found) onSelectZone(found);
              }}
              className="w-full h-11 px-3 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:border-[#C5161D] focus:ring-2 focus:ring-[#C5161D]/15 cursor-pointer font-medium"
            >
              {TACNA_ZONES.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name} ({zone.timeEstimate})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-neutral-500 mt-1.5 flex items-center gap-1.5 bg-neutral-50 p-2 rounded-lg border border-neutral-200/60">
              <span>🛵</span>
              <span><strong>Costo de envío:</strong> Lo fija y cobra directamente el repartidor según la zona.</span>
            </p>
          </div>

          <div>
            <label htmlFor="cart-direccion" className="block text-xs font-bold text-neutral-700 mb-1">
              Dirección de entrega <span className="text-[#C5161D]">*</span>
            </label>
            <input
              id="cart-direccion"
              type="text"
              value={address}
              onChange={(e) => setField('address', e.target.value)}
              placeholder="Ej. Calle Alto Lima 1488, Tacna"
              className={inputClass(Boolean(errors.address))}
              aria-invalid={Boolean(errors.address)}
            />
            {errors.address && <p className="text-[11px] text-[#C5161D] mt-1 font-bold">{errors.address}</p>}
          </div>

          <div>
            <label htmlFor="cart-referencia" className="block text-xs font-bold text-neutral-700 mb-1">
              Referencia <span className="text-neutral-400 font-medium">(opcional)</span>
            </label>
            <input
              id="cart-referencia"
              type="text"
              value={reference}
              onChange={(e) => setField('reference', e.target.value)}
              placeholder="Ej. Frente al parque, puerta verde"
              className={inputClass(false)}
            />
          </div>
        </>
      )}

      <div>
        <label htmlFor="cart-notas" className="block text-xs font-bold text-neutral-700 mb-1">
          Indicaciones <span className="text-neutral-400 font-medium">(opcional)</span>
        </label>
        <textarea
          id="cart-notas"
          value={generalNotes}
          onChange={(e) => setField('generalNotes', e.target.value.slice(0, 200))}
          placeholder="Ej. Cremas aparte, sin servilletas"
          rows={2}
          className="w-full p-3 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:border-[#C5161D] focus:ring-2 focus:ring-[#C5161D]/15 resize-none"
        />
      </div>

      <p className="text-[11px] text-neutral-500">{siteConfig.deliveryNote}.</p>
    </div>
  );
};
