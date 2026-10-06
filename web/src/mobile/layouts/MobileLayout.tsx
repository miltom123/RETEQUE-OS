import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { MobileHeader } from '../components/MobileHeader';
import { BottomNavigation } from '../components/BottomNavigation';
import { Toast } from '../../components/layout/Toast';
import { Wifi, Smartphone, Monitor, Apple, SmartphoneCharging } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';

interface MobileLayoutProps {
  children?: React.ReactNode;
  title?: string;
  showBack?: boolean;
  hideBottomNav?: boolean;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  title,
  showBack,
  hideBottomNav = false,
}) => {
  const { platform, setPlatform, devicePreview, toggleDevicePreview } = useUiStore();
  const [timeStr, setTimeStr] = useState('9:41');

  // Reloj para el simulador de dispositivo
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTimeStr(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const isIos = platform === 'ios';

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        devicePreview
          ? 'bg-[#18181B] py-4 sm:py-8 px-2 sm:px-4 flex items-center justify-center'
          : 'bg-[#FAF8F4] flex flex-col items-center justify-start text-[#242424]'
      } ${isIos ? 'font-[-apple-system,BlinkMacSystemFont,"SF_Pro_Text","SF_Pro_Display",sans-serif]' : 'font-sans'}`}
    >
      {/* 
        MODO 1: SIMULADOR DE DISPOSITIVO (DEV PREVIEW)
        Activado si devicePreview === true (útil para demos y testing de UI encapsulada)
      */}
      {devicePreview ? (
        <div className="w-full sm:max-w-[425px] sm:h-[890px] sm:max-h-[96vh] bg-[#121212] sm:p-3 sm:rounded-[52px] sm:shadow-[0_25px_80px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.08),0_2px_0_rgba(255,255,255,0.12)_inset] sm:border-[3px] sm:border-[#2A2A2E] relative flex flex-col [transform:translateZ(0)]">
          {/* Botones físicos laterales */}
          <div className="hidden sm:block absolute -left-[7px] top-28 w-[4px] h-11 bg-[#2E2E32] rounded-l-md shadow-sm" />
          <div className="hidden sm:block absolute -left-[7px] top-42 w-[4px] h-11 bg-[#2E2E32] rounded-l-md shadow-sm" />
          <div className="hidden sm:block absolute -right-[7px] top-32 w-[4px] h-14 bg-[#2E2E32] rounded-r-md shadow-sm" />

          {/* Pantalla del dispositivo */}
          <div className="w-full h-full min-h-screen sm:min-h-0 sm:rounded-[42px] overflow-hidden bg-[#FAF8F4] text-[#242424] flex flex-col relative shadow-inner [transform:translateZ(0)]">
            {/* Status bar */}
            <div className="bg-[#FAF8F4] text-[#242424] h-7 px-5 flex items-center justify-between text-[11.5px] font-semibold select-none border-b border-[#EFE6D6]/40 shrink-0 z-50">
              <span className="font-bold tracking-tight">{timeStr}</span>

              {isIos ? (
                // Dynamic Island iOS style
                <div className="w-20 h-4 bg-black rounded-full mx-auto shrink-0 shadow-sm" />
              ) : (
                // Punch-hole Android style
                <div className="w-3 h-3 rounded-full bg-[#111] border border-neutral-800 shadow-inner shrink-0" />
              )}

              <div className="flex items-center gap-1.5 text-[#242424]/80">
                <span className="text-[10px] font-black tracking-tighter">5G</span>
                <Wifi className="w-3.5 h-3.5 stroke-[2.4]" />
                <div className="w-4 h-2.5 border border-current rounded-[2px] p-[1px] flex items-center">
                  <div className="w-full h-full bg-current rounded-[1px]" />
                </div>
              </div>
            </div>

            {/* Cabecera */}
            <MobileHeader title={title} showBack={showBack} />

            {/* Scroll view */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden relative no-scrollbar flex flex-col bg-[#FAF8F4]">
              {children || <Outlet />}
            </main>

            {/* Bottom Nav */}
            {!hideBottomNav && <BottomNavigation />}

            {/* Home indicator bar */}
            <div className="bg-white/95 backdrop-blur-md h-4 flex items-center justify-center shrink-0 border-t border-[#EFE6D6]/40">
              <span className="w-28 h-1 bg-[#242424]/20 rounded-full" />
            </div>

            <Toast />
          </div>
        </div>
      ) : (
        /* 
          MODO 2: PRODUCCIÓN RESPONSIVE REAL (VITE_DEVICE_PREVIEW=false)
          - Fondo claro #FAF8F4 continuo
          - En móvil: 100% viewport con safe areas
          - En tablet/desktop: Contenedor centrado max-w-4xl / max-w-5xl, limpio, elegante y productivo
        */
        <div className="w-full min-h-screen flex flex-col bg-[#FAF8F4]">
          <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col bg-[#FAF8F4] shadow-sm sm:border-x sm:border-[#EFE6D6]/60 relative min-h-screen">
            {/* Cabecera */}
            <MobileHeader title={title} showBack={showBack} />

            {/* Scroll view principal */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col pb-4">
              {children || <Outlet />}
            </main>

            {/* Bottom Nav interno de la app */}
            {!hideBottomNav && <BottomNavigation />}

            <Toast />
          </div>
        </div>
      )}

      {/* 
        SELECTOR FLOTANTE DEV / PREVIEW / PLATAFORMA (Visible en Desktop)
        Permite al cliente, desarrollador o tester cambiar entre el simulador y la web responsive,
        y alternar entre estilo Android y estilo iOS al instante.
      */}
      <aside
        aria-label="Controles de diseño y vista previa"
        className="fixed bottom-4 right-4 z-50 hidden md:flex items-center gap-2 bg-white/95 backdrop-blur-lg border border-[#EFE6D6] p-1.5 rounded-2xl shadow-xl text-xs font-semibold select-none text-[#242424]"
      >
        <button
          type="button"
          onClick={toggleDevicePreview}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
            devicePreview
              ? 'bg-[#FF3038] text-white shadow-sm'
              : 'hover:bg-[#FFF2DF] text-[#6B6662]'
          }`}
          title="Alternar entre modo simulador de smartphone y diseño web responsive"
        >
          {devicePreview ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
          <span>{devicePreview ? 'Simulador Celular' : 'Web Responsive'}</span>
        </button>

        <div className="w-[1px] h-4 bg-[#EFE6D6]" />

        <button
          type="button"
          onClick={() => setPlatform(isIos ? 'default' : 'ios')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
            isIos
              ? 'bg-[#242424] text-white shadow-sm'
              : 'hover:bg-[#FFF2DF] text-[#6B6662]'
          }`}
          title="Alternar tokens de estilo entre Android (Material 3) y Apple (iOS Cupertino)"
        >
          {isIos ? <Apple className="w-3.5 h-3.5" /> : <SmartphoneCharging className="w-3.5 h-3.5" />}
          <span>{isIos ? 'Modo iOS' : 'Modo Android'}</span>
        </button>
      </aside>
    </div>
  );
};

