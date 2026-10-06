import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Flame, ArrowRight, ShieldCheck, Clock, MapPin } from 'lucide-react';
import { PRODUCTS } from '../../data/catalog';
import { ProductCard } from '../components/ProductCard';
import { ProductConfigurator } from '../components/ProductConfigurator';
import { Product } from '../../types/product';
import { siteConfig } from '../../config/site';
import { useUiStore } from '../../store/uiStore';

export const HomePage: React.FC = () => {
  const [configProduct, setConfigProduct] = useState<Product | null>(null);
  const devicePreview = useUiStore((s) => s.devicePreview);

  // Filtros destacados para el Inicio
  const tequenos = PRODUCTS.filter((p) => p.category === 'tequenos').slice(0, 4);
  const pizzas = PRODUCTS.filter((p) => p.category === 'pizzas').slice(0, 2);
  const promos = PRODUCTS.filter((p) => p.category === 'promociones').slice(0, 3);


  const categories = [
    { id: 'tequenos', label: 'Tequeños', icon: '🥟', to: '/app/menu?cat=tequenos' },
    { id: 'promociones', label: 'Promos', icon: '🔥', to: '/app/promociones' },
    { id: 'pizzas', label: 'Pizzas', icon: '🍕', to: '/app/menu?cat=pizzas' },
    { id: 'pastelitos', label: 'Pasteles', icon: '🥐', to: '/app/menu?cat=pastelitos' },
    { id: 'bebidas', label: 'Bebidas', icon: '🥤', to: '/app/menu?cat=bebidas' },
    { id: 'cremas', label: 'Cremas', icon: '🥣', to: '/app/menu?cat=cremas' },
  ];

  return (
    <div className="space-y-5 pb-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#FF3038] via-[#E52B33] to-[#B8181F] text-white p-5 pt-6 rounded-b-3xl shadow-lg shadow-[#FF3038]/15">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-black/20 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] font-bold text-[#FFF2DF]">
            <Sparkles className="w-3 h-3 text-[#F5A623]" />
            <span>Los auténticos tequeños de Tacna</span>
          </div>

          <h2 className="text-2xl font-black font-display tracking-tight leading-tight">
            Masa crocante y queso derretido en cada bocado
          </h2>

          <p className="text-white/85 text-xs max-w-[280px] leading-relaxed">
            Arma tu pedido, personaliza tus cremas favoritas y recíbelo por delivery coordinado por WhatsApp.
          </p>

          <div className="pt-2 flex items-center gap-2">
            <Link
              to="/app/menu"
              className="inline-flex items-center gap-1.5 bg-[#FFF8EE] text-[#FF3038] font-bold text-xs px-4 py-2.5 rounded-xl shadow-md active:scale-95 transition"
            >
              <span>Ver Menú Completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              to="/app/promociones"
              className="inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl backdrop-blur-sm active:scale-95 transition"
            >
              <span>Promos</span>
            </Link>
          </div>
        </div>

        {/* Decoraciones de fondo */}
        <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute top-2 right-4 text-6xl opacity-20 pointer-events-none select-none">
          🥟
        </div>
      </div>

      {/* Selector de Categorías (Pills) */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="font-bold text-[#242424] text-xs uppercase tracking-wider">
            Explora la carta
          </h3>
          <Link
            to="/app/menu"
            className="text-[11px] font-bold text-[#FF3038] hover:underline"
          >
            Ver todo
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={cat.to}
              className="bg-white border border-[#EFE6D6] hover:border-[#F5A623]/60 p-2.5 rounded-2xl flex flex-col items-center gap-1 text-center transition shadow-sm active:scale-95 group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">
                {cat.icon}
              </span>
              <span className="font-bold text-xs text-[#242424] leading-none">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Promociones Destacadas Banner */}
      {promos.length > 0 && (
        <div className="px-4">
          <div className="bg-gradient-to-r from-[#FFF2DF] to-[#FFE7C4] border border-[#F5C271]/50 p-4 rounded-3xl relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1 bg-[#FF3038] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                <Flame className="w-3 h-3 fill-white" />
                <span>Oferta Especial</span>
              </span>
              <Link
                to="/app/promociones"
                className="text-[11px] font-bold text-[#B8721C] hover:underline flex items-center gap-0.5"
              >
                <span>Ver combos</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <h4 className="font-black text-[#242424] text-base leading-snug">
              {promos[0].name}
            </h4>
            <p className="text-xs text-[#6B6662] mt-0.5 line-clamp-2">
              {promos[0].description}
            </p>

            <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#F5C271]/40">
              <span className="font-black text-[#FF3038] text-lg font-display">
                S/ {promos[0].promoPrice?.toFixed(2) || promos[0].basePrice?.toFixed(2)}
              </span>
              <Link
                to={`/app/product/${promos[0].slug}`}
                className="bg-[#FF3038] hover:bg-[#E52B33] text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm active:scale-95 transition"
              >
                Pedir ahora
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tequeños Más Pedidos */}
      <div className="px-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[#242424] text-sm flex items-center gap-1.5">
              <span>🔥 Los más pedidos de Tacna</span>
            </h3>
            <p className="text-[11px] text-[#8C867F]">
              Fritos al momento, con masa crocante
            </p>
          </div>
          <Link
            to="/app/menu?cat=tequenos"
            className="text-xs font-bold text-[#FF3038] hover:underline"
          >
            Ver más
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {tequenos.map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              onOpenConfigurator={setConfigProduct}
            />
          ))}
        </div>
      </div>

      {/* Pizzas Familiares */}
      {pizzas.length > 0 && (
        <div className="px-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#242424] text-sm flex items-center gap-1.5">
                <span>🍕 Pizzas Familiares</span>
              </h3>
              <p className="text-[11px] text-[#8C867F]">
                Masa artesanal y queso mozzarella generoso
              </p>
            </div>
            <Link
              to="/app/menu?cat=pizzas"
              className="text-xs font-bold text-[#FF3038] hover:underline"
            >
              Ver pizzas
            </Link>
          </div>

          <div
            className={`grid gap-3 ${
              devicePreview ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
            }`}
          >
            {pizzas.map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                horizontal
                onOpenConfigurator={setConfigProduct}
              />
            ))}
          </div>
        </div>
      )}



      {/* Card de Información de Entrega y Confianza */}
      <div className="px-4">
        <div className="bg-white border border-[#EFE6D6] rounded-2xl p-4 space-y-3 text-xs shadow-sm">
          <div className="flex items-center gap-2 font-bold text-[#242424]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Cómo funciona tu pedido:</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-[#6B6662]">
            <div className="flex items-start gap-2 bg-[#FFF8EE] p-2.5 rounded-xl border border-[#EFE6D6]">
              <Clock className="w-3.5 h-3.5 text-[#FF3038] shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[#242424]">Horario:</strong>
                <span>{siteConfig.hours}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-[#FFF8EE] p-2.5 rounded-xl border border-[#EFE6D6]">
              <MapPin className="w-3.5 h-3.5 text-[#FF3038] shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[#242424]">Ubicación:</strong>
                <span>{siteConfig.address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
