import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { PROMOTIONS, Promotion } from '../../data/promotions';
import { PRODUCTS, Product } from '../../data/catalog';
import { formatMoney } from '../../lib/money';
import { productUnitPrice, useProductActions } from '../../lib/productActions';
import { ImageWithFallback } from '../ui/ImageWithFallback';
import { useUiStore } from '../../store/uiStore';

interface SearchBoxProps {
  autoFocus?: boolean;
}

type SearchResult =
  | { kind: 'promo'; item: Promotion; name: string; price: number; image: string; category: string }
  | { kind: 'product'; item: Product; name: string; price: number; image: string; category: string };

const CATEGORY_LABEL: Record<string, string> = {
  tequenos: 'Tequeños',
  pizzas: 'Pizzas',
  bebidas: 'Bebidas',
  pastelitos: 'Pastelitos',
  cremas: 'Cremas',
  promociones: 'Promoción',
};

/** Normaliza para buscar sin tildes ni mayúsculas ("tequenos" encuentra "Tequeños"). */
const normalize = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export const SearchBox: React.FC<SearchBoxProps> = ({ autoFocus = false }) => {
  const [term, setTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { openProduct, openPromo } = useProductActions();
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);

  const results = useMemo<SearchResult[]>(() => {
    const q = normalize(term.trim());
    if (q.length < 2) return [];
    const promos: SearchResult[] = PROMOTIONS.filter((p) =>
      normalize(`${p.name} ${p.description}`).includes(q)
    ).map((p) => ({
      kind: 'promo',
      item: p,
      name: p.name,
      price: p.price,
      image: p.image,
      category: 'Promoción',
    }));
    const products: SearchResult[] = PRODUCTS.filter((p) =>
      normalize(`${p.name} ${p.description ?? ''} ${p.category}`).includes(q)
    ).map((p) => ({
      kind: 'product',
      item: p,
      name: p.name,
      price: productUnitPrice(p),
      image: p.image,
      category: CATEGORY_LABEL[p.category] ?? p.category,
    }));
    return [...promos, ...products].slice(0, 8);
  }, [term]);

  useEffect(() => {
    const onDocumentClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, []);

  const pick = (res: SearchResult) => {
    setIsOpen(false);
    setTerm('');
    setSearchOpen(false);
    if (res.kind === 'promo') openPromo(res.item);
    else openProduct(res.item);
  };

  const showNoResults = isOpen && term.trim().length >= 2 && results.length === 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <label htmlFor="buscador" className="sr-only">
          Buscar en la carta
        </label>
        <input
          id="buscador"
          type="search"
          autoComplete="off"
          autoFocus={autoFocus}
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
              setSearchOpen(false);
            }
            if (e.key === 'Enter' && results.length > 0) {
              e.preventDefault();
              pick(results[0]);
            }
          }}
          placeholder="¿Qué se te antoja hoy? Tequeños, pizzas, promos…"
          className="w-full h-[38px] pl-10 pr-9 bg-surface-2 rounded-[10px] border border-transparent text-neutral-900 placeholder:text-neutral-400 text-sm font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-red/15 focus:border-brand-red"
        />
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" aria-hidden="true" />
        {term && (
          <button
            type="button"
            onClick={() => {
              setTerm('');
              setIsOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
            aria-label="Borrar búsqueda"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (results.length > 0 || showNoResults) && (
        <div
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-neutral-100 overflow-hidden z-50 text-neutral-900"
          role="listbox"
          aria-label="Resultados de búsqueda"
        >
          <div className="p-2.5 border-b border-neutral-100 flex items-center justify-between text-xs text-neutral-500 font-bold uppercase tracking-wider px-3">
            <span>Resultados</span>
            <span>{results.length} encontrados</span>
          </div>
          {showNoResults ? (
            <div className="p-4 text-sm text-neutral-600">
              No encontramos “{term.trim()}”. Prueba con “tequeños”, “pizza” o “promo”.
            </div>
          ) : (
            <div className="divide-y divide-neutral-50 max-h-[60vh] overflow-y-auto">
              {results.map((res, idx) => (
                <button
                  key={`${res.kind}-${res.item.id}-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => pick(res)}
                  className="w-full flex items-center justify-between gap-3 p-3 hover:bg-neutral-50 text-left transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ImageWithFallback
                      src={res.image}
                      alt=""
                      className="w-10 h-10 object-cover rounded-lg shrink-0"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-neutral-900 truncate">{res.name}</div>
                      <div className="text-xs text-neutral-500">{res.category}</div>
                    </div>
                  </div>
                  <span className="font-bold text-[#C5161D] text-sm shrink-0">{formatMoney(res.price)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
