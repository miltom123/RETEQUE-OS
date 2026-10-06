
interface Option<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel }: SegmentedControlProps<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex flex-wrap gap-1 bg-surface-2 p-[3px] rounded-[10px]">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.id)}
            className={`text-[12.5px] font-bold px-3 py-[7px] rounded-lg transition-colors ${
              on ? 'bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,.1)]' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {o.label}
            {typeof o.count === 'number' && <span className="ml-1 opacity-50 font-semibold">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
