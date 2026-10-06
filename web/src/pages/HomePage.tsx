import React, { useState } from 'react';
import { HeroBanner } from '../components/home/HeroBanner';
import { CategoryNav, ExtraTab, scrollToSection } from '../components/home/CategoryNav';
import { FeaturedPromoCard } from '../components/home/FeaturedPromoCard';
import { ExtrasSection } from '../components/home/ExtrasSection';
import { SegmentedControl } from '../components/home/SegmentedControl';
import { BenefitsStrip } from '../components/layout/BenefitsStrip';
import { ProductCard } from '../components/catalog/ProductCard';
import { PromotionCard } from '../components/catalog/PromotionCard';
import { PRODUCTS } from '../data/catalog';
import { PROMOTIONS, PromotionCategory } from '../data/promotions';
import { useReveal } from '../hooks/useReveal';

type PromoFilter = 'all' | PromotionCategory;

const FEATURED = PROMOTIONS.filter((p) => p.featuredHome);
const COMBOS = PROMOTIONS.filter((p) => !p.featuredHome);
const TEQUENOS = PRODUCTS.filter((p) => p.category === 'tequenos');
const PIZZAS = PRODUCTS.filter((p) => p.category === 'pizzas');

const PROMO_FILTERS: { id: PromoFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'tequenos', label: 'Tequeños' },
  { id: 'pizza-tequenos', label: 'Pizza + tequeños' },
  { id: 'familiares', label: 'Para compartir' },
];

const SectionHeader: React.FC<{ id: string; title: string; subtitle?: string; children?: React.ReactNode }> = ({ id, title, subtitle, children }) => (
  <div className="reveal flex justify-between items-center gap-3 flex-wrap mb-4">
    <div className="flex items-baseline gap-3 flex-wrap">
      <h2 id={id} className="m-0 text-[22px] tracking-[-.025em] font-extrabold">{title}</h2>
      {subtitle && <span className="text-[13px] text-ink-muted">{subtitle}</span>}
    </div>
    {children}
  </div>
);

export const HomePage: React.FC = () => {
  const [promoFilter, setPromoFilter] = useState<PromoFilter>('all');
  const [size, setSize] = useState<'10' | '20'>('10');
  const [extra, setExtra] = useState<ExtraTab>('pastelitos');

  useReveal([promoFilter, extra]);

  const combos = COMBOS.filter((p) => promoFilter === 'all' || p.category === promoFilter);

  return (
    <div>
      <HeroBanner onSeePromos={() => scrollToSection('sec-favoritas')} />

      <div className="mt-8">
        <CategoryNav extra={extra} onSelectExtra={setExtra} />
      </div>

      <section id="sec-favoritas" aria-labelledby="sec-favoritas-title" className="pt-8">
        <SectionHeader id="sec-favoritas-title" title="Promos de tequeños" subtitle="Incluyen cremas y gaseosa · tú eliges los sabores" />
        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))]">
          {FEATURED.map((p, i) => (
            <FeaturedPromoCard key={p.id} promotion={p} index={i} />
          ))}
        </div>
      </section>

      <section id="sec-promos" aria-labelledby="sec-promos-title" className="pt-11">
        <SectionHeader id="sec-promos-title" title="Combos y promociones">
          <SegmentedControl
            ariaLabel="Filtrar combos"
            value={promoFilter}
            onChange={setPromoFilter}
            options={PROMO_FILTERS.map((f) => ({
              ...f,
              count: f.id === 'all' ? COMBOS.length : COMBOS.filter((p) => p.category === f.id).length,
            }))}
          />
        </SectionHeader>
        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr))]">
          {combos.map((p, i) => (
            <PromotionCard key={p.id} promotion={p} index={i} />
          ))}
        </div>
      </section>

      <section id="sec-tequenos" aria-labelledby="sec-tequenos-title" className="pt-11">
        <SectionHeader id="sec-tequenos-title" title="Tequeños por porción" subtitle="Crujientes, dorados y rellenos al máximo">
          <SegmentedControl
            ariaLabel="Porción"
            value={size}
            onChange={setSize}
            options={[
              { id: '10', label: '10 unid.' },
              { id: '20', label: '20 unid.' },
            ]}
          />
        </SectionHeader>
        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,165px),1fr))]">
          {TEQUENOS.map((p, i) => (
            <ProductCard key={p.id} product={p} forcedPresentation={size} index={i} />
          ))}
        </div>
      </section>

      <section id="sec-pizzas" aria-labelledby="sec-pizzas-title" className="pt-11">
        <SectionHeader id="sec-pizzas-title" title="Pizzas familiares 35 cm" subtitle="Masa crocante artesanal, salsa pomodoro de la casa y queso mozarella" />
        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,165px),1fr))]">
          {PIZZAS.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>

      <ExtrasSection value={extra} onChange={setExtra} />

      <BenefitsStrip />
    </div>
  );
};
