import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export const OfflinePage: React.FC = () => {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="p-8 text-center space-y-4 my-12">
      <div className="w-16 h-16 rounded-full bg-[#FFF2DF] text-[#FF3038] flex items-center justify-center mx-auto shadow-sm">
        <WifiOff className="w-8 h-8" />
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-black text-[#242424] font-display">
          Sin conexión a internet
        </h2>
        <p className="text-xs text-[#6B6662] max-w-[260px] mx-auto leading-relaxed">
          Parece que perdiste la señal. Revisa tu conexión Wi-Fi o datos móviles para continuar armando tu pedido.
        </p>
      </div>

      <div className="pt-2 flex flex-col gap-2 max-w-[200px] mx-auto">
        <button
          type="button"
          onClick={handleReload}
          className="h-11 bg-[#FF3038] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reintentar</span>
        </button>

        <Link
          to="/app"
          className="h-10 border border-[#EFE6D6] bg-white text-[#242424] text-xs font-bold rounded-xl flex items-center justify-center hover:bg-[#FFF2DF] transition"
        >
          Ir al Inicio
        </Link>
      </div>
    </div>
  );
};
