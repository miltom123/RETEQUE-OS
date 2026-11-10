import { create } from 'zustand';
import { syncCatalogWithServer } from '../services/catalog.api';

interface CatalogStore {
  /** Cambia cada vez que se aplican precios o stock del servidor, para volver a pintar la carta. */
  version: number;
  sync: () => Promise<void>;
}

export const useCatalogStore = create<CatalogStore>()((set, get) => ({
  version: 0,
  sync: async () => {
    try {
      if (await syncCatalogWithServer()) set({ version: get().version + 1 });
    } catch {
      // Sin conexión con la API: se mantienen los precios locales
    }
  },
}));
