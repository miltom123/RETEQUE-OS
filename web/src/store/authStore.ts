import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile } from '../types/auth';
import { authService } from '../services/auth.service';

interface AuthStore {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;

  loginWithEmail: (email: string, pass: string) => Promise<boolean>;
  registerWithEmail: (email: string, pass: string, name: string, phone: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  continueAsGuest: () => void;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: authService.getCurrentUser(),
      isAuthenticated: !!authService.getCurrentUser(),
      isGuest: false,
      isLoading: false,
      error: null,

      clearError: () => set({ error: null }),

      continueAsGuest: () => {
        set({ isGuest: true, isAuthenticated: false, user: null, error: null });
      },

      loginWithEmail: async (email, pass) => {
        set({ isLoading: true, error: null });
        try {
          const user = await authService.loginWithEmail(email, pass);
          set({ user, isAuthenticated: true, isGuest: false, isLoading: false });
          return true;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
          set({ error: msg, isLoading: false });
          return false;
        }
      },

      registerWithEmail: async (email, pass, name, phone) => {
        set({ isLoading: true, error: null });
        try {
          const user = await authService.registerWithEmail(email, pass, name, phone);
          set({ user, isAuthenticated: true, isGuest: false, isLoading: false });
          return true;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error al registrar cuenta';
          set({ error: msg, isLoading: false });
          return false;
        }
      },

      loginWithGoogle: async () => {
        set({ isLoading: true, error: null });
        try {
          const user = await authService.loginWithGoogle();
          set({ user, isAuthenticated: true, isGuest: false, isLoading: false });
          return true;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error con Google Auth';
          set({ error: msg, isLoading: false });
          return false;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        await authService.logout();
        set({ user: null, isAuthenticated: false, isGuest: false, isLoading: false, error: null });
      },

      updateProfile: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await authService.updateProfile(data);
          set({ user: updated, isLoading: false });
          return true;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error al actualizar perfil';
          set({ error: msg, isLoading: false });
          return false;
        }
      },

      resetPassword: async (email) => {
        set({ isLoading: true, error: null });
        try {
          await authService.resetPassword(email);
          set({ isLoading: false });
          return true;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Error al enviar recuperación';
          set({ error: msg, isLoading: false });
          return false;
        }
      },
    }),
    {
      name: 'retequenos-auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest,
      }),
    }
  )
);
