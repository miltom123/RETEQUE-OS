import React, { useState } from 'react';
import { Search, X, Frown } from 'lucide-react';
import { PRODUCTS } from '../../data/catalog';
import { ProductCard } from '../components/ProductCard';
import { ProductConfigurator } from '../components/ProductConfigurator';
import { Product } from '../../types/product';

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [configProduct, setConfigProduct] = useState<Product | null>(null);

  const popularTags = [
    'Queso',
    'Promo Duo',
    'Americana',
    'Maracuyá',
    'Tártara',
    'Lomo',
    'Pastelitos',
  ];

  const trimmed = query.trim().toLowerCase();
  const results = trimmed
    ? PRODUCTS.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(trimmed);
        const descMatch = p.description?.toLowerCase().includes(trimmed);
        const catMatch = p.category.toLowerCase().includes(trimmed);
        return nameMatch || descMatch || catMatch;
      })
    : [];

  return (
    <div className="p-4 space-y-4 pb-8">
      {/* Buscador */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#8C867F] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca por nombre, ingrediente o salsa..."
          className="w-full h-12 pl-10 pr-10 rounded-2xl border border-[#EFE6D6] bg-white text-xs text-[#242424] focus:outline-none focus:border-[#FF3038] focus:ring-2 focus:ring-[#FF3038]/15 shadow-sm transition"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="w-7 h-7 rounded-full bg-[#FFF2DF] flex items-center justify-center text-[#8C867F] hover:text-[#242424] absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Sugerencias Rápidas */}
      {!trimmed && (
        <div className="space-y-3 pt-2">
          <h3 className="font-bold text-xs text-[#8C867F] uppercase tracking-wider">
            Búsquedas populares en Tacna
          </h3>
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setQuery(tag)}
                className="bg-white border border-[#EFE6D6] hover:border-[#FF3038] text-xs font-bold text-[#6B6662] hover:text-[#FF3038] px-3 py-1.5 rounded-xl transition cursor-pointer shadow-sm active:scale-95"
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="pt-6 text-center text-xs text-[#8C867F] space-y-1">
            <p>Escribe lo que buscas para ver resultados en tiempo real.</p>
            <p className="text-[11px] text-[#A8A29B]">
              Ejemplo: "promo", "tres quesos", "chicha morada"
            </p>
          </div>
        </div>
      )}

      {/* Resultados de búsqueda */}
      {trimmed && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[#8C867F] px-1">
            <span>
              Resultados para "<strong>{query}</strong>"
            </span>
            <span className="font-bold text-[#242424]">
              {results.length} encontrados
            </span>
          </div>

          {results.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {results.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  onOpenConfigurator={setConfigProduct}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-[#EFE6D6] rounded-3xl p-8 text-center space-y-3 shadow-sm my-4">
              <div className="w-12 h-12 rounded-full bg-[#FFF2DF] text-[#FF3038] flex items-center justify-center mx-auto">
                <Frown className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-[#242424] text-sm">
                No encontramos productos con ese nombre
              </h4>
              <p className="text-xs text-[#6B6662] max-w-[240px] mx-auto">
                Prueba buscando por palabras clave como "queso", "pizza" o consulta el menú completo.
              </p>
            </div>
          )}
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
