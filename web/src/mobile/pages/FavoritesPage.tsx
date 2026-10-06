import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Utensils } from 'lucide-react';
import { PRODUCTS } from '../../data/catalog';
import { ProductCard } from '../components/ProductCard';
import { ProductConfigurator } from '../components/ProductConfigurator';
import { useFavoritesStore } from '../../store/favoritesStore';
import { Product } from '../../types/product';

export const FavoritesPage: React.FC = () => {
  const { favoriteIds } = useFavoritesStore();
  const [configProduct, setConfigProduct] = useState<Product | null>(null);

  const favoriteProducts = PRODUCTS.filter((p) => favoriteIds.includes(p.id));

  return (
    <div className="p-4 space-y-4 pb-8">
      <div>
        <h2 className="text-lg font-black text-[#242424] font-display flex items-center gap-2">
          <Heart className="w-5 h-5 text-[#FF3038] fill-[#FF3038]" />
          <span>Mis Favoritos</span>
        </h2>
        <p className="text-xs text-[#8C867F]">
          Tus productos guardados para pedirlos más rápido
        </p>
      </div>

      {favoriteProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {favoriteProducts.map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              onOpenConfigurator={setConfigProduct}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-[#EFE6D6] rounded-3xl p-8 text-center space-y-4 shadow-sm my-6">
          <div className="w-14 h-14 rounded-full bg-[#FFF2DF] text-[#FF3038] flex items-center justify-center mx-auto">
            <Heart className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-[#242424] text-base">
              Aún no tienes favoritos
            </h3>
            <p className="text-xs text-[#6B6662] max-w-[240px] mx-auto leading-relaxed">
              Explora nuestra carta y pulsa el corazón en tus tequeños, pizzas o combos preferidos.
            </p>
          </div>
          <Link
            to="/app/menu"
            className="inline-flex items-center gap-1.5 bg-[#FF3038] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md active:scale-95 transition"
          >
            <Utensils className="w-4 h-4" />
            <span>Explorar la carta</span>
          </Link>
        </div>
      )}

      {/* Configurator Modal */}
      {configProduct && (
        <ProductConfigurator
          product={configProduct}
          onClose={() => setConfigProduct(null)}
        />
      )}
    </div>
  );
};
