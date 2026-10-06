import React, { useState } from 'react';
import { X, Plus, Minus, Check, ShoppingCart } from 'lucide-react';
import { Product, ProductOption, getProductPrice } from '../../types/product';
import { formatMoney } from '../../lib/money';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { useCartStore } from '../../store/cartStore';
import { useUiStore } from '../../store/uiStore';

interface ProductConfiguratorProps {
  product: Product;
  onClose: () => void;
}

export const ProductConfigurator: React.FC<ProductConfiguratorProps> = ({
  product,
  onClose,
}) => {
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useUiStore((s) => s.showToast);

  const presentations = product.presentations || [];
  const [selectedPres, setSelectedPres] = useState<ProductOption | undefined>(
    presentations[0]
  );
  const [quantity, setQuantity] = useState(1);
  const [selectedSauces, setSelectedSauces] = useState<string[]>(['Mayonesa de ajo']);
  const [notes, setNotes] = useState('');

  // Salsas sugeridas para tequeños/promos
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

  const unitPrice = basePrice;
  const totalPrice = unitPrice * quantity;

  const toggleSauce = (sauce: string) => {
    if (selectedSauces.includes(sauce)) {
      setSelectedSauces(selectedSauces.filter((s) => s !== sauce));
    } else {
      if (selectedSauces.length >= 3) {
        // Máximo 3 salsas por porción
        setSelectedSauces([...selectedSauces.slice(1), sauce]);
      } else {
        setSelectedSauces([...selectedSauces, sauce]);
      }
    }
  };

  const handleConfirm = () => {
    addItem({
      productId: product.id,
      name: product.name,
      image: product.image,
      quantity,
      unitPrice,
      selectedPresentation: selectedPres?.label,
      selectedOptions: selectedSauces,
      notes: notes.trim() || undefined,
    });

    showToast({
      message: `¡${quantity} × ${product.name} agregado al pedido!`,
      action: 'cart',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-[#FFF8EE] rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-[#EFE6D6] animate-slide-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="relative p-4 pb-3 border-b border-[#EFE6D6] bg-white flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-[#FFF2DF] overflow-hidden shrink-0 border border-[#EFE6D6]">
              <ImageWithFallback
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-[#242424] text-base leading-tight truncate">
                {product.name}
              </h3>
              <p className="text-xs text-[#8C867F]">Personaliza tu porción</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FFF8EE] hover:bg-[#FFF2DF] flex items-center justify-center text-[#8C867F] hover:text-[#242424] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Presentaciones */}
          {presentations.length > 0 && (
            <div className="bg-white p-3.5 rounded-2xl border border-[#EFE6D6] space-y-2.5">
              <span className="font-bold text-[#242424] text-xs block">
                Selecciona la presentación:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {presentations.map((pres) => {
                  const isSelected = selectedPres?.id === pres.id;
                  return (
                    <button
                      key={pres.id}
                      type="button"
                      onClick={() => setSelectedPres(pres)}
                      className={`p-2.5 rounded-xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
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

          {/* Salsas y Cremas */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#EFE6D6] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#242424] text-xs">
                Cremas y salsas artesanales:
              </span>
              <span className="text-[10.5px] font-bold text-[#FF3038] bg-[#FFF2DF] px-2 py-0.5 rounded-full">
                Hasta 3 incluidas
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {availableSauces.map((sauce) => {
                const isSelected = selectedSauces.includes(sauce);
                return (
                  <button
                    key={sauce}
                    type="button"
                    onClick={() => toggleSauce(sauce)}
                    className={`px-3 py-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
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

          {/* Notas */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#EFE6D6] space-y-2">
            <label htmlFor="config-notes" className="font-bold text-[#242424] text-xs block">
              Indicaciones especiales para este ítem:
            </label>
            <input
              id="config-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 100))}
              placeholder="Ej. Sin orégano, bien doraditos..."
              className="w-full h-10 px-3 rounded-xl border border-[#EFE6D6] text-xs bg-[#FFFDF9] focus:outline-none focus:border-[#FF3038]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#EFE6D6] bg-white flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#FFF8EE] border border-[#EFE6D6] rounded-xl px-2 py-1">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#242424] hover:bg-white active:scale-95 transition"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-bold text-sm min-w-5 text-center">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#242424] hover:bg-white active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 h-12 bg-[#FF3038] hover:bg-[#E52B33] text-white font-bold text-sm rounded-xl flex items-center justify-between px-4 transition active:scale-[0.98] shadow-md shadow-[#FF3038]/20 cursor-pointer"
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
