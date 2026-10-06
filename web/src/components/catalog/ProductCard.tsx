import React, { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { Product } from '../../data/catalog';
import { formatMoney } from '../../lib/money';
import { productUnitPrice, useProductActions } from '../../lib/productActions';
import { useUiStore } from '../../store/uiStore';
import { ImageWithFallback } from '../ui/ImageWithFallback';

interface ProductCardProps {
  product: Product;
  /** Presentación seleccionada desde el selector de la sección (10 / 20 unid.). */
  forcedPresentation?: '10' | '20';
  index?: number;
}

/**
 * Tarjeta cuadrada para tequeños y pizzas.
 * Clic en la tarjeta → configurador. Botón "+" → agregar rápido con la presentación activa.
 */
export const ProductCard: React.FC<ProductCardProps> = ({ product, forcedPresentation, index = 0 }) => {
  const { quickAdd } = useProductActions();
  const openConfigurator = useUiStore((s) => s.openConfigurator);
  const [added, setAdded] = useState(false);

  const presId = forcedPresentation || product.presentations?.[0]?.id;
  const price = productUnitPrice(product, presId);
  const isSpecial = product.subcategory === 'especiales' && product.category === 'tequenos';

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    quickAdd(product, presId);
    setAdded(true);
    setTimeout(() => setAdded(false), 1100);
  };

  return (
    <article
      onClick={() => openConfigurator(product)}
      className="reveal group flex flex-col gap-2 cursor-pointer"
      style={{ '--d': index % 7 } as React.CSSProperties}
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-surface-3">
        <ImageWithFallback
          src={product.image}
          alt={product.name}
          fallbackLabel={product.name}
          className="w-full h-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.07]"
          loading="lazy"
          decoding="async"
        />
        {isSpecial && (
          <span className="absolute top-2 left-2 bg-white/95 text-ink text-[10px] font-extrabold tracking-[.06em] uppercase px-2 py-1 rounded-md">
            Especial
          </span>
        )}
        <button
          type="button"
          onClick={handleAdd}
          aria-label={`Agregar ${product.name} al pedido`}
          className={`absolute right-2 bottom-2 w-[34px] h-[34px] rounded-[10px] flex items-center justify-center shadow-[0_6px_14px_-6px_rgba(0,0,0,.35)] transition-all duration-200 hover:scale-[1.08] active:scale-[.92] ${
            added ? 'bg-[#16A34A] text-white' : 'bg-white text-ink'
          }`}
        >
          {added ? <Check className="w-4 h-4 stroke-[3]" /> : <Plus className="w-4 h-4 stroke-[2.8]" />}
        </button>
      </div>
      <div className="flex flex-col gap-0.5 px-0.5">
        <h3 className="m-0 text-[13.5px] font-bold leading-tight">{product.name}</h3>
        {product.category === 'pizzas' && product.ingredients && (
          <span className="text-xs text-ink-muted line-clamp-1">{product.ingredients.join(', ')}</span>
        )}
        <span className="text-sm font-extrabold">{formatMoney(price)}</span>
      </div>
    </article>
  );
};
