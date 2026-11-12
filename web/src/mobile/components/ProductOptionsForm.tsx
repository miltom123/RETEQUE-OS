import React, { useState } from 'react';
import { Check, Minus, Plus, ShoppingCart } from 'lucide-react';
import { CREMAS_EXTRAS } from '../../data/catalog';
import { CREAMS } from '../../components/configurator/configuratorData';
import { Product, ProductOption, getProductPrice } from '../../types/product';
import { formatMoney, roundMoney } from '../../lib/money';
import { kitchenDetails, specFromItem, type LineSpec } from '../../lib/cartSpec';
import { sanitizeFreeText } from '../../lib/validation';
import { useCartStore } from '../../store/cartStore';
import { useUiStore } from '../../store/uiStore';

/**
 * Opciones de un producto de la carta (RFI-03): tamaño, cremas incluidas, extras con precio,
 * cantidad y notas para cocina. Los extras usan los mismos IDs que el servidor, que recalcula el precio.
 */
const INCLUDED_CREAMS = 2;
const MAX_QTY = 50;

/** Extras con precio que el servidor acepta para este producto. */
function extrasFor(product: Product): ProductOption[] {
  if (product.category === 'tequenos') return CREMAS_EXTRAS;
  return product.extras || [];
}

interface ProductOptionsFormProps {
  product: Product;
  onAdded?: () => void;
  /** 'page': ficha completa con pie fijo; 'modal': dentro de una hoja. */
  layout?: 'page' | 'modal';
}

