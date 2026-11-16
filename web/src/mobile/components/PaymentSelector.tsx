import React from 'react';
import { Banknote, Paperclip, Smartphone, Landmark, X } from 'lucide-react';
import { siteConfig } from '../../config/site';
import { formatMoney } from '../../lib/money';
import { PAY_METHODS, isDigitalPay, type PayMethod } from '../../lib/orderApi';

/** Método de pago y constancia (RFI-08). Sin pasarela: caja verifica la constancia a mano (RNF-12). */
interface PaymentSelectorProps {
  method: PayMethod | '';
  onChangeMethod: (method: PayMethod) => void;
  receipt: File | null;
  onChangeReceipt: (file: File | null) => void;
  total: number;
  error?: string;
}

const ICONS: Record<PayMethod, React.ElementType> = { Efectivo: Banknote, Yape: Smartphone, Plin: Smartphone, Transferencia: Landmark };

export const PaymentSelector: React.FC<PaymentSelectorProps> = ({ method, onChangeMethod, receipt, onChangeReceipt, total, error }) => {
  const digital = isDigitalPay(method);
  return (
    <div className="bg-white rounded-2xl border border-[#EFE6D6] p-4 space-y-3 shadow-sm">
      <h3 className="font-bold text-[#242424] text-sm">¿Cómo vas a pagar? <span className="text-[#C8102E]">*</span></h3>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Método de pago">
        {PAY_METHODS.map((m) => {
          const Icon = ICONS[m];
          const selected = method === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChangeMethod(m)}
              className={`h-11 rounded-xl border-2 flex items-center justify-center gap-2 text-xs font-bold transition cursor-pointer ${
                selected ? 'border-[#FF3038] bg-[#FFF8EE] text-[#C8102E]' : 'border-[#EFE6D6] bg-white text-[#4B4540]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {m}
            </button>
          );
        })}
      </div>
      {error && <p className="text-[11px] text-[#C8102E] font-bold">{error}</p>}

      {method === 'Efectivo' && (
        <p className="text-[11px] text-[#4B4540] bg-[#FFF8EE] border border-[#EFE6D6] p-3 rounded-xl">
          Pagas al recibir (o al recoger). Si necesitas vuelto, indícalo en las notas.
        </p>
      )}

      {digital && (
        <div className="space-y-2.5 bg-[#FFF8EE] border border-[#EFE6D6] p-3 rounded-xl text-[11px] text-[#4B4540]">
          <p>
            {method === 'Transferencia' ? 'Transfiere' : `Paga por ${method}`} <strong className="text-[#242424]">{formatMoney(total)}</strong> al{' '}
            <strong className="text-[#242424]">{siteConfig.yape.number}</strong> ({siteConfig.yape.holder}). El costo del delivery se coordina aparte.
          </p>
          {receipt ? (
            <div className="flex items-center justify-between gap-2 bg-white border border-[#EFE6D6] rounded-lg px-3 py-2">
              <span className="truncate font-bold text-[#242424]">📎 {receipt.name}</span>
              <button type="button" aria-label="Quitar constancia" onClick={() => onChangeReceipt(null)} className="text-[#C8102E] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 h-10 rounded-lg border border-dashed border-[#D9CDBB] bg-white font-bold text-[#242424] cursor-pointer">
              <Paperclip className="w-4 h-4" />
              Adjuntar constancia (foto o captura)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => onChangeReceipt(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
          <p>Si aún no pagas, puedes adjuntarla después desde el seguimiento de tu pedido. Caja la verifica antes de enviar a cocina.</p>
        </div>
      )}
    </div>
  );
};
