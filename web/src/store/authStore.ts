import { create } from 'zustand';
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
  continueAsGuest: () => void;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  /** Revisa con el servidor que la sesión siga vigente y trae el perfil actualizado. */
  refresh: () => Promise<void>;
  clearError: () => void;
}

const message = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

// La sesión vive en auth.service (token del servidor); el store solo la refleja en la interfaz
export const useAuthStore = create<AuthStore>()((set) => {
  const run = async (fn: () => Promise<UserProfile>, fallback: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await fn();
      set({ user, isAuthenticated: true, isGuest: false, isLoading: false });
      return true;
    } catch (err) {
      set({ error: message(err, fallback), isLoading: false });
      return false;
    }
  };

  authService.onAuthStateChanged((user) => set({ user, isAuthenticated: !!user }));

  return {
    user: authService.getCurrentUser(),
    isAuthenticated: !!authService.getCurrentUser(),
    isGuest: false,
    isLoading: false,
    error: null,

    clearError: () => set({ error: null }),
    continueAsGuest: () => set({ isGuest: true, error: null }),

    loginWithEmail: (email, pass) => run(() => authService.loginWithEmail(email, pass), 'Error al iniciar sesión'),
    registerWithEmail: (email, pass, name, phone) =>
      run(() => authService.registerWithEmail(email, pass, name, phone), 'Error al registrar cuenta'),
    updateProfile: (data) => run(() => authService.updateProfile(data), 'Error al actualizar perfil'),

    logout: async () => {
      await authService.logout();
      set({ user: null, isAuthenticated: false, isGuest: false, error: null });
    },

    refresh: async () => {
      await authService.refresh();
    },

    resetPassword: async (email) => {
      set({ isLoading: true, error: null });
      try {
        await authService.resetPassword(email);
        set({ isLoading: false });
        return true;
      } catch (err) {
        set({ error: message(err, 'Error al enviar recuperación'), isLoading: false });
        return false;
      }
    },
  };
});
