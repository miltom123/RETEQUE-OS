import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Heart, Settings2 } from 'lucide-react';
import { PRODUCTS, PROMOTIONS } from '../../data/catalog';
import { formatMoney } from '../../lib/money';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { useFavoritesStore } from '../../store/favoritesStore';
import { getProductPrice } from '../../types/product';
import { ProductConfiguratorModal } from '../../components/configurator/ProductConfiguratorModal';
import { ProductOptionsForm } from '../components/ProductOptionsForm';

/** Ficha del producto (RFI-03): foto, descripción, tamaño, extras, cantidad y notas. Las promos se personalizan (RFI-04). */
export const ProductPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const product = PRODUCTS.find((p) => p.slug === slug || p.id === slug);
  const promo = product ? PROMOTIONS.find((p) => p.id === product.id) : undefined;
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const [configuring, setConfiguring] = useState(false);

  if (!product) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-base font-bold text-[#242424]">Producto no encontrado</h2>
        <p className="text-xs text-[#6B6662]">
          El producto que buscas ya no está disponible o la dirección no es correcta.
        </p>
        <Link
          to="/app/menu"
          className="inline-block bg-[#FF3038] text-white text-xs font-bold px-4 py-2.5 rounded-xl"
        >
          Volver al Menú
        </Link>
      </div>
    );
  }

  const favorited = isFavorite(product.id);

  const handleBack = () => {
    if (window.history.length > 1 && window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/app/menu');
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 pb-4">
        {/* Hero Image */}
      <div className="relative aspect-[4/3] bg-[#FFF2DF] overflow-hidden">
        <ImageWithFallback
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
        />

        <button
          type="button"
          onClick={handleBack}
          aria-label="Volver al menú"
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[#242424] shadow-md transition active:scale-90 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
        </button>

        <button
          type="button"
          onClick={() => toggleFavorite(product.id)}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[#8C867F] shadow-md transition active:scale-95 cursor-pointer"
        >
          <Heart
            className={`w-4 h-4 ${
              favorited ? 'text-[#FF3038] fill-[#FF3038]' : ''
            }`}
          />
        </button>

        {product.badge && (
          <span className="absolute bottom-4 left-4 bg-[#FF3038] text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
            {product.badge}
          </span>
        )}
      </div>

      {/* Product Details Content */}
      <div className="p-4 space-y-4 -mt-4 bg-[#FFF8EE] rounded-t-3xl relative z-10">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-black text-[#242424] leading-tight font-display">
              {product.name}
            </h1>
            <span className="text-xl font-black text-[#FF3038] font-display shrink-0">
              {formatMoney(getProductPrice(product))}
            </span>
          </div>

          {product.description && (
            <p className="text-xs text-[#6B6662] mt-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {promo && (
          <div className="bg-white p-4 rounded-2xl border border-[#EFE6D6] space-y-1.5 shadow-sm">
            <span className="font-bold text-xs text-[#242424] block">Incluye:</span>
            <ul className="text-xs text-[#4B4540] list-disc pl-4 space-y-0.5">
              {promo.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        )}
      </div>

      {!promo && <ProductOptionsForm product={product} onAdded={() => navigate('/app/carrito')} />}
    </div>

      {promo && (
        <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#EFE6D6] p-3.5">
          <button
            type="button"
            onClick={() => setConfiguring(true)}
            className="w-full h-12 bg-[#FF3038] hover:bg-[#E52B33] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <Settings2 className="w-4 h-4" />
            Elegir sabores, cremas y bebida
          </button>
        </div>
      )}

      {promo && configuring && (
        <ProductConfiguratorModal isOpen hideBuyNow productOrPromo={promo} onClose={() => setConfiguring(false)} onOpenCartDrawer={() => navigate('/app/carrito')} />
      )}
    </div>
  );
};
