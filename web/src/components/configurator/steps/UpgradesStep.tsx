import React from 'react';
import { ChevronUp, ChevronDown, Plus } from 'lucide-react';
import { UPGRADES } from '../configuratorData';
import { formatMoney } from '../../../lib/money';

interface UpgradesStepProps {
  isOpen: boolean;
  onToggle: () => void;
  upgradeCounts: Record<string, number>;
  onUpgradeDelta: (upgradeId: string, delta: number) => void;
}

export const UpgradesStep: React.FC<UpgradesStepProps> = ({
  isOpen,
  onToggle,
  upgradeCounts,
  onUpgradeDelta,
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
            Adicionales y Cremas Extra
          </h3>
          <p className="text-[12.5px] text-ink-muted mt-0.5">Elige porciones adicionales</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="border border-neutral-300 text-neutral-700 font-bold text-[11.5px] px-2.5 py-1 rounded-md">
            Opcional
          </span>
          {isOpen ? <ChevronUp className="w-5 h-5 text-neutral-400" /> : <ChevronDown className="w-5 h-5 text-neutral-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-3.5 pb-2 divide-y divide-surface-3 max-h-72 overflow-y-auto">
          {UPGRADES.map((upgrade) => {
            const count = upgradeCounts[upgrade.id] || 0;
            return (
              <div key={upgrade.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={upgrade.image}
                    alt={upgrade.name}
                    className="w-9 h-7 object-cover rounded shrink-0 border border-neutral-100"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-neutral-900 truncate">
                      {upgrade.name}
                    </div>
                    <div className="text-[11px] font-bold text-neutral-500">
                      +{formatMoney(upgrade.price)}
                    </div>
                  </div>
                </div>

                {count > 0 ? (
                  <div className="inline-flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onUpgradeDelta(upgrade.id, -1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center bg-ink text-white font-bold hover:bg-black transition-colors cursor-pointer"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-extrabold text-ink text-[13.5px]">
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpgradeDelta(upgrade.id, 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center border border-[#E0DCD5] bg-white text-ink font-bold hover:border-ink transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onUpgradeDelta(upgrade.id, 1)}
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
