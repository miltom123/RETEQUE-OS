import React, { useEffect, useState } from 'react';

export type ExtraTab = 'pastelitos' | 'bebidas' | 'cremas';

export const SECTION_IDS = ['sec-favoritas', 'sec-promos', 'sec-tequenos', 'sec-pizzas', 'sec-extras'] as const;

const TABS: { label: string; section: (typeof SECTION_IDS)[number]; extra?: ExtraTab }[] = [
  { label: 'Promos', section: 'sec-favoritas' },
  { label: 'Combos', section: 'sec-promos' },
  { label: 'Tequeños', section: 'sec-tequenos' },
  { label: 'Pizzas familiares 35 cm', section: 'sec-pizzas' },
  { label: 'Pastelitos', section: 'sec-extras', extra: 'pastelitos' },
  { label: 'Bebidas', section: 'sec-extras', extra: 'bebidas' },
  { label: 'Cremas', section: 'sec-extras', extra: 'cremas' },
];

/** Altura del navbar (60) + barra de categorías (~48). */
const OFFSET = 108;

export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - OFFSET, behavior: 'smooth' });
}

interface CategoryNavProps {
  extra: ExtraTab;
  onSelectExtra: (tab: ExtraTab) => void;
}

/** Barra de categorías fija con scroll-spy. Pastelitos/Bebidas/Cremas comparten una sección con filtro. */
export const CategoryNav: React.FC<CategoryNavProps> = ({ extra, onSelectExtra }) => {
  const [active, setActive] = useState<string>(SECTION_IDS[0]);

  useEffect(() => {
    const onScroll = () => {
      let current: string = SECTION_IDS[0];
      SECTION_IDS.forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < OFFSET + 32) current = id;
      });
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="sticky top-[60px] z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-surface/90 backdrop-blur-md border-y border-line-soft">
      <nav className="flex gap-1 overflow-x-auto no-scrollbar py-1.5" aria-label="Secciones de la carta">
        {TABS.map((tab) => {
          const isActive = active === tab.section && (!tab.extra || tab.extra === extra);
          return (
            <button
              key={tab.label}
              type="button"
              aria-current={isActive ? 'true' : undefined}
              onClick={() => {
                if (tab.extra) onSelectExtra(tab.extra);
                scrollToSection(tab.section);
              }}
              className={`text-[13px] font-bold px-3 py-[7px] rounded-lg whitespace-nowrap transition-colors ${
                isActive ? 'bg-ink text-white' : 'text-ink-soft hover:bg-surface-2 hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
