import React from 'react';
import { ArrowRight } from 'lucide-react';
import { PROMOTIONS } from '../../data/promotions';
import { formatMoney } from '../../lib/money';
import { openWhatsApp } from '../../lib/whatsapp';
import { useProductActions } from '../../lib/productActions';

interface HeroBannerProps {
  onSeePromos: () => void;
}

const STEPS = ['Elige tu promo', 'Arma tus sabores', 'Confirma por WhatsApp'];

export const HeroBanner: React.FC<HeroBannerProps> = ({ onSeePromos }) => {
  const { openPromo } = useProductActions();
  const solo = PROMOTIONS.find((p) => p.id === 'promo-solo-para-mi');

  return (
    <section
      aria-label="Bienvenida"
      className="grid gap-10 items-center pt-7 pb-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr))]"
    >
      <div className="flex flex-col gap-4">
        <span className="reveal flex items-center gap-2 text-xs font-bold tracking-[.1em] uppercase text-ink-muted" style={{ '--d': 0 } as React.CSSProperties}>
          <span className="w-[18px] h-0.5 bg-brand-red" />
          Delivery en Tacna · 5 – 11 p. m.
        </span>
        <h1 className="reveal m-0 text-[clamp(34px,4.2vw,54px)] leading-[1.02] tracking-[-.04em] font-extrabold text-balance" style={{ '--d': 1 } as React.CSSProperties}>
          Tequeños que <span className="text-brand-red">alegran el día.</span>
        </h1>
        <p className="reveal m-0 text-base leading-relaxed text-ink-soft max-w-[440px] text-pretty" style={{ '--d': 2 } as React.CSSProperties}>
          Con el sabor y la receta original de siempre. Elige tu promo, arma tus sabores y confirma por WhatsApp.
        </p>
        <div className="reveal flex flex-wrap gap-2.5" style={{ '--d': 3 } as React.CSSProperties}>
          <button
            type="button"
            onClick={onSeePromos}
            className="inline-flex items-center gap-2 bg-brand-red hover:bg-brand-red-dark text-white text-[14.5px] font-bold px-[22px] py-[13px] rounded-[10px] transition-all hover:shadow-[0_8px_20px_-8px_rgba(211,23,40,.6)] active:scale-[.97]"
          >
            Ver promociones <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => openWhatsApp('¡Hola Retequeños! Quiero hacer un pedido.')}
            className="inline-flex items-center gap-2 bg-white border border-[#DEDBD5] hover:border-ink text-ink text-[14.5px] font-bold px-5 py-3 rounded-[10px] transition-colors"
          >
            <span className="w-[7px] h-[7px] rounded-full bg-whatsapp" aria-hidden="true" />
            Pedir por WhatsApp
          </button>
        </div>
        <ol className="reveal flex flex-wrap gap-5 pt-3.5 mt-1 border-t border-line-soft text-[13px] text-ink-soft list-none p-0" style={{ '--d': 4 } as React.CSSProperties}>
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <b className="w-5 h-5 rounded-full border border-[#D9D6D0] text-ink text-xs flex items-center justify-center">{i + 1}</b>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div className="reveal relative" style={{ '--d': 2 } as React.CSSProperties}>
        <div className="aspect-[16/10] rounded-[18px] overflow-hidden bg-[#2A0C0E] group">
          {/* La foto trae texto impreso a la izquierda: se recorta a la derecha */}
          <img
            src="/assets/products/tequenos/queso-detail-main.jpg"
            alt="Tequeños de queso"
            className="h-full w-[150%] max-w-none -ml-[50%] object-cover object-right transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
            decoding="async"
            {...{ fetchpriority: 'high' }}
          />
        </div>
        {solo && (
          <button
            type="button"
            onClick={() => openPromo(solo)}
            className="absolute left-4 bottom-4 flex items-center gap-3 text-left bg-white/95 backdrop-blur rounded-xl py-2.5 pl-2.5 pr-3.5 shadow-[0_12px_28px_-14px_rgba(0,0,0,.35)] transition-transform hover:-translate-y-0.5"
          >
            <img src={solo.image} alt="" className="w-11 h-11 rounded-lg object-cover" />
            <span className="flex flex-col">
              <span className="text-[13.5px] font-bold text-ink">{solo.name}</span>
              <span className="text-xs text-ink-muted">10 tequeños + 2 cremas + gaseosa</span>
            </span>
            <span className="ml-1.5 text-[15px] font-extrabold text-brand-red whitespace-nowrap">{formatMoney(solo.price)}</span>
          </button>
        )}
      </div>
    </section>
  );
};
