import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Sparkles } from 'lucide-react';
import { Product, getProductPrice } from '../../types/product';
import { formatMoney } from '../../lib/money';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { useFavoritesStore } from '../../store/favoritesStore';
import { useCartStore } from '../../store/cartStore';
import { useUiStore } from '../../store/uiStore';

interface PromoCardProps {
  product: Product;
  onOpenConfigurator?: (product: Product) => void;
}

export const PromoCard: React.FC<PromoCardProps> = ({
  product,
  onOpenConfigurator,
}) => {
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useUiStore((s) => s.showToast);

  const favorited = isFavorite(product.id);
  const displayPrice = getProductPrice(product);

  const handleAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Las promociones y combos de Retequeños tienen selección de sabores/cremas
    if (onOpenConfigurator) {
      onOpenConfigurator(product);
      return;
    }

    addItem({
      productId: product.id,
      name: product.name,
      image: product.image,
      quantity: 1,
      unitPrice: displayPrice,
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

  return (
    <div className="bg-white rounded-3xl border border-[#EFE6D6] hover:border-[#F5A623]/60 transition-all duration-200 shadow-sm hover:shadow-md flex flex-row overflow-hidden relative group p-3 sm:p-3.5 gap-3 sm:gap-4 items-center">
      {/* Contenedor de Imagen con Badge */}
      <Link
        to={`/app/product/${product.slug}`}
        className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-[#FFF2DF] relative shrink-0 block shadow-inner"
        aria-label={`Ver detalle de ${product.name}`}
      >
        <ImageWithFallback
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Badge PROMO sobre la imagen (arriba a la izquierda) */}
        <span className="absolute top-1.5 left-1.5 bg-[#FF3038] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-sm flex items-center gap-0.5">
          <Sparkles className="w-2.5 h-2.5 fill-white" />
          <span>{product.badge || 'PROMO'}</span>
        </span>
      </Link>

      {/* Contenedor Central de Información */}
      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
        <Link to={`/app/product/${product.slug}`} className="block group-hover:text-[#FF3038] transition-colors">
          {/* Título: máximo 2 líneas completas legibles, sin truncar a 'Promo...' */}
          <h3 className="font-bold text-[#242424] text-sm sm:text-base leading-snug line-clamp-2">
            {product.name}
          </h3>

          {/* Descripción útil: 1 o 2 líneas con los ingredientes o tequeños incluidos */}
          {product.description && (
            <p className="text-[#6B6662] text-xs line-clamp-2 mt-1 leading-relaxed">
              {product.description}
            </p>
          )}
        </Link>

        {/* Footer: Precio en una sola línea + Acciones contenidas sin desbordar */}
        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[#F5EDE1]/70">
          {/* Precio: white-space nowrap estricto para evitar S/ y el monto en dos líneas */}
          <div className="shrink-0">
            <span className="text-[9.5px] text-[#8C867F] font-bold block uppercase tracking-wider leading-none">
              Precio Promo
            </span>
            <span className="font-black text-[#FF3038] text-base sm:text-lg font-display whitespace-nowrap leading-tight">
              {formatMoney(displayPrice)}
            </span>
          </div>

          {/* Botones de acción (Favorito y Agregar) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleFavoriteClick}
              className={`w-8.5 h-8.5 rounded-xl border flex items-center justify-center transition active:scale-90 cursor-pointer ${
                favorited
                  ? 'bg-red-50 border-red-200 text-[#FF3038]'
                  : 'bg-[#FFF8EE] border-[#EFE6D6] text-[#8C867F] hover:text-[#FF3038]'
              }`}
              aria-label={favorited ? `Quitar ${product.name} de favoritos` : `Guardar ${product.name} en favoritos`}
              title={favorited ? 'Quitar de favoritos' : 'Guardar en favoritos'}
            >
              <Heart className={`w-4 h-4 ${favorited ? 'fill-[#FF3038]' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleAction}
              className="h-8.5 px-3 sm:px-3.5 rounded-xl bg-[#FF3038] hover:bg-[#E52B33] text-white font-bold text-xs flex items-center gap-1.5 active:scale-95 transition cursor-pointer shadow-sm shadow-[#FF3038]/20 shrink-0"
              aria-label={`Agregar ${product.name} al carrito`}
              title="Agregar al carrito"
            >
              <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
              <span>Agregar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
