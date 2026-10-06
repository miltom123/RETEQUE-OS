import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { DRINKS, DrinkOption } from '../configuratorData';
import { formatMoney } from '../../../lib/money';

interface DrinksStepProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedDrinkId: string;
  selectedDrink?: DrinkOption;
  onSelectDrink: (drinkId: string) => void;
}

export const DrinksStep: React.FC<DrinksStepProps> = ({
  isOpen,
  onToggle,
  selectedDrinkId,
  selectedDrink,
  onSelectDrink,
}) => {
  return (
    <div className="shrink-0 bg-white border border-line-soft rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3.5 py-3.5 flex items-center justify-between text-left hover:bg-surface transition-colors cursor-pointer"
      >
        <div>
          <h3 className="font-extrabold text-[14.5px] text-ink">
            Elige el Sabor de tu Bebida
          </h3>
          <p className="text-[12.5px] text-ink-muted mt-0.5">{selectedDrink?.name || 'Selecciona una bebida'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-[#E8F8EE] text-[#0F7A3D] font-bold text-[11.5px] px-2.5 py-1 rounded-md">
            Completado
          </span>
          {isOpen ? <ChevronUp className="w-5 h-5 text-neutral-400" /> : <ChevronDown className="w-5 h-5 text-neutral-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-3.5 pb-2 divide-y divide-surface-3">
          {DRINKS.map((drink) => {
            const isSelected = selectedDrinkId === drink.id;
            return (
              <div
                key={drink.id}
                onClick={() => onSelectDrink(drink.id)}
                className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-neutral-50 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={drink.image}
                    alt={drink.name}
                    className="w-8 h-8 object-contain rounded"
                  />
                  <span className="font-bold text-xs sm:text-sm text-neutral-900">
                    {drink.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {drink.extraPrice > 0 && (
                    <span className="text-xs font-bold text-neutral-500">
                      +{formatMoney(drink.extraPrice)}
                    </span>
                  )}
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-[#D31728] bg-[#D31728]' : 'border-neutral-300'
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
