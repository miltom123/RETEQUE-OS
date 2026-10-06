import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../data/catalog';
import type { Promotion } from '../data/promotions';

export type ConfigurableItem = Product | Promotion;
export type UiPlatform = 'default' | 'ios';

export interface ToastState {
  message: string;
  action?: 'cart';
}

interface UiStore {
  productToConfigure: ConfigurableItem | null;
  openConfigurator: (item: ConfigurableItem) => void;
  closeConfigurator: () => void;
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  toast: ToastState | null;
  showToast: (toast: ToastState) => void;
  hideToast: () => void;

  // Platform & Viewport Mode (Plan Secciones 3, 4 y 10)
  platform: UiPlatform;
  setPlatform: (platform: UiPlatform) => void;
  devicePreview: boolean;
  setDevicePreview: (active: boolean) => void;
  toggleDevicePreview: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useUiStore = create<UiStore>()(
  persist(
    (set, get) => ({
      productToConfigure: null,
      openConfigurator: (item) =>
        set({ productToConfigure: item, isMobileMenuOpen: false, isSearchOpen: false }),
      closeConfigurator: () => set({ productToConfigure: null }),

      isMobileMenuOpen: false,
      setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),

      isSearchOpen: false,
      setSearchOpen: (open) => set({ isSearchOpen: open }),

      toast: null,
      showToast: (toast) => {
        if (toastTimer) clearTimeout(toastTimer);
        set({ toast });
        toastTimer = setTimeout(() => set({ toast: null }), 2800);
      },
      hideToast: () => {
        if (toastTimer) clearTimeout(toastTimer);
        set({ toast: null });
      },

      // Platform: 'default' (Android / Material 3) o 'ios' (Cupertino)
      platform: 'default',
      setPlatform: (platform) => {
        localStorage.setItem('retequenos-ui-platform', platform);
        set({ platform });
      },

      // Device preview: si true muestra chasis de celular; si false layout responsive de producción
      devicePreview:
        typeof window !== 'undefined'
          ? import.meta.env.VITE_DEVICE_PREVIEW === 'true' ||
            localStorage.getItem('retequenos-device-preview') === 'true'
          : false,
      setDevicePreview: (devicePreview) => {
        localStorage.setItem('retequenos-device-preview', String(devicePreview));
        set({ devicePreview });
      },
      toggleDevicePreview: () => {
        const next = !get().devicePreview;
        localStorage.setItem('retequenos-device-preview', String(next));
        set({ devicePreview: next });
      },
    }),
    {
      name: 'retequenos-ui-settings',
      partialize: (state) => ({
        platform: state.platform,
        devicePreview: state.devicePreview,
      }),
    }
  )
);

