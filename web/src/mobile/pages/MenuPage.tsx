import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PRODUCTS } from '../../data/catalog';
import { ProductCard } from '../components/ProductCard';
import { ProductConfigurator } from '../components/ProductConfigurator';
import { Product, ProductCategory } from '../../types/product';

export const MenuPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const catParam = searchParams.get('cat') as ProductCategory | 'todos' | null;

  const [activeCategory, setActiveCategory] = useState<string>(catParam || 'todos');
  const [configProduct, setConfigProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (catParam) {
      setActiveCategory(catParam);
    }
  }, [catParam]);

  const categories = [
    { id: 'todos', label: 'Todos' },
    { id: 'tequenos', label: 'Tequeños' },
    { id: 'promociones', label: 'Promos' },
    { id: 'pizzas', label: 'Pizzas' },
    { id: 'pastelitos', label: 'Pastelitos' },
    { id: 'bebidas', label: 'Bebidas' },
    { id: 'cremas', label: 'Cremas' },
  ];

  const handleSelectCategory = (catId: string) => {
    setActiveCategory(catId);
    if (catId === 'todos') {
      searchParams.delete('cat');
    } else {
      searchParams.set('cat', catId);
    }
    setSearchParams(searchParams);
  };

  const filteredProducts =
    activeCategory === 'todos'
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.category === activeCategory);

  return (
    <div className="space-y-4 p-4 pb-8">
      {/* Search Bar Input Link */}
      <Link
        to="/app/search"
        className="w-full h-11 bg-white border border-[#EFE6D6] rounded-2xl px-4 flex items-center gap-2.5 text-xs text-[#8C867F] shadow-sm hover:border-[#F5A623]/60 transition"
      >
        <Search className="w-4 h-4 text-[#FF3038]" />
        <span>¿Qué se te antoja hoy? (ej. queso, maracuyá...)</span>
      </Link>

      {/* Tabs de Categorías */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 py-1">
        {categories.map((cat) => {
          const isSelected = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleSelectCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 border ${
                isSelected
                  ? 'bg-[#FF3038] text-white border-[#FF3038] shadow-sm shadow-[#FF3038]/25'
                  : 'bg-white text-[#6B6662] border-[#EFE6D6] hover:border-[#F5A623]/40'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Contador de productos */}
      <div className="flex items-center justify-between text-xs text-[#8C867F] px-1">
        <span>
          Mostrando <strong>{filteredProducts.length}</strong> productos
        </span>
        <span className="capitalize">{activeCategory}</span>
      </div>

      {/* Grid de Productos */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {filteredProducts.map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              onOpenConfigurator={setConfigProduct}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-[#EFE6D6] rounded-3xl p-8 text-center space-y-2 shadow-sm my-4">
          <p className="font-bold text-[#242424] text-sm">No hay productos en esta categoría</p>
          <p className="text-xs text-[#8C867F]">Prueba seleccionando otra sección del menú.</p>
        </div>
      )}


      {/* Modal de Configuración Rápida */}
      {configProduct && (
        <ProductConfigurator
          product={configProduct}
          onClose={() => setConfigProduct(null)}
        />
      )}
    </div>
  );
};
