import React, { useState } from 'react';
import { Flame, Tag } from 'lucide-react';
import { PRODUCTS } from '../../data/catalog';
import { PromoCard } from '../components/PromoCard';
import { ProductConfigurator } from '../components/ProductConfigurator';
import { Product } from '../../types/product';
import { useUiStore } from '../../store/uiStore';

export const PromotionsPage: React.FC = () => {
  const [configProduct, setConfigProduct] = useState<Product | null>(null);
  const devicePreview = useUiStore((s) => s.devicePreview);

  const promos = PRODUCTS.filter((p) => p.category === 'promociones');

  return (
    <div className="p-3.5 sm:p-4 space-y-4 pb-28">
      {/* Banner de Promociones */}
      <div className="bg-gradient-to-r from-[#FF3038] via-[#E25822] to-[#F5A623] text-white p-4 sm:p-5 rounded-3xl relative overflow-hidden shadow-md">
        <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[10.5px] font-bold text-[#FFF8EE] w-fit mb-2">
          <Flame className="w-3.5 h-3.5 text-[#FFE7C4] fill-[#FFE7C4]" />
          <span>Combos para compartir en Tacna</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight leading-tight">
          ¡Ahorra más combinando tus favoritos!
        </h2>
        <p className="text-white/95 text-xs mt-1.5 max-w-md leading-relaxed">
          Promociones armadas con nuestros tequeños clásicos, pizzas y salsas artesanales a precio especial.
        </p>
      </div>

      {/* Contador y Metadatos de Promociones */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#8C867F] px-1">
        <span>
          <strong>{promos.length}</strong> promociones disponibles hoy
        </span>
        <span className="font-bold text-[#FF3038] flex items-center gap-1 bg-[#FFF2DF] px-2.5 py-1 rounded-lg">
          <Tag className="w-3.5 h-3.5" />
          <span>Precios exclusivos</span>
        </span>
      </div>

      {/* 
        Grid de Promociones:
        - En móvil o simulador de smartphone: 1 columna completa para máxima legibilidad,
          títulos sin truncar, precios en una sola línea y botones contenidos.
        - En tablet/desktop responsive: 2 columnas espaciosas.
      */}
      <div
        className={`grid gap-3.5 sm:gap-4 ${
          devicePreview ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
        }`}
      >
        {promos.map((promo) => (
          <PromoCard
            key={promo.id}
            product={promo}
            onOpenConfigurator={setConfigProduct}
          />
        ))}
      </div>

      {/* Modal de Configuración Rápida de la Promo */}
      {configProduct && (
        <ProductConfigurator
          product={configProduct}
          onClose={() => setConfigProduct(null)}
        />
      )}
    </div>
  );
};

