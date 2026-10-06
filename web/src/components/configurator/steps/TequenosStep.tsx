import React from 'react';
import { ChevronUp, ChevronDown, Sparkles, Plus, Minus } from 'lucide-react';
import { TEQUEÑO_FLAVORS } from '../configuratorData';

interface TequenosStepProps {
  isOpen: boolean;
  onToggle: () => void;
  targetTequeños: number;
  totalSelectedTequeños: number;
  isFlavorsCompleted: boolean;
  flavorCounts: Record<string, number>;
  onFlavorDelta: (flavorId: string, delta: number) => void;
}

export const TequenosStep: React.FC<TequenosStepProps> = ({
  isOpen,
  onToggle,
  targetTequeños,
  totalSelectedTequeños,
  isFlavorsCompleted,
  flavorCounts,
  onFlavorDelta,
}) => {
  return (
    <div className="shrink-0 bg-white border border-line-soft rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3.5 py-3.5 flex items-center justify-between text-left hover:bg-surface transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-red-light flex items-center justify-center text-brand-red">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-[14.5px] text-ink">
              Elige los Sabores de tus Tequeños
            </h3>
            <p className="text-[12.5px] text-ink-muted mt-0.5">
              {totalSelectedTequeños}/{targetTequeños} unidades seleccionadas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`font-bold text-[11.5px] px-2.5 py-1 rounded-md ${
              isFlavorsCompleted
                ? 'bg-[#E8F8EE] text-[#0F7A3D]'
                : 'bg-brand-red-light text-brand-red-dark'
            }`}
          >
            {isFlavorsCompleted ? 'Completado' : `Faltan ${targetTequeños - totalSelectedTequeños}`}
          </span>
          {isOpen ? <ChevronUp className="w-5 h-5 text-neutral-400" /> : <ChevronDown className="w-5 h-5 text-neutral-400" />}
        </div>
      </button>

      <div className="h-[3px] bg-surface-2 mx-3.5 rounded-sm overflow-hidden" aria-hidden="true">
        <div
          className={`h-full rounded-sm transition-all duration-300 ${isFlavorsCompleted ? 'bg-[#16A34A]' : 'bg-brand-red'}`}
          style={{ width: `${targetTequeños > 0 ? Math.min(100, (totalSelectedTequeños / targetTequeños) * 100) : 0}%` }}
        />
      </div>

      {isOpen && (
        <div className="px-3.5 pb-2 divide-y divide-surface-3">
          {TEQUEÑO_FLAVORS.map((flavor) => {
            const count = flavorCounts[flavor.id] || 0;
            return (
              <div key={flavor.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={flavor.image}
                    alt={flavor.name}
                    className="w-12 h-9 object-cover rounded-lg border border-neutral-200"
                  />
                  <span className="font-bold text-xs sm:text-sm text-neutral-900">
                    {flavor.name}
                  </span>
                </div>

                {count > 0 ? (
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onFlavorDelta(flavor.id, -1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center bg-ink text-white font-bold hover:bg-black transition-colors cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center font-extrabold text-ink text-[13.5px]">
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={() => onFlavorDelta(flavor.id, 1)}
                      disabled={totalSelectedTequeños >= targetTequeños}
                      className="w-7 h-7 rounded-lg flex items-center justify-center border border-[#E0DCD5] bg-white text-ink font-bold hover:border-ink disabled:opacity-35 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onFlavorDelta(flavor.id, 1)}
                    disabled={totalSelectedTequeños >= targetTequeños}
                    className="w-7 h-7 rounded-lg flex items-center justify-center border border-[#E0DCD5] bg-white text-ink font-bold hover:border-ink disabled:opacity-35 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
