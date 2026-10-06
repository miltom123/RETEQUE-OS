import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritesStore {
  favoriteIds: string[];
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favoriteIds: ['clasicos', 'promo-duo', 'familiar-americana'], // Favoritos iniciales sugeridos

      toggleFavorite: (productId: string) => {
        const { favoriteIds } = get();
        if (favoriteIds.includes(productId)) {
          set({ favoriteIds: favoriteIds.filter((id) => id !== productId) });
        } else {
          set({ favoriteIds: [...favoriteIds, productId] });
        }
      },

      isFavorite: (productId: string) => {
        return get().favoriteIds.includes(productId);
      },
    }),
    {
      name: 'retequenos_favorites',
    }
  )
);
