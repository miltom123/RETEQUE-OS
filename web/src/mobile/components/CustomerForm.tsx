import React from 'react';
import { User, Phone, FileText } from 'lucide-react';

interface CustomerFormProps {
  name: string;
  phone: string;
  notes: string;
  onChangeName: (name: string) => void;
  onChangePhone: (phone: string) => void;
  onChangeNotes: (notes: string) => void;
  errors?: { name?: string; phone?: string };
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  name,
  phone,
  notes,
  onChangeName,
  onChangePhone,
  onChangeNotes,
  errors = {},
}) => {
  return (
    <div className="bg-white rounded-2xl border border-[#EFE6D6] p-4 space-y-3.5 shadow-sm">
      <h3 className="font-bold text-[#242424] text-sm flex items-center gap-2">
        <User className="w-4 h-4 text-[#FF3038]" />
        <span>Tus datos de contacto</span>
      </h3>

      <div>
        <label
          htmlFor="mobile-name"
          className="block text-xs font-bold text-[#242424] mb-1"
        >
          Nombre completo <span className="text-[#FF3038]">*</span>
        </label>
        <input
          id="mobile-name"
          type="text"
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="Ej. Milton Flores"
          className={`w-full h-11 px-3.5 rounded-xl border text-xs bg-[#FFFDF9] focus:outline-none transition ${
            errors.name
              ? 'border-[#FF3038] focus:ring-2 focus:ring-[#FF3038]/20'
              : 'border-[#EFE6D6] focus:border-[#FF3038] focus:ring-2 focus:ring-[#FF3038]/10'
          }`}
        />
        {errors.name && (
          <p className="text-[11px] text-[#FF3038] font-bold mt-1">{errors.name}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="mobile-phone"
          className="block text-xs font-bold text-[#242424] mb-1 flex items-center justify-between"
        >
          <span>
            Celular (WhatsApp) <span className="text-[#FF3038]">*</span>
          </span>
          <span className="text-[10px] text-[#8C867F] font-normal">9 dígitos</span>
        </label>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-bold text-[#8C867F] pointer-events-none">
            <Phone className="w-3.5 h-3.5" />
            <span>+51</span>
          </div>
          <input
            id="mobile-phone"
            type="tel"
            maxLength={11}
            value={phone}
            onChange={(e) => onChangePhone(e.target.value.replace(/[^\d\s]/g, ''))}
            placeholder="912 345 678"
            className={`w-full h-11 pl-14 pr-3.5 rounded-xl border text-xs bg-[#FFFDF9] focus:outline-none transition font-medium ${
              errors.phone
                ? 'border-[#FF3038] focus:ring-2 focus:ring-[#FF3038]/20'
                : 'border-[#EFE6D6] focus:border-[#FF3038] focus:ring-2 focus:ring-[#FF3038]/10'
            }`}
          />
        </div>
        {errors.phone && (
          <p className="text-[11px] text-[#FF3038] font-bold mt-1">{errors.phone}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="mobile-notes"
          className="block text-xs font-bold text-[#242424] mb-1 flex items-center gap-1"
        >
          <FileText className="w-3.5 h-3.5 text-[#8C867F]" />
          <span>Observaciones para la cocina <span className="font-normal text-[#8C867F]">(opcional)</span></span>
        </label>
        <textarea
          id="mobile-notes"
          value={notes}
          onChange={(e) => onChangeNotes(e.target.value.slice(0, 200))}
          placeholder="Ej. Servilletas extra, cremas separadas, tocar timbre..."
          rows={2}
          className="w-full p-3 rounded-xl border border-[#EFE6D6] text-xs bg-[#FFFDF9] focus:outline-none focus:border-[#FF3038] focus:ring-2 focus:ring-[#FF3038]/10 resize-none transition"
        />
      </div>
    </div>
  );
};
