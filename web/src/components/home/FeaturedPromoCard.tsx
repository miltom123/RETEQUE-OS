import React from 'react';
import type { Promotion } from '../../data/promotions';
import { formatMoney } from '../../lib/money';
import { useProductActions } from '../../lib/productActions';
import { ImageWithFallback } from '../ui/ImageWithFallback';

const TAGS: Record<string, string> = {
  'promo-solo-para-mi': 'Personal',
  'promo-extra': 'Para compartir',
  'promo-familiar': 'Familiar',
};

export const FeaturedPromoCard: React.FC<{ promotion: Promotion; index: number }> = ({ promotion, index }) => {
  const { openPromo } = useProductActions();
  return (
    <article
      onClick={() => openPromo(promotion)}
      className="reveal card-lift group grid grid-cols-[42%_1fr] bg-white border border-line-soft rounded-[14px] overflow-hidden cursor-pointer"
      style={{ '--d': index } as React.CSSProperties}
    >
      <div className="overflow-hidden bg-surface-3 min-h-[170px]">
        <ImageWithFallback
          src={promotion.image}
          alt={promotion.name}
          fallbackLabel={promotion.name}
          className="w-full h-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.07]"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="p-4 flex flex-col gap-2 min-w-0">
        {TAGS[promotion.id] && (
          <span className="text-[11px] font-bold tracking-[.08em] uppercase text-brand-red">{TAGS[promotion.id]}</span>
        )}
        <h3 className="m-0 text-base font-extrabold tracking-[-.015em]">{promotion.name}</h3>
        <ul className="m-0 p-0 list-none flex flex-col gap-[3px]">
          {promotion.items.map((it) => (
            <li key={it} className="text-[12.5px] text-ink-soft leading-snug">{it}</li>
          ))}
        </ul>
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="text-lg font-extrabold tracking-[-.02em]">{formatMoney(promotion.price)}</span>
          <span className="bg-brand-red group-hover:bg-brand-red-dark text-white text-[12.5px] font-bold px-3 py-2 rounded-lg transition-colors">
            Elegir sabores
          </span>
        </div>
      </div>
    </article>
  );
};
