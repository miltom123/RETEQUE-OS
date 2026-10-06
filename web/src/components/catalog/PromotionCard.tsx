import React from 'react';
import { Promotion } from '../../data/promotions';
import { formatMoney } from '../../lib/money';
import { useProductActions } from '../../lib/productActions';
import { ImageWithFallback } from '../ui/ImageWithFallback';

const CATEGORY_LABEL: Record<Promotion['category'], string> = {
  tequenos: 'Tequeños',
  'pizza-tequenos': 'Pizza + tequeños',
  familiares: 'Para compartir',
};

interface PromotionCardProps {
  promotion: Promotion;
  index?: number;
}

/** Tarjeta compacta de combo: una sola acción (abrir el configurador). */
export const PromotionCard: React.FC<PromotionCardProps> = ({ promotion, index = 0 }) => {
  const { openPromo } = useProductActions();

  return (
    <article
      onClick={() => openPromo(promotion)}
      className="reveal card-lift group bg-white border border-line-soft rounded-[14px] overflow-hidden flex flex-col cursor-pointer"
      style={{ '--d': index % 6 } as React.CSSProperties}
    >
      <div className="aspect-[4/3] overflow-hidden bg-surface-3">
        {/* Las fotos traen texto impreso abajo: se encuadra arriba */}
        <ImageWithFallback
          src={promotion.image}
          alt={promotion.name}
          fallbackLabel={promotion.name}
          className="w-full h-[120%] object-cover object-top transition-transform duration-[600ms] ease-out group-hover:scale-[1.07]"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="p-3 pl-3.5 flex flex-col gap-1 flex-1">
        <span className="text-[10.5px] font-bold tracking-[.08em] uppercase text-[#8A8A8F]">
          {CATEGORY_LABEL[promotion.category]}
        </span>
        <h3 className="m-0 text-[14.5px] font-bold tracking-[-.01em] group-hover:text-brand-red transition-colors">
          {promotion.name}
        </h3>
        <p className="m-0 text-[12.5px] leading-snug text-ink-muted line-clamp-2">{promotion.description}</p>
        <div className="mt-auto pt-2.5 flex items-center justify-between">
          <span className="text-base font-extrabold tracking-[-.02em]">{formatMoney(promotion.price)}</span>
          <span className="text-[12.5px] font-bold text-brand-red bg-brand-red-light px-[11px] py-[7px] rounded-lg">Elegir</span>
        </div>
      </div>
    </article>
  );
};
