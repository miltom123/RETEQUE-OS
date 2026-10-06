import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Heart, Plus, Minus, Check, ShoppingCart } from 'lucide-react';
import { PRODUCTS } from '../../data/catalog';
import { formatMoney } from '../../lib/money';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { useCartStore } from '../../store/cartStore';
import { useFavoritesStore } from '../../store/favoritesStore';
import { useUiStore } from '../../store/uiStore';
import { ProductOption, getProductPrice } from '../../types/product';

export const ProductPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const product = PRODUCTS.find((p) => p.slug === slug || p.id === slug);
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useUiStore((s) => s.showToast);

  const presentations = product?.presentations || [];
  const [selectedPres, setSelectedPres] = useState<ProductOption | undefined>(
    presentations[0]
  );
  const [quantity, setQuantity] = useState(1);
  const [selectedSauces, setSelectedSauces] = useState<string[]>(['Mayonesa de ajo']);
  const [notes, setNotes] = useState('');

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

  const availableSauces = [
    'Mayonesa de ajo',
    'Tártara tradicional',
    'Mayopalta artesanal',
    'Guacamole de la casa',
    'Ají parrillero',
    'Golf especial',
  ];

  const basePrice = selectedPres
    ? selectedPres.price
    : getProductPrice(product);
  const totalPrice = basePrice * quantity;

  const toggleSauce = (sauce: string) => {
    if (selectedSauces.includes(sauce)) {
      setSelectedSauces(selectedSauces.filter((s) => s !== sauce));
    } else {
      if (selectedSauces.length >= 3) {
        setSelectedSauces([...selectedSauces.slice(1), sauce]);
      } else {
        setSelectedSauces([...selectedSauces, sauce]);
      }
    }
  };

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      image: product.image,
      quantity,
      unitPrice: basePrice,
      selectedPresentation: selectedPres?.label,
      selectedOptions: selectedSauces,
      notes: notes.trim() || undefined,
    });

    showToast({
      message: `¡${quantity} × ${product.name} agregado al pedido!`,
      action: 'cart',
    });

    navigate('/app/carrito');
  };

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
              {formatMoney(basePrice)}
            </span>
          </div>

          {product.description && (
            <p className="text-xs text-[#6B6662] mt-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {/* Presentaciones */}
        {presentations.length > 0 && (
          <div className="bg-white p-4 rounded-2xl border border-[#EFE6D6] space-y-2.5 shadow-sm">
            <span className="font-bold text-xs text-[#242424] block">
              Elige el tamaño / cantidad:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {presentations.map((pres) => {
                const isSelected = selectedPres?.id === pres.id;
                return (
                  <button
                    key={pres.id}
                    type="button"
                    onClick={() => setSelectedPres(pres)}
                    className={`p-3 rounded-xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#FF3038] bg-[#FFF8EE] text-[#FF3038]'
                        : 'border-[#EFE6D6] bg-white text-[#242424] hover:border-[#F5A623]/40'
                    }`}
                  >
                    <span className="font-bold text-xs">{pres.label}</span>
                    <span className="font-black text-sm mt-1 text-[#FF3038] font-display">
                      {formatMoney(pres.price)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Cremas */}
        <div className="bg-white p-4 rounded-2xl border border-[#EFE6D6] space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-[#242424]">
              Cremas artesanales incluidas:
            </span>
            <span className="text-[10px] font-bold text-[#FF3038] bg-[#FFF2DF] px-2 py-0.5 rounded-full">
              Hasta 3 salsas
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {availableSauces.map((sauce) => {
              const isSelected = selectedSauces.includes(sauce);
              return (
                <button
                  key={sauce}
                  type="button"
                  onClick={() => toggleSauce(sauce)}
                  className={`px-3 py-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'border-[#FF3038] bg-[#FFF8EE] text-[#FF3038] font-bold'
                      : 'border-[#EFE6D6] bg-white text-[#6B6662] hover:border-[#F5A623]/40 font-medium'
                  }`}
                >
                  <span className="text-xs truncate">{sauce}</span>
                  <div
                    className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${
                      isSelected
                        ? 'bg-[#FF3038] border-[#FF3038] text-white'
                        : 'border-[#D9CDBB]'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Indicaciones para cocina */}
        <div className="bg-white p-4 rounded-2xl border border-[#EFE6D6] space-y-2 shadow-sm">
          <label htmlFor="prod-notes" className="font-bold text-xs text-[#242424] block">
            Notas para tu pedido:
          </label>
          <input
            id="prod-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 100))}
            placeholder="Ej. Servilletas extra, cremas aparte..."
            className="w-full h-11 px-3.5 rounded-xl border border-[#EFE6D6] text-xs bg-[#FFFDF9] focus:outline-none focus:border-[#FF3038] transition"
          />
        </div>
      </div>
    </div>

      {/* Sticky Action Footer */}
      <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#EFE6D6] p-3.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#FFF8EE] border border-[#EFE6D6] rounded-xl px-2 py-1.5">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              aria-label="Disminuir cantidad"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#242424] hover:bg-white active:scale-95 transition cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-bold text-sm min-w-5 text-center">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              aria-label="Aumentar cantidad"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#242424] hover:bg-white active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 h-12 bg-[#FF3038] hover:bg-[#E52B33] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-between px-4 transition active:scale-[0.98] shadow-md shadow-[#FF3038]/20 cursor-pointer"
            aria-label="Agregar al carrito"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              <span>Agregar al carrito</span>
            </span>
            <span className="font-display font-black text-base">
              {formatMoney(totalPrice)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
