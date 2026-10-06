import React, { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { PRODUCTS, Product } from '../../data/catalog';
import { formatMoney } from '../../lib/money';
import { productUnitPrice, useProductActions } from '../../lib/productActions';
import { SegmentedControl } from './SegmentedControl';
import type { ExtraTab } from './CategoryNav';

const META: Record<ExtraTab, { title: string; subtitle: string; label: string }> = {
  pastelitos: { label: 'Pastelitos', title: 'Pastelitos crujientes', subtitle: 'Masa hojaldrada dorada rellena de abundante queso derretido' },
  bebidas: { label: 'Bebidas', title: 'Bebidas heladas', subtitle: 'Gaseosas bien heladas y chicha morada artesanal para acompañar tus tequeños' },
  cremas: { label: 'Cremas', title: 'Cremas y salsas artesanales (2 oz)', subtitle: 'El secreto de un buen tequeño: sumérgelos en nuestras salsas caseras' },
};

const byCategory = (c: ExtraTab) => PRODUCTS.filter((p) => p.category === c);

const ExtraRow: React.FC<{ product: Product; index: number }> = ({ product, index }) => {
  const { quickAdd } = useProductActions();
  const [added, setAdded] = useState(false);
  // Pastelitos y bebidas comparten una sola foto en el repo: solo las cremas muestran imagen.
  const showImage = product.category === 'cremas';

  return (
    <div
      className="reveal flex items-center gap-3 p-3 pl-3.5 bg-white border border-line-soft rounded-xl transition-shadow hover:shadow-[0_10px_24px_-18px_rgba(0,0,0,.3)] hover:border-[#E0DCD5]"
      style={{ '--d': index % 6 } as React.CSSProperties}
    >
      {showImage && <img src={product.image} alt="" className="w-[42px] h-[42px] rounded-full object-cover shrink-0" loading="lazy" />}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-sm font-bold">{product.name}</span>
        {product.description && <span className="text-[12.5px] text-ink-muted leading-snug">{product.description}</span>}
      </div>
      <span className="text-sm font-extrabold whitespace-nowrap">{formatMoney(productUnitPrice(product))}</span>
      <button
        type="button"
        aria-label={`Agregar ${product.name} al pedido`}
        onClick={() => {
          quickAdd(product);
          setAdded(true);
          setTimeout(() => setAdded(false), 1100);
        }}
        className={`w-8 h-8 rounded-[9px] border flex items-center justify-center shrink-0 transition-colors ${
          added ? 'bg-[#16A34A] border-[#16A34A] text-white' : 'bg-white border-[#E0DCD5] text-ink hover:border-ink'
        }`}
      >
        {added ? <Check className="w-4 h-4 stroke-[3]" /> : <Plus className="w-4 h-4 stroke-[2.6]" />}
      </button>
    </div>
  );
};

interface ExtrasSectionProps {
  value: ExtraTab;
  onChange: (tab: ExtraTab) => void;
}

/** Pastelitos, bebidas y cremas en una sola sección con filtro. */
export const ExtrasSection: React.FC<ExtrasSectionProps> = ({ value, onChange }) => {
  const meta = META[value];
  const items = byCategory(value);

  return (
    <section id="sec-extras" aria-labelledby="sec-extras-title" className="pt-11">
      <div className="reveal flex justify-between items-center gap-3 flex-wrap mb-4">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h2 id="sec-extras-title" className="m-0 text-[22px] tracking-[-.025em] font-extrabold">{meta.title}</h2>
          <span className="text-[13px] text-ink-muted">{meta.subtitle}</span>
        </div>
        <SegmentedControl
          ariaLabel="Complementos"
          value={value}
          onChange={onChange}
          options={(Object.keys(META) as ExtraTab[]).map((id) => ({ id, label: META[id].label, count: byCategory(id).length }))}
        />
      </div>
      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]">
        {items.map((p, i) => (
          <ExtraRow key={p.id} product={p} index={i} />
        ))}
      </div>
    </section>
  );
};
