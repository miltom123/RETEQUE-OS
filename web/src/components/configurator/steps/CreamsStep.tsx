import React from 'react';
import { ChevronUp, ChevronDown, Plus, Minus } from 'lucide-react';
import { CREAMS } from '../configuratorData';

interface CreamsStepProps {
  isOpen: boolean;
  onToggle: () => void;
  targetCreams: number;
  totalSelectedCreams: number;
  isCreamsCompleted: boolean;
  creamCounts: Record<string, number>;
  onCreamDelta: (creamId: string, delta: number) => void;
}

export const CreamsStep: React.FC<CreamsStepProps> = ({
  isOpen,
  onToggle,
  targetCreams,
  totalSelectedCreams,
  isCreamsCompleted,
  creamCounts,
  onCreamDelta,
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
            Elige tus Cremas de 2 oz
          </h3>
          <p className="text-[12.5px] text-ink-muted mt-0.5">
            {totalSelectedCreams}/{targetCreams} cremas incluidas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`font-bold text-[11.5px] px-2.5 py-1 rounded-md ${
              isCreamsCompleted
                ? 'bg-[#E8F8EE] text-[#0F7A3D]'
                : 'bg-brand-red-light text-brand-red-dark'
            }`}
          >
            {isCreamsCompleted ? 'Completado' : `Faltan ${targetCreams - totalSelectedCreams}`}
          </span>
          {isOpen ? <ChevronUp className="w-5 h-5 text-neutral-400" /> : <ChevronDown className="w-5 h-5 text-neutral-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-3.5 pb-2 divide-y divide-surface-3">
          {CREAMS.map((cream) => {
            const count = creamCounts[cream.id] || 0;
            return (
              <div key={cream.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={cream.image}
                    alt={cream.name}
                    className="w-10 h-8 object-contain rounded"
                  />
                  <span className="font-bold text-xs sm:text-sm text-neutral-900">
                    {cream.name}
                  </span>
                </div>

                {count > 0 ? (
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onCreamDelta(cream.id, -1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center bg-ink text-white font-bold hover:bg-black transition-colors cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center font-extrabold text-ink text-[13.5px]">
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={() => onCreamDelta(cream.id, 1)}
                      disabled={totalSelectedCreams >= targetCreams}
                      className="w-7 h-7 rounded-lg flex items-center justify-center border border-[#E0DCD5] bg-white text-ink font-bold hover:border-ink disabled:opacity-35 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onCreamDelta(cream.id, 1)}
                    disabled={totalSelectedCreams >= targetCreams}
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
