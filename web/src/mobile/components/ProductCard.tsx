import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart } from 'lucide-react';
import { Product, getProductPrice } from '../../types/product';
import { formatMoney } from '../../lib/money';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { useFavoritesStore } from '../../store/favoritesStore';
import { useCartStore } from '../../store/cartStore';
import { useUiStore } from '../../store/uiStore';

interface ProductCardProps {
  product: Product;
  onOpenConfigurator?: (product: Product) => void;
  horizontal?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onOpenConfigurator,
  horizontal = false,
}) => {
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useUiStore((s) => s.showToast);

  const favorited = isFavorite(product.id);
  const displayPrice = getProductPrice(product);
  const hasOptions =
    (product.presentations && product.presentations.length > 1) ||
    product.category === 'promociones' ||
    product.category === 'tequenos';

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (hasOptions && onOpenConfigurator) {
      onOpenConfigurator(product);
      return;
    }

    addItem({
      productId: product.id,
      name: product.name,
      image: product.image,
      quantity: 1,
      unitPrice: displayPrice,
      selectedPresentation: product.presentations?.[0]?.label,
    });

    showToast({
      message: `¡${product.name} agregado al carrito!`,
      action: 'cart',
    });
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product.id);
  };

  if (horizontal) {
    return (
      <Link
        to={`/app/product/${product.slug}`}
        className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-[#EFE6D6] hover:border-[#F5A623]/50 transition-all shadow-sm active:scale-[0.99] relative group overflow-hidden"
      >
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#FFF2DF] relative shrink-0 shadow-inner">
          <ImageWithFallback
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {product.badge && (
            <span className="absolute top-1 left-1 bg-[#FF3038] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-sm">
              {product.badge}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[#242424] text-sm leading-snug line-clamp-2">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-[#6B6662] text-xs line-clamp-1 mt-0.5">
              {product.description}
            </p>
          )}
          <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#F5EDE1]/60">
            <span className="font-black text-[#FF3038] text-sm font-display whitespace-nowrap shrink-0">
              {formatMoney(displayPrice)}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleFavoriteClick}
                className="w-7 h-7 rounded-full bg-[#FFF8EE] flex items-center justify-center text-[#8C867F] hover:text-[#FF3038] transition cursor-pointer"
                aria-label={favorited ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    favorited ? 'text-[#FF3038] fill-[#FF3038]' : ''
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={handleQuickAdd}
                className="h-7.5 px-2.5 rounded-xl bg-[#FF3038] text-white font-bold text-xs flex items-center gap-1 hover:bg-[#E52B33] active:scale-95 transition cursor-pointer shadow-sm shadow-[#FF3038]/20 shrink-0"
                aria-label="Agregar al carrito"
                title="Agregar al carrito"
              >
                <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                <span>Agregar</span>
              </button>
            </div>
          </div>
        </div>
      </Link>
    );
  }


  return (
    <Link
      to={`/app/product/${product.slug}`}
      className="bg-white rounded-2xl border border-[#EFE6D6] overflow-hidden flex flex-col justify-between hover:border-[#F5A623]/60 transition-all shadow-sm active:scale-[0.99] relative group"
    >
      <div className="relative aspect-[4/3] bg-[#FFF2DF] overflow-hidden">
        <ImageWithFallback
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.badge && (
          <span className="absolute top-2 left-2 bg-[#FF3038] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
            {product.badge}
          </span>
        )}
        <button
          type="button"
          onClick={handleFavoriteClick}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border border-[#EFE6D6] flex items-center justify-center text-[#8C867F] hover:text-[#FF3038] transition cursor-pointer shadow-sm"
          aria-label={favorited ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
          <Heart
            className={`w-4 h-4 ${
              favorited ? 'text-[#FF3038] fill-[#FF3038]' : ''
            }`}
          />
        </button>
      </div>

      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-[#242424] text-sm leading-snug line-clamp-1">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-[#6B6662] text-[11.5px] line-clamp-2 mt-1 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#F5EDE1]">
          <div>
            <span className="text-[10px] text-[#8C867F] font-bold block uppercase tracking-wider">
              {product.category === 'promociones' ? 'Precio Promo' : 'Desde'}
            </span>
            <span className="font-black text-[#FF3038] text-base leading-none font-display">
              {formatMoney(displayPrice)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleQuickAdd}
            className="h-8 px-2.5 sm:px-3 rounded-xl bg-[#FF3038] hover:bg-[#E52B33] text-white font-bold text-xs flex items-center gap-1.5 active:scale-95 transition cursor-pointer shadow-md shadow-[#FF3038]/20"
            aria-label="Agregar al carrito"
            title="Agregar al carrito"
          >
            <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
            <span>Agregar</span>
          </button>
        </div>
      </div>
    </Link>
  );
};
