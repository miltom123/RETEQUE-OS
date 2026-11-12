import React from 'react';
import { CalendarClock, Zap } from 'lucide-react';

/** "Lo antes posible" o programar fecha y hora (RFI-07). El servidor exige 30 min a 7 días. */
interface ScheduleSelectorProps {
  /** Valor de <input type="datetime-local"> o '' para lo antes posible. */
  value: string;
  scheduled: boolean;
  onChangeScheduled: (scheduled: boolean) => void;
  onChange: (value: string) => void;
  error?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
/** Fecha local en el formato de datetime-local (AAAA-MM-DDTHH:mm). */
export function toLocalInput(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const SCHEDULE_MIN_MS = 35 * 60 * 1000; // 5 min de margen sobre los 30 del servidor
export const SCHEDULE_MAX_MS = 7 * 24 * 60 * 60 * 1000;

export function scheduleError(value: string): string | undefined {
  const time = Date.parse(value);
  if (!value || !Number.isFinite(time)) return 'Elige la fecha y hora de tu pedido.';
  if (time < Date.now() + 30 * 60 * 1000) return 'Programa con al menos 30 minutos de anticipación.';
  if (time > Date.now() + SCHEDULE_MAX_MS) return 'Puedes programar hasta 7 días antes.';
  return undefined;
}

export const ScheduleSelector: React.FC<ScheduleSelectorProps> = ({ value, scheduled, onChangeScheduled, onChange, error }) => (
  <div className="bg-white rounded-2xl border border-[#EFE6D6] p-4 space-y-3 shadow-sm">
    <h3 className="font-bold text-[#242424] text-sm">¿Para cuándo?</h3>
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Momento del pedido">
      {[
        { on: false, label: 'Lo antes posible', Icon: Zap },
        { on: true, label: 'Programar', Icon: CalendarClock },
      ].map(({ on, label, Icon }) => (
        <button
          key={label}
          type="button"
          role="radio"
          aria-checked={scheduled === on}
          onClick={() => {
            onChangeScheduled(on);
            if (on && !value) onChange(toLocalInput(Date.now() + 60 * 60 * 1000));
          }}
          className={`h-11 rounded-xl border-2 flex items-center justify-center gap-2 text-xs font-bold transition cursor-pointer ${
            scheduled === on ? 'border-[#FF3038] bg-[#FFF8EE] text-[#C8102E]' : 'border-[#EFE6D6] bg-white text-[#4B4540]'
          }`}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
    {scheduled && (
      <div>
        <label htmlFor="schedule-at" className="block text-xs font-bold text-[#242424] mb-1">Fecha y hora</label>
        <input
          id="schedule-at"
          type="datetime-local"
          value={value}
          min={toLocalInput(Date.now() + SCHEDULE_MIN_MS)}
          max={toLocalInput(Date.now() + SCHEDULE_MAX_MS)}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-11 px-3 rounded-xl border text-xs bg-[#FFFDF9] focus:outline-none ${error ? 'border-[#FF3038]' : 'border-[#EFE6D6] focus:border-[#FF3038]'}`}
        />
        {error && <p className="text-[11px] text-[#C8102E] font-bold mt-1">{error}</p>}
        <p className="text-[11px] text-[#6B6662] mt-1">Atendemos {`Lun a Dom de 5:00 p. m. a 11:00 p. m.`}; te confirmamos el horario por WhatsApp.</p>
      </div>
    )}
  </div>
);