export const ProductOptionsForm: React.FC<ProductOptionsFormProps> = ({ product, onAdded, layout = 'page' }) => {
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useUiStore((s) => s.showToast);
  const presentations = product.presentations || [];
  const extras = extrasFor(product);
  const isTequeno = product.category === 'tequenos';

  const [presentation, setPresentation] = useState<ProductOption | undefined>(presentations[0]);
  const [quantity, setQuantity] = useState(1);
  const [included, setIncluded] = useState<string[]>(isTequeno ? CREAMS.slice(0, INCLUDED_CREAMS).map((c) => c.id) : []);
  const [extraCounts, setExtraCounts] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');

  const base = presentation ? presentation.price : getProductPrice(product);
  const extrasPrice = extras.reduce((sum, e) => sum + e.price * (extraCounts[e.id] || 0), 0);
  const unitPrice = roundMoney(base + extrasPrice);

  const toggleIncluded = (id: string) =>
    setIncluded((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : prev.length >= INCLUDED_CREAMS ? [...prev.slice(1), id] : [...prev, id]));
  const changeExtra = (id: string, delta: number) =>
    setExtraCounts((prev) => {
      const next = Math.max(0, Math.min(10, (prev[id] || 0) + delta));
      const copy = { ...prev };
      if (next) copy[id] = next; else delete copy[id];
      return copy;
    });

  const handleAdd = () => {
    const creamLabels = included.map((id) => `Crema incluida: ${CREAMS.find((c) => c.id === id)?.name.replace(' (2 oz)', '') || id}`);
    const extraLabels = extras.filter((e) => extraCounts[e.id]).map((e) => `+ ${extraCounts[e.id]} x ${e.label}`);
    const baseSpec = specFromItem({ productId: product.id, selectedPresentation: presentation?.label });
    const spec: LineSpec | undefined = baseSpec && {
      ...baseSpec,
      ...(Object.keys(extraCounts).length ? { extras: extraCounts } : {}),
      details: kitchenDetails([...creamLabels, notes.trim()]),
    };
    if (!addItem({
      productId: product.id,
      name: product.name,
      image: product.image,
      quantity,
      unitPrice,
      selectedPresentation: presentation?.label,
      selectedOptions: [...creamLabels, ...extraLabels],
      notes: notes.trim() || undefined,
      spec,
    })) return;
    showToast({ message: `¡${quantity} × ${product.name} agregado al pedido!`, action: 'cart' });
    onAdded?.();
  };

  const card = 'bg-white p-4 rounded-2xl border border-[#EFE6D6] space-y-2.5 shadow-sm';

  return (
    <>
      <div className={layout === 'page' ? 'p-4 space-y-4' : 'space-y-3'}>
        {presentations.length > 1 && (
          <div className={card}>
            <span className="font-bold text-xs text-[#242424] block">Elige el tamaño:</span>
            <div className="grid grid-cols-2 gap-2">
              {presentations.map((pres) => (
                <button
                  key={pres.id}
                  type="button"
                  aria-pressed={presentation?.id === pres.id}
                  onClick={() => setPresentation(pres)}
                  className={`p-3 rounded-xl border-2 text-left transition cursor-pointer flex flex-col ${
                    presentation?.id === pres.id ? 'border-[#FF3038] bg-[#FFF8EE] text-[#C8102E]' : 'border-[#EFE6D6] bg-white text-[#242424]'
                  }`}
                >
                  <span className="font-bold text-xs">{pres.label}</span>
                  <span className="font-black text-sm mt-1 text-[#C8102E] font-display">{formatMoney(pres.price)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {isTequeno && (
          <div className={card}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#242424]">Cremas incluidas</span>
              <span className="text-[10px] font-bold text-[#C8102E] bg-[#FFF2DF] px-2 py-0.5 rounded-full">Elige {INCLUDED_CREAMS} gratis</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CREAMS.map((cream) => {
                const on = included.includes(cream.id);
                return (
                  <button
                    key={cream.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleIncluded(cream.id)}
                    className={`px-3 py-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                      on ? 'border-[#FF3038] bg-[#FFF8EE] text-[#C8102E] font-bold' : 'border-[#EFE6D6] bg-white text-[#4B4540] font-medium'
                    }`}
                  >
                    <span className="text-xs truncate">{cream.name.replace(' (2 oz)', '')}</span>
                    <span className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${on ? 'bg-[#FF3038] border-[#FF3038] text-white' : 'border-[#D9CDBB]'}`}>
                      {on && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {extras.length > 0 && (
          <div className={card}>
            <span className="font-bold text-xs text-[#242424] block">{isTequeno ? 'Cremas extra (2 oz)' : 'Adicionales'}</span>
            {extras.map((extra) => (
              <div key={extra.id} className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#242424]">{extra.label} <span className="text-[#4B4540]">+{formatMoney(extra.price)}</span></span>
                <div className="flex items-center gap-1.5">
                  <button type="button" aria-label={`Quitar ${extra.label}`} onClick={() => changeExtra(extra.id, -1)} disabled={!extraCounts[extra.id]} className="w-7 h-7 rounded-lg border border-[#EFE6D6] flex items-center justify-center disabled:opacity-40 cursor-pointer"><Minus className="w-3.5 h-3.5" /></button>
                  <span className="w-5 text-center text-xs font-bold">{extraCounts[extra.id] || 0}</span>
                  <button type="button" aria-label={`Agregar ${extra.label}`} onClick={() => changeExtra(extra.id, 1)} className="w-7 h-7 rounded-lg border border-[#EFE6D6] flex items-center justify-center cursor-pointer"><Plus className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={card}>
          <label htmlFor={`notes-${product.id}`} className="font-bold text-xs text-[#242424] block">Notas para cocina:</label>
          <input
            id={`notes-${product.id}`}
            type="text"
            value={notes}
            maxLength={100}
            onChange={(e) => setNotes(sanitizeFreeText(e.target.value, 100))}
            placeholder="Ej. bien doraditos, cremas aparte…"
            className="w-full h-11 px-3.5 rounded-xl border border-[#EFE6D6] text-xs bg-[#FFFDF9] focus:outline-none focus:border-[#FF3038] transition"
          />
        </div>
      </div>

      <div className={`${layout === 'page' ? 'sticky bottom-0 z-30 p-3.5' : 'pt-3 mt-3'} bg-white/95 backdrop-blur-md border-t border-[#EFE6D6]`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#FFF8EE] border border-[#EFE6D6] rounded-xl px-2 py-1.5">
            <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Disminuir cantidad" className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"><Minus className="w-4 h-4" /></button>
            <span className="font-bold text-sm min-w-5 text-center" aria-live="polite">{quantity}</span>
            <button type="button" onClick={() => setQuantity(Math.min(MAX_QTY, quantity + 1))} aria-label="Aumentar cantidad" className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"><Plus className="w-4 h-4" /></button>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="flex-1 h-12 bg-[#FF3038] hover:bg-[#E52B33] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-between px-4 transition active:scale-[0.98] shadow-md cursor-pointer"
          >
            <span className="flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Agregar</span>
            <span className="font-display font-black text-base">{formatMoney(unitPrice * quantity)}</span>
          </button>
        </div>
      </div>
    </>
  );
};
