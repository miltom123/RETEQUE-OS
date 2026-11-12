import React, { useLayoutEffect, useRef, useState } from 'react';
import { LocateFixed, Minus, Plus, X } from 'lucide-react';

/**
 * Mapa para marcar el punto de entrega (RFI-06) con mosaicos de OpenStreetMap, sin librerías.
 * Toca el mapa para mover el pin, o usa "Mi ubicación" (necesita HTTPS o localhost).
 */
export interface LatLng {
  lat: number;
  lng: number;
}

// Local de Retequeños en Tacna: centro inicial del mapa
const TACNA: LatLng = { lat: -18.0146, lng: -70.2536 };
const TILE = 256;
const HEIGHT = 220;

const worldSize = (z: number) => TILE * 2 ** z;
function toPixel({ lat, lng }: LatLng, z: number) {
  const s = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * worldSize(z),
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * worldSize(z),
  };
}
function toLatLng(x: number, y: number, z: number): LatLng {
  const n = Math.PI - (2 * Math.PI * y) / worldSize(z);
  return {
    lat: Math.round(((180 / Math.PI) * Math.atan(Math.sinh(n))) * 1e6) / 1e6,
    lng: Math.round(((x / worldSize(z)) * 360 - 180) * 1e6) / 1e6,
  };
}

interface MapPickerProps {
  value?: LatLng;
  onChange: (value: LatLng | undefined) => void;
}

export const MapPicker: React.FC<MapPickerProps> = ({ value, onChange }) => {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const [zoom, setZoom] = useState(16);
  const [center, setCenter] = useState<LatLng>(value || TACNA);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth || 320);
    update();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(el);
    return () => observer?.disconnect();
  }, []);

  const c = toPixel(center, zoom);
  const left = c.x - width / 2;
  const top = c.y - HEIGHT / 2;
  const tiles: { x: number; y: number }[] = [];
  const max = 2 ** zoom;
  for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + width) / TILE); tx++) {
    for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + HEIGHT) / TILE); ty++) {
      if (ty >= 0 && ty < max) tiles.push({ x: tx, y: ty });
    }
  }
  const pin = value ? toPixel(value, zoom) : null;

  const pick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const point = toLatLng(left + e.clientX - rect.left, top + e.clientY - rect.top, zoom);
    onChange(point);
    setCenter(point);
  };

  const locate = () => {
    setGeoError(null);
    if (!('geolocation' in navigator)) {
      setGeoError('Tu navegador no permite ubicarte. Toca el mapa para marcar el punto.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point = { lat: Math.round(pos.coords.latitude * 1e6) / 1e6, lng: Math.round(pos.coords.longitude * 1e6) / 1e6 };
        onChange(point);
        setCenter(point);
        setZoom(17);
        setLocating(false);
      },
      () => {
        setGeoError('No pudimos obtener tu ubicación. Toca el mapa para marcar el punto de entrega.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-[#242424]">Ubicación en el mapa <span className="text-[#6B6662] font-normal">(toca para marcar)</span></span>
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C8102E] bg-[#FFF2DF] px-2.5 py-1.5 rounded-lg disabled:opacity-60 cursor-pointer"
        >
          <LocateFixed className="w-3.5 h-3.5" />
          {locating ? 'Ubicando…' : 'Mi ubicación'}
        </button>
      </div>

      <div
        ref={box}
        onClick={pick}
        role="application"
        aria-label="Mapa: toca para marcar el punto de entrega"
        className="relative w-full overflow-hidden rounded-xl border border-[#EFE6D6] bg-[#E8E4DC] cursor-crosshair select-none"
        style={{ height: HEIGHT }}
      >
        {tiles.map((t) => (
          <img
            key={`${zoom}-${t.x}-${t.y}`}
            src={`https://tile.openstreetmap.org/${zoom}/${((t.x % max) + max) % max}/${t.y}.png`}
            alt=""
            draggable={false}
            className="absolute max-w-none pointer-events-none"
            style={{ width: TILE, height: TILE, left: t.x * TILE - left, top: t.y * TILE - top }}
          />
        ))}
        {pin && (
          <div
            className="absolute -translate-x-1/2 -translate-y-full pointer-events-none text-[28px] leading-none drop-shadow"
            style={{ left: pin.x - left, top: pin.y - top }}
            aria-hidden="true"
          >
            📍
          </div>
        )}
        <div className="absolute right-2 top-2 flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
          <button type="button" aria-label="Acercar" onClick={() => setZoom((z) => Math.min(18, z + 1))} className="w-8 h-8 bg-white rounded-lg shadow flex items-center justify-center cursor-pointer"><Plus className="w-4 h-4" /></button>
          <button type="button" aria-label="Alejar" onClick={() => setZoom((z) => Math.max(12, z - 1))} className="w-8 h-8 bg-white rounded-lg shadow flex items-center justify-center cursor-pointer"><Minus className="w-4 h-4" /></button>
        </div>
        <span className="absolute left-1 bottom-1 bg-white/85 text-[9px] text-[#4B4540] px-1 rounded pointer-events-none">© OpenStreetMap</span>
      </div>

      {value ? (
        <div className="flex items-center justify-between text-[11px] text-[#4B4540]">
          <span>📍 Punto marcado ({value.lat.toFixed(5)}, {value.lng.toFixed(5)})</span>
          <button type="button" onClick={() => onChange(undefined)} className="inline-flex items-center gap-0.5 font-bold text-[#C8102E] cursor-pointer">
            <X className="w-3 h-3" /> Quitar
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-[#6B6662]">Opcional, pero ayuda al motorizado a llegar más rápido.</p>
      )}
      {geoError && <p className="text-[11px] font-bold text-[#C8102E]">{geoError}</p>}
    </div>
  );
};
